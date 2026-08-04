"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { OrganisationMark } from "@/components/brand-mark";
import { DatabaseHeader } from "@/components/database-header";
import {
  organisationEcosystemGroupName,
  organisationEcosystemGroups,
  organisationRoles,
  organisationRoleName,
  organisationSegments,
  organisationSegmentName,
  organisationSectors,
  organisationSectorName,
  type OrganisationDirectoryRecord,
} from "@/lib/organisation-data";
import { africanCountries, products } from "@/lib/registry-data";
import { landscapeSoftwareItems } from "@/lib/landscape-data";
import { normaliseQuery } from "@/lib/registry-query";
import type {
  OrganisationCataloguePage,
  OrganisationCatalogueRecord,
} from "@/lib/organisation-catalogue";
import {
  organisationLinkIndex,
  resolveOrganisationHref,
  type ExactLinkIndex,
} from "@/lib/entity-links";

type OrganisationView = "catalogue" | "ecosystem" | "directory";
export type OrganisationPresenceLayer =
  | "all"
  | "evidenced"
  | "company_stated"
  | "offices"
  | "availability"
  | "software_linked";

type OrganisationAtlasProps = {
  canonicalDirectory: OrganisationDirectoryRecord[];
  initialCatalogue: OrganisationCataloguePage;
  initialCatalogueCountry?: string;
  initialCatalogueGroup?: string;
  initialCatalogueHeadquarters?: string;
  initialCatalogueRole?: string;
  initialCatalogueScope?: string;
  initialCatalogueSector?: string;
  initialCatalogueSegment?: string;
  initialQuery?: string;
  initialGroup?: string;
  initialRole?: string;
  initialSector?: string;
  initialSegment?: string;
  initialCountry?: string;
  initialOrigin?: string;
  initialPresence?: string;
  initialView?: string;
};

export function OrganisationAtlas({
  canonicalDirectory,
  initialCatalogue,
  initialCatalogueCountry = "all",
  initialCatalogueGroup = "all",
  initialCatalogueHeadquarters = "all",
  initialCatalogueRole = "all",
  initialCatalogueScope = "all",
  initialCatalogueSector = "all",
  initialCatalogueSegment = "all",
  initialQuery = "",
  initialGroup = "all",
  initialRole = "all",
  initialSector = "all",
  initialSegment = "all",
  initialCountry = "all",
  initialOrigin = "all",
  initialPresence = "all",
}: OrganisationAtlasProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [group, setGroup] = useState(validId(initialGroup, organisationEcosystemGroups));
  const [role, setRole] = useState(validId(initialRole, organisationRoles));
  const [sector, setSector] = useState(validId(initialSector, organisationSectors));
  const [segment, setSegment] = useState(validId(initialSegment, organisationSegments));
  const [country, setCountry] = useState(
    africanCountries.some(([iso2]) => iso2 === initialCountry) ? initialCountry : "all",
  );
  const canonicalOrganisations = useMemo(
    () => canonicalDirectory.map((record) => record.organisation),
    [canonicalDirectory],
  );
  const canonicalOrganisationLinks = useMemo(
    () => organisationLinkIndex(canonicalDirectory),
    [canonicalDirectory],
  );
  const origins = Array.from(new Set(canonicalOrganisations.map((item) => item.origin))).sort();
  const [origin, setOrigin] = useState(origins.includes(initialOrigin) ? initialOrigin : "all");
  const [presence, setPresence] = useState<OrganisationPresenceLayer>(
    isPresenceLayer(initialPresence) ? initialPresence : "all",
  );
  const view: OrganisationView = "catalogue";
  const [catalogueMapHref, setCatalogueMapHref] = useState(() =>
    organisationCatalogueMapHref({
      country: initialCatalogueCountry,
      group: initialCatalogueGroup,
      headquarters: initialCatalogueHeadquarters,
      query: initialQuery,
      role: initialCatalogueRole,
      scope: initialCatalogueScope,
      sector: initialCatalogueSector,
      segment: initialCatalogueSegment,
    }),
  );
  const [catalogueCardsHref, setCatalogueCardsHref] = useState(() =>
    organisationCatalogueCardsHref({
      country: initialCatalogueCountry,
      group: initialCatalogueGroup,
      headquarters: initialCatalogueHeadquarters,
      query: initialQuery,
      role: initialCatalogueRole,
      scope: initialCatalogueScope,
      sector: initialCatalogueSector,
      segment: initialCatalogueSegment,
    }),
  );

  const withoutGroup = useMemo(
    () => filterRecords(canonicalDirectory, { query, role, sector, segment, country, origin, presence }),
    [canonicalDirectory, country, origin, presence, query, role, sector, segment],
  );
  const rows = useMemo(
    () => group === "all"
      ? withoutGroup
      : withoutGroup.filter((record) => record.ecosystemGroupIds.includes(group)),
    [group, withoutGroup],
  );
  const groupCounts = new Map(
    organisationEcosystemGroups.map((item) => [
      item.id,
      withoutGroup.filter((record) => record.ecosystemGroupIds.includes(item.id)).length,
    ]),
  );
  const segmentCounts = new Map(
    organisationSegments.map((item) => [
      item.id,
      canonicalDirectory.filter((record) => record.segmentIds.includes(item.id)).length,
    ]),
  );

  function updateUrl(next: Partial<{
    q: string;
    group: string;
    role: string;
    sector: string;
    segment: string;
    country: string;
    origin: string;
    view: OrganisationView;
    presence: OrganisationPresenceLayer;
  }>) {
    const values = {
      q: next.q ?? query,
      group: next.group ?? group,
      role: next.role ?? role,
      sector: next.sector ?? sector,
      segment: next.segment ?? segment,
      country: next.country ?? country,
      origin: next.origin ?? origin,
      view: next.view ?? view,
      presence: next.presence ?? presence,
    };
    const params = new URLSearchParams();
    if (values.q.trim()) params.set("q", values.q.trim());
    if (values.group !== "all") params.set("group", values.group);
    if (values.role !== "all") params.set("role", values.role);
    if (values.sector !== "all") params.set("sector", values.sector);
    if (values.segment !== "all") params.set("segment", values.segment);
    if (values.country !== "all") params.set("country", values.country);
    if (values.origin !== "all") params.set("origin", values.origin);
    if (values.view !== "catalogue") params.set("view", values.view);
    if (values.presence !== "all") params.set("presence", values.presence);
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }

  function clearFilters() {
    setQuery("");
    setGroup("all");
    setRole("all");
    setSector("all");
    setSegment("all");
    setCountry("all");
    setOrigin("all");
    setPresence("all");
    router.replace(pathname, { scroll: false });
  }

  const activeFilters = [
    query.trim() ? { key: "q", label: `“${query.trim()}”` } : null,
    group !== "all" ? { key: "group", label: organisationEcosystemGroupName(group) } : null,
    role !== "all" ? { key: "role", label: organisationRoles.find((item) => item.id === role)?.name ?? role } : null,
    segment !== "all" ? { key: "segment", label: organisationSegmentName(segment) } : null,
    sector !== "all" ? { key: "sector", label: organisationSectorName(sector) } : null,
    country !== "all" ? { key: "country", label: africanCountries.find(([iso2]) => iso2 === country)?.[1] ?? country } : null,
    origin !== "all" ? { key: "origin", label: origin } : null,
    presence !== "all" ? { key: "presence", label: presenceLayerLabel(presence) } : null,
  ].filter(Boolean) as Array<{
    key: "q" | "group" | "role" | "segment" | "sector" | "country" | "origin" | "presence";
    label: string;
  }>;

  function removeFilter(key: (typeof activeFilters)[number]["key"]) {
    if (key === "q") { setQuery(""); updateUrl({ q: "" }); }
    if (key === "group") { setGroup("all"); updateUrl({ group: "all" }); }
    if (key === "role") { setRole("all"); updateUrl({ role: "all" }); }
    if (key === "segment") { setSegment("all"); updateUrl({ segment: "all" }); }
    if (key === "sector") { setSector("all"); updateUrl({ sector: "all" }); }
    if (key === "country") { setCountry("all"); updateUrl({ country: "all" }); }
    if (key === "origin") { setOrigin("all"); updateUrl({ origin: "all" }); }
    if (key === "presence") { setPresence("all"); updateUrl({ presence: "all" }); }
  }

  function downloadExport() {
    const records = rows.map((record) => ({
      organisation: record.organisation.name,
      actor_types: record.ecosystemGroupIds.map(organisationEcosystemGroupName),
      specific_roles: record.roleIds.map(organisationRoleName),
      energy_markets: record.segmentIds.map(organisationSegmentName),
      broad_sectors: record.sectorIds.map(organisationSectorName),
      evidenced_countries: countryNames(record.evidencedCountryIso2s),
      company_stated_countries: countryNames(record.companyStatedCountryIso2s),
      office_countries: countryNames(record.officeCountryIso2s),
      product_availability_countries: countryNames(record.availabilityCountryIso2s),
      software_linked_countries: countryNames(record.softwareLinkedCountryIso2s),
      origin: record.organisation.origin,
      country_of_origin: record.organisation.countryOfOrigin,
      headquarters: record.organisation.headquarters,
      linked_software: record.productCount,
      last_checked: record.organisation.lastChecked,
      website: record.organisation.website,
    }));
    const blob = new Blob([organisationCsv(records)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "africa-energy-organisations.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="organisation-atlas" id="main-content" tabIndex={-1}>
      <DatabaseHeader
        activeObject="organisations"
        activeView="cards"
        cardsHref={catalogueCardsHref}
        mapHref={catalogueMapHref}
        organisationCount={initialCatalogue.counts.total}
        softwareCount={landscapeSoftwareItems.length}
      />

      {view === "catalogue" ? (
        <PublicOrganisationCatalogue
          initial={initialCatalogue}
          initialCountry={initialCatalogueCountry}
          initialGroup={initialCatalogueGroup}
          initialHeadquarters={initialCatalogueHeadquarters}
          initialQuery={initialQuery}
          initialRole={initialCatalogueRole}
          initialScope={initialCatalogueScope}
          initialSector={initialCatalogueSector}
          initialSegment={initialCatalogueSegment}
          onCardsHrefChange={setCatalogueCardsHref}
          onMapHrefChange={setCatalogueMapHref}
          organisationLinks={canonicalOrganisationLinks}
          reviewedCount={canonicalDirectory.length}
        />
      ) : (
        <>
      <section className="organisation-atlas-stats" aria-label="Organisation totals">
        <div><strong>{canonicalDirectory.length}</strong><span>organisations</span></div>
        <div><strong>{organisationEcosystemGroups.length}</strong><span>actor types</span></div>
        <div><strong>{organisationSegments.length}</strong><span>energy markets</span></div>
      </section>

      <section className="organisation-atlas-controls" aria-label="Filter organisations">
        <label>
          <span className="sr-only">Search organisations</span>
          <i aria-hidden="true">⌕</i>
          <input
            onChange={(event) => { setQuery(event.target.value); updateUrl({ q: event.target.value }); }}
            placeholder="Search organisations"
            type="search"
            value={query}
          />
        </label>
        <select
          aria-label="Filter by actor type"
          onChange={(event) => { setGroup(event.target.value); updateUrl({ group: event.target.value }); }}
          value={group}
        >
          <option value="all">All actor types</option>
          {organisationEcosystemGroups.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <select
          aria-label="Filter by energy market"
          onChange={(event) => { setSegment(event.target.value); updateUrl({ segment: event.target.value }); }}
          value={segment}
        >
          <option value="all">All energy markets</option>
          {organisationSegments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}{segmentCounts.get(item.id) ? ` · ${segmentCounts.get(item.id)}` : ""}
            </option>
          ))}
        </select>
        <select
          aria-label="Choose organisation presence layer"
          onChange={(event) => {
            const next = event.target.value as OrganisationPresenceLayer;
            setPresence(next);
            updateUrl({ presence: next });
          }}
          value={presence}
        >
          <option value="all">All presence types</option>
          <option value="evidenced">Evidenced activity</option>
          <option value="company_stated">Company-stated</option>
          <option value="offices">Offices and entities</option>
          <option value="availability">Product availability</option>
          <option value="software_linked">Software deployments</option>
        </select>
        <select
          aria-label={`Filter by country in ${presenceLayerLabel(presence).toLowerCase()}`}
          onChange={(event) => { setCountry(event.target.value); updateUrl({ country: event.target.value }); }}
          value={country}
        >
          <option value="all">All countries</option>
          {africanCountries.map(([iso2, name]) => <option key={iso2} value={iso2}>{name}</option>)}
        </select>
        <details className="organisation-more-filters">
          <summary>More</summary>
          <div className="organisation-more-panel">
            <label>
              <span>Specific role</span>
              <select
                onChange={(event) => { setRole(event.target.value); updateUrl({ role: event.target.value }); }}
                value={role}
              >
                <option value="all">All specific roles</option>
                {organisationRoles.filter((item) => item.id !== "org_role_to_classify").map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Broad sector</span>
              <select
                onChange={(event) => { setSector(event.target.value); updateUrl({ sector: event.target.value }); }}
                value={sector}
              >
                <option value="all">All broad sectors</option>
                {organisationSectors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>
              <span>Origin</span>
              <select
                onChange={(event) => { setOrigin(event.target.value); updateUrl({ origin: event.target.value }); }}
                value={origin}
              >
                <option value="all">All origins</option>
                {origins.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>
        </details>
        <span aria-live="polite">{rows.length} shown</span>
        <button className="organisation-export" onClick={downloadExport} type="button">
          Export CSV <span aria-hidden="true">↓</span>
        </button>
      </section>

      {activeFilters.length ? (
        <div className="organisation-active-filters">
          <span>{activeFilters.length} active</span>
          {activeFilters.map((filter) => (
            <button key={filter.key} onClick={() => removeFilter(filter.key)} type="button">
              {filter.label}<i aria-hidden="true">×</i>
            </button>
          ))}
          {activeFilters.length > 1 ? <button className="clear" onClick={clearFilters} type="button">Clear all</button> : null}
        </div>
      ) : null}

      {view === "ecosystem" ? (
        <>
          <nav aria-label="Organisation actor types" className="organisation-group-route">
            {organisationEcosystemGroups.map((item) => (
              <button
                aria-pressed={group === item.id}
                key={item.id}
                onClick={() => {
                  const next = group === item.id ? "all" : item.id;
                  setGroup(next);
                  updateUrl({ group: next });
                }}
                type="button"
              >
                <strong>{item.name}</strong>
                <small>{groupCounts.get(item.id) ?? 0}</small>
              </button>
            ))}
          </nav>
          {rows.length ? (
            <div className="organisation-group-sections">
              {organisationEcosystemGroups
                .filter((item) => group === "all" ? groupCounts.get(item.id) : item.id === group)
                .map((item) => {
                  const groupRows = rows.filter((record) => record.ecosystemGroupIds.includes(item.id));
                  if (!groupRows.length) return null;
                  return (
                    <section className="organisation-group-section" key={item.id}>
                      <header>
                        <h2><Link href={`/organisations?group=${item.id}`}>{item.name}</Link></h2>
                        <p>{item.description}</p>
                        <strong>{groupRows.length}</strong>
                      </header>
                      <OrganisationCardGrid rows={groupRows} />
                    </section>
                  );
                })}
            </div>
          ) : <EmptyState />}
        </>
      ) : rows.length ? (
        <OrganisationDirectoryTable rows={rows} />
      ) : <EmptyState />}

      <footer className="organisation-coverage-note">
        <span>Reviewed registry</span>
        <p>{products.length} reviewed software records. Add missing developers, EPCs, OEMs, financiers and operators.</p>
        <Link href="/contribute/organisation">Add an organisation →</Link>
      </footer>
        </>
      )}
    </main>
  );
}

function PublicOrganisationCatalogue({
  initial,
  initialCountry,
  initialGroup,
  initialHeadquarters,
  initialQuery,
  initialRole,
  initialScope,
  initialSector,
  initialSegment,
  onCardsHrefChange,
  onMapHrefChange,
  organisationLinks,
  reviewedCount,
}: {
  initial: OrganisationCataloguePage;
  initialCountry: string;
  initialGroup: string;
  initialHeadquarters: string;
  initialQuery: string;
  initialRole: string;
  initialScope: string;
  initialSector: string;
  initialSegment: string;
  onCardsHrefChange: (href: string) => void;
  onMapHrefChange: (href: string) => void;
  organisationLinks: ExactLinkIndex;
  reviewedCount: number;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [group, setGroup] = useState(initialGroup);
  const [role, setRole] = useState(initialRole);
  const [sector, setSector] = useState(initialSector);
  const [segment, setSegment] = useState(initialSegment);
  const [country, setCountry] = useState(initialCountry);
  const [headquarters, setHeadquarters] = useState(initialHeadquarters);
  const [scope, setScope] = useState(initialScope);
  const [page, setPage] = useState(1);
  const [cataloguePage, setCataloguePage] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/organisation-catalogue?${catalogueParams({ query, group, role, sector, segment, country, headquarters, scope, page })}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("The organisation catalogue could not be loaded.");
          setCataloguePage((await response.json()) as OrganisationCataloguePage);
          setError("");
        })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted) {
            setError(reason instanceof Error ? reason.message : "The organisation catalogue could not be loaded.");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, query !== initialQuery ? 180 : 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [country, group, headquarters, initialQuery, page, query, role, scope, sector, segment]);

  useEffect(() => {
    const cardsHref = organisationCatalogueCardsHref({
      country,
      group,
      headquarters,
      query,
      role,
      scope,
      sector,
      segment,
    });
    onCardsHrefChange(cardsHref);
    window.history.replaceState(null, "", cardsHref);
  }, [country, group, headquarters, onCardsHrefChange, query, role, scope, sector, segment]);

  useEffect(() => {
    onMapHrefChange(organisationCatalogueMapHref({
      country,
      group,
      headquarters,
      query,
      role,
      scope,
      sector,
      segment,
    }));
  }, [country, group, headquarters, onMapHrefChange, query, role, scope, sector, segment]);

  function update(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  function downloadCatalogue() {
    window.location.href = `/api/organisation-catalogue?${catalogueParams({
      query, group, role, sector, segment, country, headquarters, scope, page: 1, format: "csv",
    })}`;
  }

  return (
    <section className="organisation-catalogue-public">
      <section className="organisation-atlas-stats organisation-catalogue-stats" aria-label="Organisation catalogue totals">
        <div><strong>{cataloguePage.counts.total.toLocaleString()}</strong><span>listings</span></div>
        <div><strong>{cataloguePage.counts.africaHeadquartered.toLocaleString()}</strong><span>Africa-headquartered</span></div>
        <div><strong>{reviewedCount}</strong><span>reviewed profiles</span></div>
      </section>

      <div className="organisation-catalogue-notice">
        <span>Inclusion catalogue · updated {formatCatalogueDate(cataloguePage.asOf)}</span>
        <p>Broad market coverage for discovery. A listing is not an endorsement; records marked “review pending” have not yet entered the reviewed release.</p>
        <Link href="/methodology#organisation-catalogue">How this layer works →</Link>
      </div>

      <section className="organisation-catalogue-controls" aria-label="Filter organisation catalogue">
        <label className="organisation-catalogue-search">
          <span className="sr-only">Search all organisation listings</span>
          <i aria-hidden="true">⌕</i>
          <input
            onChange={(event) => update(setQuery, event.target.value)}
            placeholder="Search organisations, roles, markets or countries"
            type="search"
            value={query}
          />
        </label>
        <select aria-label="Filter catalogue by role" onChange={(event) => update(setRole, event.target.value)} value={role}>
          <option value="all">All roles</option>
          {cataloguePage.options.roles.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select aria-label="Filter catalogue by energy market" onChange={(event) => update(setSegment, event.target.value)} value={segment}>
          <option value="all">All energy markets</option>
          {cataloguePage.options.segments.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select aria-label="Filter catalogue by country active" onChange={(event) => update(setCountry, event.target.value)} value={country}>
          <option value="all">All active countries</option>
          {cataloguePage.options.countries.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select aria-label="Filter catalogue by headquarters" onChange={(event) => update(setHeadquarters, event.target.value)} value={headquarters}>
          <option value="all">All headquarters</option>
          {cataloguePage.options.headquarters.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select aria-label="Filter catalogue by scope" onChange={(event) => update(setScope, event.target.value)} value={scope}>
          <option value="all">All listings</option>
          <option value="africa_wide">Africa-wide coverage</option>
          <option value="africa_hq">Africa-headquartered</option>
          <option value="international">International, active in Africa</option>
          <option value="reviewed">Reviewed profiles</option>
          <option value="pending">Review pending</option>
        </select>
        <details className="organisation-more-filters organisation-catalogue-more">
          <summary>More filters</summary>
          <div className="organisation-more-panel">
            <label>
              <span>Actor type</span>
              <select aria-label="Filter catalogue by actor type" onChange={(event) => update(setGroup, event.target.value)} value={group}>
                <option value="all">All actor types</option>
                {organisationEcosystemGroups.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}
              </select>
            </label>
            <label>
              <span>Sector</span>
              <select aria-label="Filter catalogue by sector" onChange={(event) => update(setSector, event.target.value)} value={sector}>
                <option value="all">All sectors</option>
                {organisationSectors.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}
              </select>
            </label>
          </div>
        </details>
        <span aria-live="polite">{loading ? "Loading…" : `${cataloguePage.total.toLocaleString()} shown`}</span>
        <button className="organisation-export" onClick={downloadCatalogue} type="button">Export CSV <span aria-hidden="true">↓</span></button>
      </section>

      {error ? <div className="review-global-error" role="alert">{error}</div> : null}
      {cataloguePage.records.length ? (
        <div className="organisation-catalogue-grid">
          {cataloguePage.records.map((record) => (
            <PublicOrganisationCard
              key={record.id}
              organisationLinks={organisationLinks}
              record={record}
            />
          ))}
        </div>
      ) : <EmptyState />}

      {cataloguePage.pageCount > 1 ? (
        <nav aria-label="Organisation catalogue pages" className="organisation-catalogue-pagination">
          <button disabled={cataloguePage.page === 1 || loading} onClick={() => setPage(cataloguePage.page - 1)} type="button">← Previous</button>
          <span>Page {cataloguePage.page} of {cataloguePage.pageCount}</span>
          <button disabled={cataloguePage.page === cataloguePage.pageCount || loading} onClick={() => setPage(cataloguePage.page + 1)} type="button">Next →</button>
        </nav>
      ) : null}
    </section>
  );
}

function PublicOrganisationCard({
  organisationLinks,
  record,
}: {
  organisationLinks: ExactLinkIndex;
  record: OrganisationCatalogueRecord;
}) {
  const canonicalHref = record.reconciliation.status === "reviewed_match"
    ? record.reconciliation.canonicalHref
    : "";
  const primaryHref = canonicalHref || record.website || record.sourceUrl;
  const parentHref = resolveOrganisationHref(record.parent, organisationLinks);
  return (
    <article>
      <header>
        <OrganisationMark
          name={record.name}
          organisationId={record.reconciliation.status === "reviewed_match" ? record.reconciliation.canonicalOrganisationId : record.id}
          size={46}
        />
        <div>
          <h2>
            {primaryHref ? (
              canonicalHref ? <Link href={canonicalHref}>{record.name}</Link> : <a href={primaryHref} rel="noreferrer" target="_blank">{record.name}</a>
            ) : record.name}
          </h2>
          <p>
            {record.primaryRole ? (
              <Link href={catalogueFilterHref({ role: record.primaryRole })}>{record.primaryRole}</Link>
            ) : record.organisationType || "Role not classified"}
            {record.parent ? <> · {parentHref ? <Link href={parentHref}>{record.parent}</Link> : record.parent}</> : null}
          </p>
        </div>
        <span data-status={record.reviewState}>{record.reviewState === "reviewed" ? "Reviewed" : "Review pending"}</span>
      </header>
      <div className="organisation-catalogue-card-tags">
        {record.segments.slice(0, 3).map((value) => (
          <Link href={catalogueFilterHref({ segment: value })} key={value}>{value}</Link>
        ))}
        {record.segments.length > 3 ? <span>+{record.segments.length - 3}</span> : null}
      </div>
      <dl>
        <div><dt>HQ</dt><dd>{record.headquartersCountry ? <CatalogueCountryLink country={record.headquartersCountry} field="headquarters" /> : "Not stated"}</dd></div>
        <div><dt>Coverage</dt><dd>{record.africanRegionsActive.includes("Africa-wide") ? "Africa-wide" : record.countryCount ? `${record.countryCount} ${record.countryCount === 1 ? "country" : "countries"}` : record.africanRegionsActive.join(", ") || "Not itemised"}</dd></div>
      </dl>
      <footer>
        {record.sourceUrl ? <a href={record.sourceUrl} rel="noreferrer" target="_blank">Source ↗</a> : <span>Source needed</span>}
        {canonicalHref ? <Link href={canonicalHref}>Profile →</Link> : record.website ? <a href={record.website} rel="noreferrer" target="_blank">Website ↗</a> : null}
      </footer>
    </article>
  );
}

function OrganisationCardGrid({ rows }: { rows: OrganisationDirectoryRecord[] }) {
  return (
    <div className="organisation-atlas-grid">
      {rows.map((record) => {
        const tags = record.segmentIds.length
          ? record.segmentIds.map((id) => ({ id, label: organisationSegmentName(id), key: "segment" }))
          : record.sectorIds.map((id) => ({ id, label: organisationSectorName(id), key: "sector" }));
        return (
          <article key={record.organisation.id}>
            <OrganisationMark name={record.organisation.name} organisationId={record.organisation.id} size={64} />
            <div>
              <h3><Link href={`/organisations/${record.organisation.slug}`}>{record.organisation.name}</Link></h3>
              <p><Link href={`/organisations?role=${record.primaryRole.id}`}>{record.primaryRole.name}</Link></p>
              <div className="organisation-sector-tags">
                {tags.slice(0, 2).map((tag) => (
                  <Link href={`/organisations?${tag.key}=${tag.id}`} key={tag.id}>{tag.label}</Link>
                ))}
                {tags.length > 2 ? <span>+{tags.length - 2}</span> : null}
              </div>
            </div>
            <dl>
              <div><dt>Software</dt><dd>{record.productCount ? <Link href={`/directory?q=${encodeURIComponent(record.organisation.name)}`}>{record.productCount}</Link> : "—"}</dd></div>
              <div><dt>Presence</dt><dd>{presenceSummary(record)}</dd></div>
            </dl>
            <Link aria-label={`Open ${record.organisation.name}`} href={`/organisations/${record.organisation.slug}`}>→</Link>
          </article>
        );
      })}
    </div>
  );
}

function OrganisationDirectoryTable({ rows }: { rows: OrganisationDirectoryRecord[] }) {
  return (
    <section className="organisation-directory-table" aria-label="Organisation directory">
      <div className="organisation-directory-head" aria-hidden="true">
        <span>Organisation</span><span>Actor type</span><span>Markets</span><span>Presence</span><span>Software</span>
      </div>
      {rows.map((record) => (
        <article key={record.organisation.id}>
          <div className="organisation-directory-name">
            <OrganisationMark name={record.organisation.name} organisationId={record.organisation.id} size={44} />
            <span><Link href={`/organisations/${record.organisation.slug}`}>{record.organisation.name}</Link><small><CountryNameLink name={record.organisation.countryOfOrigin} /></small></span>
          </div>
            <span><Link href={`/organisations?group=${record.ecosystemGroupIds[0]}`}>{organisationEcosystemGroupName(record.ecosystemGroupIds[0])}</Link><small><Link href={`/organisations?role=${record.primaryRole.id}`}>{record.primaryRole.name}</Link></small></span>
          <div className="organisation-directory-sectors">
            {record.segmentIds.length ? record.segmentIds.slice(0, 2).map((segmentId) => (
              <Link href={`/organisations?segment=${segmentId}`} key={segmentId}>{organisationSegmentName(segmentId)}</Link>
            )) : record.sectorIds.length ? record.sectorIds.slice(0, 2).map((sectorId) => (
              <Link href={`/organisations?sector=${sectorId}`} key={sectorId}>{organisationSectorName(sectorId)}</Link>
            )) : <span>Not yet classified</span>}
          </div>
          <span>{presenceSummary(record, true)}</span>
          <span>{record.productCount ? <Link href={`/directory?q=${encodeURIComponent(record.organisation.name)}`}>{record.productCount} linked</Link> : "Not reviewed"}</span>
        </article>
      ))}
    </section>
  );
}

function EmptyState() {
  return (
    <section className="landscape-empty">
      <strong>No organisations listed here yet.</strong>
      <Link href="/contribute/organisation">Add one →</Link>
    </section>
  );
}

function validId(value: string, options: Array<{ id: string }>) {
  return options.some((item) => item.id === value) ? value : "all";
}

function filterRecords(
  records: OrganisationDirectoryRecord[],
  filters: { query: string; role: string; sector: string; segment: string; country: string; origin: string; presence: OrganisationPresenceLayer },
) {
  const term = normaliseQuery(filters.query);
  return records.filter((record) => {
    if (filters.role !== "all" && !record.roleIds.includes(filters.role)) return false;
    if (filters.sector !== "all" && !record.sectorIds.includes(filters.sector)) return false;
    if (filters.segment !== "all" && !record.segmentIds.includes(filters.segment)) return false;
    if (filters.country !== "all" && !presenceCountries(record, filters.presence).includes(filters.country)) return false;
    if (filters.origin !== "all" && record.organisation.origin !== filters.origin) return false;
    if (!term) return true;
    return normaliseQuery([
      record.organisation.name,
      record.organisation.description,
      record.organisation.countryOfOrigin,
      record.organisation.headquarters,
      record.primaryRole.name,
      ...record.aliases,
      ...record.ecosystemGroupIds.map(organisationEcosystemGroupName),
      ...record.sectorIds.map(organisationSectorName),
      ...record.segmentIds.map(organisationSegmentName),
      ...record.countryNames,
    ].join(" ")).includes(term);
  });
}

function organisationCsv(rows: Array<Record<string, string | string[] | number>>) {
  const headers = [
    "organisation",
    "actor_types",
    "specific_roles",
    "energy_markets",
    "broad_sectors",
    "evidenced_countries",
    "company_stated_countries",
    "office_countries",
    "product_availability_countries",
    "software_linked_countries",
    "origin",
    "country_of_origin",
    "headquarters",
    "linked_software",
    "last_checked",
    "website",
  ];
  const escape = (value: string | string[] | number) => {
    const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}

function catalogueParams(values: {
  query: string;
  group: string;
  role: string;
  sector: string;
  segment: string;
  country: string;
  headquarters: string;
  scope: string;
  page: number;
  format?: "csv";
}) {
  const params = new URLSearchParams({ page: String(values.page), pageSize: "60" });
  if (values.query.trim()) params.set("q", values.query.trim());
  for (const key of ["group", "role", "sector", "segment", "country", "headquarters", "scope"] as const) {
    if (values[key] !== "all") params.set(key, values[key]);
  }
  if (values.format) params.set("format", values.format);
  return params.toString();
}

function organisationCatalogueMapHref(values: {
  country: string;
  group: string;
  headquarters: string;
  query: string;
  role: string;
  scope: string;
  sector: string;
  segment: string;
}) {
  const params = new URLSearchParams({
    object: "organisations",
    presence: values.scope === "africa_wide" ? "africa_wide" : "catalogue",
  });
  if (values.query.trim()) params.set("q", values.query.trim());
  if (values.group !== "all") params.set("group", values.group);
  if (values.role !== "all") params.set("role", values.role);
  if (values.sector !== "all") params.set("sector", values.sector);
  if (values.segment !== "all") params.set("segment", values.segment);
  if (values.headquarters !== "all") params.set("headquarters", values.headquarters);
  if (values.scope !== "all") params.set("scope", values.scope);
  const focus = africanCountries.find(([, name]) => name === values.country)?.[0];
  if (focus) {
    params.set("country", focus);
    params.set("focus", focus);
  }
  return `/deployments?${params.toString()}`;
}

function organisationCatalogueCardsHref(values: {
  country: string;
  group: string;
  headquarters: string;
  query: string;
  role: string;
  scope: string;
  sector: string;
  segment: string;
}) {
  const params = new URLSearchParams();
  if (values.query.trim()) params.set("q", values.query.trim());
  for (const key of ["group", "role", "sector", "segment", "country", "headquarters", "scope"] as const) {
    if (values[key] !== "all") params.set(key, values[key]);
  }
  const query = params.toString();
  return query ? `/organisations?${query}` : "/organisations";
}

function catalogueFilterHref(values: Partial<{
  country: string;
  group: string;
  headquarters: string;
  q: string;
  role: string;
  scope: string;
  sector: string;
  segment: string;
}>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
  }
  return `/organisations?${params.toString()}`;
}

function CatalogueCountryLink({
  country,
  field,
}: {
  country: string;
  field: "country" | "headquarters";
}) {
  const match = africanCountries.find(([, name]) => name === country);
  return match
    ? <Link href={`/countries/${match[0].toLowerCase()}`}>{country}</Link>
    : <Link href={catalogueFilterHref(field === "country" ? { country } : { headquarters: country })}>{country}</Link>;
}

function CountryNameLink({ name }: { name: string }) {
  const match = africanCountries.find(([, country]) => country === name);
  return match ? <Link href={`/countries/${match[0].toLowerCase()}`}>{name}</Link> : <>{name}</>;
}

function formatCatalogueDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function isPresenceLayer(value: string): value is OrganisationPresenceLayer {
  return ["all", "evidenced", "company_stated", "offices", "availability", "software_linked"].includes(value);
}

function presenceCountries(record: OrganisationDirectoryRecord, layer: OrganisationPresenceLayer) {
  if (layer === "evidenced") return record.evidencedCountryIso2s;
  if (layer === "company_stated") return record.companyStatedCountryIso2s;
  if (layer === "offices") return record.officeCountryIso2s;
  if (layer === "availability") return record.availabilityCountryIso2s;
  if (layer === "software_linked") return record.softwareLinkedCountryIso2s;
  return record.countryIso2s;
}

function presenceLayerLabel(layer: OrganisationPresenceLayer) {
  return {
    all: "All presence types",
    evidenced: "Evidenced activity",
    company_stated: "Company-stated",
    offices: "Offices and entities",
    availability: "Product availability",
    software_linked: "Software deployments",
  }[layer];
}

function presenceSummary(record: OrganisationDirectoryRecord, long = false) {
  const pieces = [
    record.evidencedCountryIso2s.length ? `${record.evidencedCountryIso2s.length} evidenced` : "",
    record.companyStatedCountryIso2s.length ? `${record.companyStatedCountryIso2s.length} stated` : "",
  ].filter(Boolean);
  if (pieces.length) return pieces.join(" · ");
  if (record.softwareLinkedCountryIso2s.length) {
    return `${record.softwareLinkedCountryIso2s.length} software${long ? "-linked" : ""}`;
  }
  return long ? "Not yet documented" : "—";
}

function countryNames(iso2s: string[]) {
  const names = new Map(africanCountries);
  return iso2s.map((iso2) => names.get(iso2) ?? iso2);
}
