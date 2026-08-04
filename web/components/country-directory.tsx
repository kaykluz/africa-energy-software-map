import Link from "next/link";
import { OrganisationMark, ProductMark } from "@/components/brand-mark";
import { EvidenceStatusLabel, LifecycleTag } from "@/components/semantic-tags";
import {
  africanCountries,
  categories,
  deployments,
  evidenceLabels,
  organisationPresenceLabels,
  originLabels,
  productById,
  products,
  release,
  sources,
  stages,
} from "@/lib/registry-data";
import {
  organisationEcosystemGroups,
  organisationRoleName,
  organisationRoles,
  organisationSegmentName,
  organisationSegments,
  organisationSectors,
  type OrganisationDirectoryRecord,
} from "@/lib/organisation-data";
import {
  filterOrganisationCatalogueRecords,
  organisationHasAfricaWideCoverage,
  type OrganisationCatalogueRecord,
} from "@/lib/organisation-catalogue";
import {
  buildSoftwareMapIndex,
  catalogueSoftwareLocations,
  isSoftwareMapLayer,
  softwareEntitiesForCountry,
  softwareLocationTypeLabel,
  softwareMapLayers,
  type SoftwareLocationType,
} from "@/lib/geographic-data";
import { isAfricaWideCoverageLabel } from "@/lib/geography-scope";
import { organisationLinkIndex, resolveOrganisationHref } from "@/lib/entity-links";
import { filterProducts, normaliseQuery } from "@/lib/registry-query";

type CountryDirectoryProps = {
  catalogueRecords: OrganisationCatalogueRecord[];
  directory: OrganisationDirectoryRecord[];
  filters?: Record<string, string | undefined>;
  iso2: string;
};

type CountryOrganisationRow = {
  key: string;
  name: string;
  href: string;
  roles: string[];
  segments: string[];
  locationLabels: string[];
  reviewLabel: string;
};

const organisationPresenceLayers = [
  ["all_presence", "All recorded presence"],
  ["catalogue", "Documented country activity"],
  ["africa_wide", "Africa-wide coverage"],
  ["evidenced", "Evidenced activity"],
  ["company_stated", "Company-stated activity"],
  ["software_linked", "Software deployed"],
  ["offices", "Offices, warehouses and entities"],
  ["availability", "Product availability"],
  ["headquarters", "Headquarters"],
  ["origin", "Country of origin"],
] as const;

export function CountryDirectory({
  catalogueRecords,
  directory,
  filters = {},
  iso2,
}: CountryDirectoryProps) {
  const countryIso2 = iso2.toUpperCase();
  const countryName = africanCountries.find(([value]) => value === countryIso2)?.[1] ?? countryIso2;
  const requestedView = filters.view ?? "overview";
  const activeView = ["overview", "organisations", "software", "deployments"].includes(requestedView)
    ? requestedView
    : "overview";
  const query = filters.q ?? "";
  const allOrganisationRows = buildCountryOrganisationRows({
    catalogueRecords,
    countryIso2,
    countryName,
    directory,
    filters: {},
  });
  const organisationRows = buildCountryOrganisationRows({
    catalogueRecords,
    countryIso2,
    countryName,
    directory,
    filters,
  });
  const requestedSoftwareLayer = filters.softwareLocation ?? "all_locations";
  const softwareLayer = isSoftwareMapLayer(requestedSoftwareLayer)
    ? requestedSoftwareLayer
    : "all_locations";
  const softwareProducts = filterProducts(products, {
    query,
    category: filters.category ?? "all",
    evidence: filters.evidence ?? "all",
    country: "all",
    stage: filters.stage ?? "all",
    origin: filters.softwareOrigin ?? "all",
    lifecycle: filters.lifecycle ?? "all",
    access: filters.access ?? "all",
  });
  const softwareProductIds = new Set(softwareProducts.map((product) => product.id));
  const comparableSoftwareFilters = [
    filters.evidence,
    filters.softwareOrigin,
    filters.lifecycle,
    filters.access,
  ].some((value) => value && value !== "all");
  const filteredCatalogueSoftware = catalogueSoftwareLocations.filter((record) => {
    if (!record.countryIso2s.includes(countryIso2)) return false;
    if (record.canonicalProduct) return softwareProductIds.has(record.canonicalProduct.id);
    if (comparableSoftwareFilters) return false;
    const searchable = normaliseQuery([
      record.item.name,
      record.item.parent,
      record.item.summaryAsSubmitted,
    ].filter(Boolean).join(" "));
    const needle = normaliseQuery(query);
    return (
      (!needle || searchable.includes(needle)) &&
      (!filters.category || filters.category === "all" || record.item.categoryIds.includes(filters.category)) &&
      (!filters.stage || filters.stage === "all" || record.item.stageIds.includes(filters.stage))
    );
  });
  const softwareIndex = buildSoftwareMapIndex(
    softwareProducts,
    deployments.filter((deployment) => softwareProductIds.has(deployment.productId)),
    filteredCatalogueSoftware,
  );
  const countrySoftware = softwareEntitiesForCountry(softwareIndex, countryIso2, softwareLayer);
  const allSoftwareIndex = buildSoftwareMapIndex(products, deployments, catalogueSoftwareLocations);
  const allCountrySoftware = softwareEntitiesForCountry(allSoftwareIndex, countryIso2, "all_locations");
  const allCountryDeployments = deployments.filter((deployment) => deployment.countryIso2 === countryIso2);
  const countryDeployments = allCountryDeployments.filter((deployment) => {
    const product = productById(deployment.productId);
    const needle = normaliseQuery(query);
    if (needle && !normaliseQuery([
      product?.name,
      product?.organisation,
      deployment.customer,
    ].filter(Boolean).join(" ")).includes(needle)) return false;
    return !filters.evidence || filters.evidence === "all" || deployment.evidence === filters.evidence;
  });

  if (!allOrganisationRows.length && !allCountrySoftware.length && !allCountryDeployments.length) {
    return (
      <main className="country-directory-page" id="main-content" tabIndex={-1}>
        <nav aria-label="Breadcrumb" className="breadcrumb"><Link href="/deployments">Map</Link><span>/</span><span>{countryName}</span></nav>
        <header className="country-directory-header"><div><h1>{countryName}</h1><p>No located records are published for this country yet.</p></div></header>
        <div className="inline-empty"><p>This is an unknown research state, not evidence of no activity.</p><Link href="/contribute">Add a record →</Link></div>
      </main>
    );
  }

  const countrySourceIds = new Set(allCountryDeployments.map((deployment) => deployment.sourceId));
  const countrySources = sources.filter((source) => countrySourceIds.has(source.id));
  const roleCounts = countLabels(allOrganisationRows.flatMap((row) => row.roles));
  const segmentCounts = countLabels(allOrganisationRows.flatMap((row) => row.segments));
  const softwareCategoryCounts = countLabels(allCountrySoftware.flatMap((entity) => {
    if (entity.product) return [entity.product.category];
    return entity.catalogueItem?.categoryIds.map((categoryId) =>
      categories.find((category) => category.id === categoryId)?.name ?? categoryId,
    ) ?? [];
  }));
  const headquartersOptions = Array.from(new Set([
    ...directory.map((record) => record.organisation.headquarters),
    ...catalogueRecords.map((record) => record.headquartersCountry),
  ].filter(Boolean))).sort();

  return (
    <main className="country-directory-page" id="main-content" tabIndex={-1}>
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/deployments">Map</Link><span aria-hidden="true">/</span><span>{countryName}</span>
      </nav>
      <header className="country-directory-header">
        <div><h1>{countryName}</h1><p>Software, organisations and recorded activity in one country view.</p></div>
        <div className="country-stat-row">
          <Stat value={String(allOrganisationRows.length)} label="Organisations" />
          <Stat value={String(allCountrySoftware.length)} label="Software" />
          <Stat value={String(allCountryDeployments.length)} label="Reviewed deployments" />
        </div>
      </header>

      <nav aria-label={`${countryName} directory sections`} className="country-directory-tabs">
        {[
          ["overview", "Overview"],
          ["organisations", `Organisations · ${allOrganisationRows.length}`],
          ["software", `Software · ${allCountrySoftware.length}`],
          ["deployments", `Deployments · ${allCountryDeployments.length}`],
        ].map(([value, label]) => (
          <Link aria-current={activeView === value ? "page" : undefined} href={countryViewHref(countryIso2, value)} key={value}>{label}</Link>
        ))}
      </nav>

      {activeView === "overview" ? (
        <div className="country-overview-grid">
          <article className="country-overview-main">
            <CountryFacetSection countryIso2={countryIso2} filter="role" heading="Organisations by role" rows={roleCounts} taxonomy={organisationRoles} />
            <CountryFacetSection countryIso2={countryIso2} filter="segment" heading="Organisations by market" rows={segmentCounts} taxonomy={organisationSegments} />
            <section className="country-distribution-section">
              <header><h2>Software by category</h2><Link href={countryViewHref(countryIso2, "software")}>View all</Link></header>
              <div className="country-facet-grid">
                {softwareCategoryCounts.map(([label, count]) => (
                  <Link href={countrySoftwareCategoryHref(countryIso2, label)} key={label}><span>{label}</span><strong>{count}</strong></Link>
                ))}
              </div>
            </section>
          </article>
          <aside className="country-overview-rail">
            <div><h2>Open this country in</h2><Link href={`/deployments?country=${countryIso2}&focus=${countryIso2}`}>Map</Link><Link href={`/organisations?country=${countryIso2}`}>Organisation directory</Link><Link href={`/directory?country=${countryIso2}`}>Reviewed software data</Link></div>
            <div><h2>Coverage</h2><p>{countrySources.length} reviewed sources support deployment records. Other location types retain their own source and review status.</p><strong>Last country review</strong><span>{release.date}</span></div>
            <Link className="button button-primary" href="/contribute">Add or correct data</Link>
          </aside>
        </div>
      ) : null}

      {activeView === "organisations" ? (
        <section className="country-directory-section">
          <CountryOrganisationFilters countryIso2={countryIso2} filters={filters} headquartersOptions={headquartersOptions} />
          <ResultHeading count={organisationRows.length} label="organisations" mapHref={`/deployments?object=organisations&country=${countryIso2}&focus=${countryIso2}${organisationMapFilterSuffix(filters)}`} />
          <div className="country-entity-list">
            {organisationRows.map((row) => (
              <article key={row.key}>
                <OrganisationMark name={row.name} organisationId={row.key} size={44} />
                <div><h3><Link href={row.href}>{row.name}</Link></h3><p>{row.roles.join(" · ") || "Role not yet classified"}</p>{row.segments.length ? <small>{row.segments.join(" · ")}</small> : null}</div>
                <div className="country-entity-meta">{row.locationLabels.map((label) => <span key={label}>{label}</span>)}<i>{row.reviewLabel}</i></div>
              </article>
            ))}
          </div>
          {!organisationRows.length ? <CountryEmpty type="organisations" /> : null}
        </section>
      ) : null}

      {activeView === "software" ? (
        <section className="country-directory-section">
          <CountrySoftwareFilters countryIso2={countryIso2} filters={filters} />
          <ResultHeading count={countrySoftware.length} label="software records" mapHref={`/deployments?object=software&country=${countryIso2}&focus=${countryIso2}&softwareLocation=${softwareLayer}`} />
          <div className="country-entity-list">
            {countrySoftware.map((entity) => {
              const locationTypes = entity.locationTypesByCountry.get(countryIso2) ?? new Set<SoftwareLocationType>();
              const categoriesForEntity = entity.product
                ? [entity.product.category]
                : entity.catalogueItem?.categoryIds.map((id) => categories.find((item) => item.id === id)?.name ?? id) ?? [];
              return (
                <article key={entity.key}>
                  {entity.product ? <ProductMark organisationId={entity.product.organisationId} organisationName={entity.product.organisation} productId={entity.product.id} productName={entity.product.name} size={44} /> : <OrganisationMark name={entity.organisation} organisationId={entity.key} size={44} />}
                  <div><h3><Link href={entity.href}>{entity.name}</Link></h3><p>{entity.organisation}</p>{categoriesForEntity.length ? <small>{categoriesForEntity.join(" · ")}</small> : null}</div>
                  <div className="country-entity-meta">{Array.from(locationTypes).map((type) => <span key={type}>{softwareLocationTypeLabel(type)}</span>)}</div>
                </article>
              );
            })}
          </div>
          {!countrySoftware.length ? <CountryEmpty type="software records" /> : null}
        </section>
      ) : null}

      {activeView === "deployments" ? (
        <section className="country-directory-section">
          <CountryDeploymentFilters countryIso2={countryIso2} filters={filters} />
          <ResultHeading count={countryDeployments.length} label="reviewed deployments" mapHref={`/deployments?object=software&country=${countryIso2}&focus=${countryIso2}&softwareLocation=reviewed_deployment`} />
          <div className="profile-deployment-list country-deployment-directory">
            {countryDeployments.map((deployment) => {
              const product = productById(deployment.productId);
              const customerHref = resolveOrganisationHref(deployment.customer, organisationLinkIndex(directory));
              return (
                <article key={deployment.id}>
                  <header><div className="profile-deployment-product">{product ? <ProductMark organisationId={product.organisationId} organisationName={product.organisation} productId={product.id} productName={product.name} size={36} /> : null}<div>{product ? <h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3> : null}<small>{deployment.area}</small></div></div><LifecycleTag value={deployment.lifecycle} /></header>
                  <dl><Fact label="Customer" value={customerHref ? <Link href={customerHref}>{deployment.customer}</Link> : deployment.customer} /><Fact label="Year" value={deployment.year} /><div><dt>Evidence</dt><dd><EvidenceStatusLabel status={deployment.evidence} /></dd></div></dl>
                </article>
              );
            })}
          </div>
          {!countryDeployments.length ? <CountryEmpty type="reviewed deployments" /> : null}
          {countrySources.length ? <section className="country-source-list"><h2>Sources</h2>{countrySources.map((source) => <a href={source.url} key={source.id} rel="noreferrer" target="_blank"><span>{source.title}</span><small>{source.publisher}</small></a>)}</section> : null}
        </section>
      ) : null}
    </main>
  );
}

function buildCountryOrganisationRows({
  catalogueRecords,
  countryIso2,
  countryName,
  directory,
  filters,
}: {
  catalogueRecords: OrganisationCatalogueRecord[];
  countryIso2: string;
  countryName: string;
  directory: OrganisationDirectoryRecord[];
  filters: Record<string, string | undefined>;
}) {
  const query = filters.q ?? "";
  const group = filters.group ?? "all";
  const role = filters.role ?? "all";
  const sector = filters.sector ?? "all";
  const segment = filters.segment ?? "all";
  const origin = filters.orgOrigin ?? "all";
  const headquarters = filters.headquarters ?? "all";
  const scope = filters.scope ?? "all";
  const presence = organisationPresenceLayers.some(([value]) => value === filters.presence)
    ? filters.presence ?? "all_presence"
    : "all_presence";
  const needle = normaliseQuery(query);
  const canonicalRows: CountryOrganisationRow[] = directory
    .filter((record) => organisationCountryMatches(record, countryIso2, presence))
    .filter((record) => !needle || normaliseQuery([
      record.organisation.name,
      record.organisation.description,
      ...record.aliases,
      ...record.roleIds.map(organisationRoleName),
      ...record.segmentIds.map(organisationSegmentName),
    ].join(" ")).includes(needle))
    .filter((record) => group === "all" || record.ecosystemGroupIds.includes(group))
    .filter((record) => role === "all" || record.roleIds.includes(role) || record.roleIds.some((id) => organisationRoleName(id) === role))
    .filter((record) => sector === "all" || record.sectorIds.includes(sector))
    .filter((record) => segment === "all" || record.segmentIds.includes(segment) || record.segmentIds.some((id) => organisationSegmentName(id) === segment))
    .filter((record) => origin === "all" || record.organisation.origin === origin)
    .filter((record) => headquarters === "all" || record.organisation.headquarters === headquarters)
    .filter(() => scope !== "pending")
    .filter((record) => scope !== "africa_hq" || record.organisation.origin === "Africa-headquartered")
    .filter((record) => scope !== "international" || record.organisation.origin === "International, active in Africa")
    .map((record) => ({
      key: record.organisation.id,
      name: record.organisation.name,
      href: `/organisations/${record.organisation.slug}`,
      roles: record.roleIds.map(organisationRoleName),
      segments: record.segmentIds.map(organisationSegmentName),
      locationLabels: canonicalLocationLabels(record, countryIso2),
      reviewLabel: "Reviewed profile",
    }));
  const filteredCatalogue = filterOrganisationCatalogueRecords({
    group,
    headquarters,
    origin,
    query,
    role,
    scope,
    sector,
    segment,
  }, catalogueRecords).filter((record) => catalogueCountryMatches(record, countryName, presence));
  const canonicalHrefs = new Set(canonicalRows.map((row) => row.href));
  const catalogueRows: CountryOrganisationRow[] = filteredCatalogue
    .filter((record) => record.reconciliation.status !== "reviewed_match" || !canonicalHrefs.has(record.reconciliation.canonicalHref))
    .map((record) => ({
      key: `catalogue:${record.id}`,
      name: record.name,
      href: record.reconciliation.status === "reviewed_match"
        ? record.reconciliation.canonicalHref
        : `/organisations?q=${encodeURIComponent(record.name)}`,
      roles: record.roles.map(catalogueRoleDisplayName),
      segments: record.segments.map(catalogueSegmentDisplayName),
      locationLabels: catalogueLocationLabels(record, countryName),
      reviewLabel: record.reviewState === "reviewed" ? "Reviewed match" : "Review pending",
    }));
  return [...canonicalRows, ...catalogueRows].sort((left, right) => left.name.localeCompare(right.name));
}

function organisationCountryMatches(record: OrganisationDirectoryRecord, iso2: string, presence: string) {
  if (presence === "catalogue") return record.catalogueCountryIso2s.includes(iso2);
  if (presence === "africa_wide") {
    return directoryRecordHasAfricaWideCoverage(record) && record.countryIso2s.includes(iso2);
  }
  if (presence === "evidenced") return record.evidencedCountryIso2s.includes(iso2);
  if (presence === "company_stated") return record.companyStatedCountryIso2s.includes(iso2);
  if (presence === "software_linked") return record.softwareLinkedCountryIso2s.includes(iso2);
  if (presence === "offices") {
    return record.officeCountryIso2s.includes(iso2) || record.warehouseCountryIso2s.includes(iso2);
  }
  if (presence === "availability") return record.availabilityCountryIso2s.includes(iso2);
  if (presence === "headquarters") return record.organisation.headquartersCountryIso2 === iso2;
  if (presence === "origin") return record.organisation.countryOfOriginIso2 === iso2;
  return record.countryIso2s.includes(iso2);
}

function catalogueCountryMatches(record: OrganisationCatalogueRecord, country: string, presence: string) {
  if (!["all_presence", "catalogue", "africa_wide", "headquarters"].includes(presence)) return false;
  if (presence === "headquarters") return record.headquartersCountry === country;
  if (presence === "africa_wide") {
    return organisationHasAfricaWideCoverage(record) && (
      record.countriesActive.includes(country) || record.headquartersCountry === country
    );
  }
  if (presence === "catalogue") return record.countriesActive.includes(country);
  return record.countriesActive.includes(country) || record.headquartersCountry === country;
}

function canonicalLocationLabels(record: OrganisationDirectoryRecord, iso2: string) {
  const labels = record.presenceRecords
    .filter((presence) => presence.countryIso2 === iso2)
    .map((presence) => organisationPresenceLabels[presence.presenceType]);
  if (record.catalogueCountryIso2s.includes(iso2)) labels.push("Documented country activity");
  if (directoryRecordHasAfricaWideCoverage(record) && record.countryIso2s.includes(iso2)) {
    labels.push("Africa-wide coverage");
  }
  if (record.softwareLinkedCountryIso2s.includes(iso2)) labels.push("Software deployed");
  if (record.organisation.headquartersCountryIso2 === iso2) labels.push("Headquarters");
  if (record.organisation.countryOfOriginIso2 === iso2) labels.push("Country of origin");
  return Array.from(new Set(labels));
}

function catalogueLocationLabels(record: OrganisationCatalogueRecord, country: string) {
  const labels: string[] = [];
  if (record.countriesActive.includes(country)) labels.push("Documented country activity");
  if (
    organisationHasAfricaWideCoverage(record) &&
    (record.countriesActive.includes(country) || record.headquartersCountry === country)
  ) labels.push("Africa-wide coverage");
  if (record.headquartersCountry === country) labels.push("Headquarters");
  return labels;
}

function directoryRecordHasAfricaWideCoverage(record: OrganisationDirectoryRecord) {
  return record.catalogueListings.some((listing) =>
    listing.africanRegionsActive.some(isAfricaWideCoverageLabel),
  );
}

function catalogueRoleDisplayName(value: string) {
  const labels: Record<string, string> = {
    Developer: "Developer or IPP",
    OEM: "OEM or manufacturer",
    "Software/Data": "Software or data provider",
    "Public Institution": "Public institution",
  };
  return labels[value] ?? value;
}

function catalogueSegmentDisplayName(value: string) {
  const labels: Record<string, string> = {
    "Utility-scale": "Utility-scale generation",
    "T&D": "Transmission and distribution",
    "SHS/PAYGo": "Off-grid solar, SHS and PAYGo",
    "C&I": "C&I and distributed energy",
    "E-mobility": "E-mobility, charging and swapping",
    Storage: "Energy storage",
    "Clean Cooking": "Clean cooking",
    Efficiency: "Energy efficiency and demand services",
    "Productive Use": "Productive use of energy",
    "Carbon Markets": "Carbon and environmental markets",
  };
  return labels[value] ?? value;
}

function CountryOrganisationFilters({ countryIso2, filters, headquartersOptions }: { countryIso2: string; filters: Record<string, string | undefined>; headquartersOptions: string[] }) {
  return (
    <form action={`/countries/${countryIso2.toLowerCase()}`} className="country-filter-bar" method="get">
      <input name="view" type="hidden" value="organisations" />
      <label className="country-search"><span className="sr-only">Search organisations</span><input defaultValue={filters.q} name="q" placeholder="Search organisations" type="search" /></label>
      <FilterSelect defaultValue={filters.presence} label="Presence" name="presence" options={organisationPresenceLayers.map(([value, label]) => [value, label])} />
      <FilterSelect defaultValue={filters.role} label="Role" name="role" options={organisationRoles.map((item) => [item.id, item.name])} />
      <FilterSelect defaultValue={filters.segment} label="Market" name="segment" options={organisationSegments.map((item) => [item.id, item.name])} />
      <details><summary>More filters</summary><div>
        <FilterSelect defaultValue={filters.group} label="Actor group" name="group" options={organisationEcosystemGroups.map((item) => [item.id, item.name])} />
        <FilterSelect defaultValue={filters.sector} label="Sector" name="sector" options={organisationSectors.map((item) => [item.id, item.name])} />
        <FilterSelect defaultValue={filters.orgOrigin} label="Origin" name="orgOrigin" options={[["Africa-headquartered", "Africa-headquartered"], ["International, active in Africa", "International, active in Africa"]]} />
        <FilterSelect defaultValue={filters.headquarters} label="Headquarters" name="headquarters" options={headquartersOptions.map((value) => [value, value])} />
        <FilterSelect defaultValue={filters.scope} label="Review status" name="scope" options={[["reviewed", "Reviewed profiles"], ["pending", "Review pending"], ["africa_hq", "Africa-headquartered"], ["international", "International, active in Africa"]]} />
      </div></details>
      <button type="submit">Apply</button><Link href={countryViewHref(countryIso2, "organisations")}>Clear</Link>
    </form>
  );
}

function CountrySoftwareFilters({ countryIso2, filters }: { countryIso2: string; filters: Record<string, string | undefined> }) {
  const lifecycleOptions = Array.from(new Set(products.map((product) => product.lifecycle))).sort();
  const accessOptions = Array.from(new Set(products.map((product) => product.accessModel))).sort();
  return (
    <form action={`/countries/${countryIso2.toLowerCase()}`} className="country-filter-bar" method="get">
      <input name="view" type="hidden" value="software" />
      <label className="country-search"><span className="sr-only">Search software</span><input defaultValue={filters.q} name="q" placeholder="Search software" type="search" /></label>
      <FilterSelect defaultValue={filters.softwareLocation} label="Location" name="softwareLocation" options={softwareMapLayers} />
      <FilterSelect defaultValue={filters.stage} label="Stage" name="stage" options={stages.map((item) => [item.id, item.name])} />
      <FilterSelect defaultValue={filters.category} label="Category" name="category" options={categories.map((item) => [item.id, item.name])} />
      <details><summary>More filters</summary><div>
        <FilterSelect defaultValue={filters.evidence} label="Evidence" name="evidence" options={Object.entries(evidenceLabels)} />
        <FilterSelect defaultValue={filters.softwareOrigin} label="Origin" name="softwareOrigin" options={Object.entries(originLabels)} />
        <FilterSelect defaultValue={filters.lifecycle} label="Lifecycle" name="lifecycle" options={lifecycleOptions.map((value) => [value, value.replaceAll("_", " ")])} />
        <FilterSelect defaultValue={filters.access} label="Access" name="access" options={accessOptions.map((value) => [value, value])} />
      </div></details>
      <button type="submit">Apply</button><Link href={countryViewHref(countryIso2, "software")}>Clear</Link>
    </form>
  );
}

function CountryDeploymentFilters({ countryIso2, filters }: { countryIso2: string; filters: Record<string, string | undefined> }) {
  return (
    <form action={`/countries/${countryIso2.toLowerCase()}`} className="country-filter-bar" method="get">
      <input name="view" type="hidden" value="deployments" />
      <label className="country-search"><span className="sr-only">Search deployments</span><input defaultValue={filters.q} name="q" placeholder="Search product, organisation or customer" type="search" /></label>
      <FilterSelect defaultValue={filters.evidence} label="Evidence" name="evidence" options={Object.entries(evidenceLabels)} />
      <button type="submit">Apply</button><Link href={countryViewHref(countryIso2, "deployments")}>Clear</Link>
    </form>
  );
}

function FilterSelect({ defaultValue, label, name, options }: { defaultValue?: string; label: string; name: string; options: Array<readonly [string, string]> }) {
  return <label><span>{label}</span><select defaultValue={defaultValue ?? "all"} name={name}><option value="all">All</option>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;
}

function CountryFacetSection({ countryIso2, filter, heading, rows, taxonomy }: { countryIso2: string; filter: "role" | "segment"; heading: string; rows: Array<[string, number]>; taxonomy: Array<{ id: string; name: string }> }) {
  return <section className="country-distribution-section"><header><h2>{heading}</h2><Link href={countryViewHref(countryIso2, "organisations")}>View all</Link></header><div className="country-facet-grid">{rows.map(([label, count]) => <Link href={countryOrganisationFilterHref(countryIso2, filter, taxonomy.find((item) => item.name === label)?.id ?? label)} key={label}><span>{label}</span><strong>{count}</strong></Link>)}</div></section>;
}

function ResultHeading({ count, label, mapHref }: { count: number; label: string; mapHref: string }) {
  return <div className="country-directory-result-heading"><h2>{count} {label}</h2><Link href={mapHref}>View on map</Link></div>;
}

function CountryEmpty({ type }: { type: string }) {
  return <div className="inline-empty"><strong>No matching {type}.</strong><p>Clear filters or contribute a sourced record.</p><Link href="/contribute">Add data →</Link></div>;
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><strong>{value}</strong><span>{label}</span></div>;
}

function countLabels(labels: string[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const label of labels.filter(Boolean)) counts.set(label, (counts.get(label) ?? 0) + 1);
  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

function countryViewHref(iso2: string, view: string) {
  return `/countries/${iso2.toLowerCase()}${view === "overview" ? "" : `?view=${view}`}`;
}

function countryOrganisationFilterHref(iso2: string, filter: string, value: string) {
  const params = new URLSearchParams({ view: "organisations", [filter]: value });
  return `/countries/${iso2.toLowerCase()}?${params.toString()}`;
}

function countrySoftwareCategoryHref(iso2: string, categoryName: string) {
  const category = categories.find((item) => item.name === categoryName);
  const params = new URLSearchParams({ view: "software" });
  if (category) params.set("category", category.id);
  else params.set("q", categoryName);
  return `/countries/${iso2.toLowerCase()}?${params.toString()}`;
}

function organisationMapFilterSuffix(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, mapKey] of [["presence", "presence"], ["role", "role"], ["sector", "sector"], ["segment", "segment"], ["group", "group"], ["orgOrigin", "orgOrigin"]] as const) {
    const value = filters[key];
    if (value && value !== "all") params.set(mapKey, value);
  }
  const search = params.toString();
  return search ? `&${search}` : "";
}
