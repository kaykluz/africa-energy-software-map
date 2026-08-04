import Link from "next/link";
import Image from "next/image";
import {
  africanCountries,
  categories,
  dataDistributions,
  deployments,
  organisationPresenceRecords,
  organisations,
  products,
  release,
  registryManifest,
  sources,
  type EvidenceStatus,
} from "@/lib/registry-data";
import { normaliseQuery } from "@/lib/registry-query";
import { EvidenceStatusLabel } from "@/components/semantic-tags";
import { OrganisationMark, ProductMark } from "@/components/brand-mark";
import {
  organisationCatalogue,
} from "@/lib/organisation-catalogue";
import { loadPublicOrganisationRegistry } from "@/db/canonical-organisations";
import { landscapeItems } from "@/lib/landscape-data";
import {
  organisationLinkIndex,
  resolveLandscapeItemHref,
  resolveOrganisationHref,
} from "@/lib/entity-links";

export async function MethodologyPage() {
  const { canonicalDirectory } = await loadPublicOrganisationRegistry();
  const sections = [
    ["scope", "Scope and exclusions"],
    ["taxonomy", "Entities and taxonomy"],
    ["deployment-definition", "Deployment definition"],
    ["organisation-presence", "Organisation presence"],
    ["organisation-catalogue", "Organisation catalogue"],
    ["evidence", "Evidence and source independence"],
    ["origin", "Origin and lifecycle"],
    ["market-condition", "Market-condition findings"],
    ["ai-use", "AI use and human review"],
    ["current-release", "Current release"],
    ["sensitive-infrastructure", "Sensitive infrastructure"],
    ["licence-exports", "Licence and exports"],
  ] as const;
  return (
    <main className="methodology-page standard-width" id="main-content" tabIndex={-1}>
      <header className="page-intro reading-intro">
        <span className="eyebrow">Methodology 1.1 · effective 3 August 2026</span>
        <h1>How the map decides what to show</h1>
        <p>
          The public rules for evidence, uncertainty and editorial review.
        </p>
        <div className="intro-actions">
          <a className="button button-outline" href="https://github.com/kaykluz/africa-energy-software-map/tree/main/docs" target="_blank" rel="noreferrer">
            Read the source documents ↗
          </a>
          <Link className="text-button" href="/changes">See methodology changes →</Link>
        </div>
      </header>
      <div className="methodology-layout">
        <nav aria-label="On this page" className="contents-nav">
          <strong>On this page</strong>
          {sections.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}
        </nav>
        <article className="methodology-prose">
          <ContentSection id="scope" heading="Scope and exclusions">
            <p>
              Phase 1 covers African-built and global software used in African
              energy systems, plus a source-led organisation directory for
              financiers, developers, OEMs, EPCs, operators, software providers,
              enablers and public institutions. Products, organisations, markets,
              deployments, sources and assertions remain separate objects. The map
              excludes exact non-public coordinates, paid inclusion, subjective
              rankings and unmoderated editing.
            </p>
          </ContentSection>
          <ContentSection id="taxonomy" heading="Entities and taxonomy">
            <p>
              Stable identifiers connect a product to its owner, capabilities,
              deployments and assertion-level evidence. The software stack uses six
              functional stages plus one cross-cutting band. A product has one
              primary category and may carry additional capabilities. Organisations
              use eight parallel actor types and eleven independently filterable
              energy markets; actor type is not a sequential value chain.
            </p>
            <div className="methodology-stat-grid">
              <span><strong>6</strong> software stages</span>
              <span><strong>8</strong> organisation actor types</span>
              <span><strong>11</strong> energy markets</span>
            </div>
          </ContentSection>
          <ContentSection id="deployment-definition" heading="Deployment definition">
            <p>
              A deployment is a source-supported record of a product used by or for
              a customer in a country or safe subnational area. Availability,
              headquarters, origin, partnerships, awards and accelerator membership
              do not establish deployment.
            </p>
            <div className="definition-pair">
              <div><strong>Counts as evidence</strong><p>A customer or independent primary source connects product, place and use.</p></div>
              <div><strong>Does not count</strong><p>A provider lists a market, says “available in Africa” or names a partner without use.</p></div>
            </div>
          </ContentSection>
          <ContentSection id="organisation-presence" heading="Organisation presence">
            <p>
              Organisation presence is recorded separately from software deployment,
              headquarters and origin. Each country record states what is present—an
              operation, project role, office, legal entity, product deployment or
              product availability—and whether it is active, planned, historical or unknown.
            </p>
            <p>
              An explicit Africa-wide catalogue scope appears across country views for
              discovery and is always labelled “Africa-wide coverage.” It is not an
              exact-country presence, office, headquarters or deployment claim.
            </p>
            <div className="definition-pair">
              <div><strong>Company source</strong><p>An official company page may support company-stated presence. It stays provider-authored until corroborated.</p></div>
              <div><strong>Independent evidence</strong><p>A customer, official or independent source can support an evidenced presence record. It does not automatically prove a software deployment.</p></div>
            </div>
          </ContentSection>
          <ContentSection id="organisation-catalogue" heading="Organisation catalogue">
            <p>
              The inclusion catalogue is a broad, source-linked discovery layer. It
              currently contains {organisationCatalogue.counts.total.toLocaleString()} listings,
              including international organisations whose documented products,
              investments, memberships or operations connect them to African energy
              markets. Catalogue inclusion is not an endorsement, a deployment claim
              or a reviewed profile.
            </p>
            <div className="definition-pair">
              <div><strong>Listed</strong><p>Imported from a named directory or direct source and clearly marked when editorial review remains open.</p></div>
              <div><strong>Canonical</strong><p>A deduplicated identity with a stable profile URL, published after source, classification and safety checks.</p></div>
            </div>
          </ContentSection>
          <ContentSection id="evidence" heading="Evidence and source independence">
            <p>
              Evidence is attached to atomic assertions. A profile may mix
              provider-authored descriptions, an independent deployment source and
              an unknown launch date without flattening those differences.
            </p>
            <div className="evidence-explainer">
              {[
                ["provider_claim_only", "Provider says it; no qualifying independent source is attached."],
                ["public_source", "A public source supports the assertion but independence is limited or not yet classified."],
                ["independently_evidenced", "An official, customer or independent primary source supports the assertion."],
                ["customer_confirmed", "The named customer has confirmed the assertion through an auditable route."],
              ].map(([status, copy]) => (
                <div key={status}><EvidenceStatusLabel status={status as EvidenceStatus} /><p>{copy}</p></div>
              ))}
            </div>
            <WorkedExample />
          </ContentSection>
          <ContentSection id="origin" heading="Origin and lifecycle">
            <p>
              “Africa-built”, “founded in”, and “headquartered in” answer different
              questions. Lifecycle describes the record as active, pilot, historical,
              acquired, merged, inactive or under review. Stale means research is due,
              not that the product is inactive.
            </p>
          </ContentSection>
          <ContentSection id="market-condition" heading="Market-condition findings">
            <p>
              Commercial, bundled or gated, donor-supported, structurally thin and
              insufficient-evidence readings apply to categories, never vendors. Each
              needs dedicated sources, reasoning, a date and editorial review.
            </p>
            <div className="methodology-warning">
              <strong>“Structurally thin” is a sourced finding.</strong>
              <p>An empty category cannot be labelled structurally thin merely because research found no products.</p>
            </div>
          </ContentSection>
          <ContentSection id="ai-use" heading="AI use and human review">
            <p>
              AI may discover candidates, extract proposed assertions, flag
              duplicates and prepare review branches. AI output is never evidence and
              no autonomous process may publish. A human reviewer must assess source
              quality, independence, wording, privacy and conflicts before merge.
            </p>
            <ol className="method-flow">
              <li><strong>Discover</strong><span>Approved source registers and submitted leads</span></li>
              <li><strong>Extract</strong><span>Atomic candidate assertions with source locators</span></li>
              <li><strong>Validate</strong><span>Schema, duplicate, URL, geography and sensitive-data checks</span></li>
              <li><strong>Review</strong><span>Human editorial decision in a public pull request</span></li>
              <li><strong>Release</strong><span>Versioned, traceable, reversible dataset publication</span></li>
            </ol>
          </ContentSection>
          <ContentSection id="current-release" heading="Current release">
            <p>
              Release {release.version} contains {products.length} reviewed products,
              {" "}{canonicalDirectory.length} canonical organisations and{" "}
              {organisationCatalogue.counts.total.toLocaleString()} inclusion-catalogue listings,
              {" "}{deployments.length} country-safe
              deployment records, {organisationPresenceRecords.length} explicit organisation-presence
              records and {sources.length} rights-resolved sources. The
              wider software wall also contains classified submitted listings that
              are kept distinct from canonical reviewed records.
            </p>
          </ContentSection>
          <ContentSection id="sensitive-infrastructure" heading="Sensitive infrastructure">
            <p>
              Country or safe province/utility territory is the default maximum
              precision. Exact non-public coordinates, vulnerabilities, credentials,
              private contacts and confidential commercial details are prohibited.
              “Customer undisclosed” carries a publishable verification basis without
              identity clues.
            </p>
          </ContentSection>
          <ContentSection id="licence-exports" heading="Licence and exports">
            <p>
              The intended project-data and documentation licence is CC BY 4.0; code
              is MIT. Third-party source content, logos and other rights are excluded.
              Exports carry version, date, filters and attribution information.
            </p>
            <Link href="/data">Open data and downloads →</Link>
          </ContentSection>
        </article>
      </div>
    </main>
  );
}

export function ContributeHubPage() {
  const options = [
    {
      href: "/contribute/product",
      number: "01",
      title: "Submit a product",
      copy: "Add missing software and its owner.",
      evidence: "Product or organisation source",
    },
    {
      href: "/contribute/organisation",
      number: "02",
      title: "Submit an organisation",
      copy: "Add a financier, developer, OEM, EPC, operator or enabler.",
      evidence: "Direct source for its role and energy markets",
    },
    {
      href: "/contribute/deployment",
      number: "03",
      title: "Add a deployment",
      copy: "Connect software to a country and source.",
      evidence: "Customer, official or independent source",
    },
    {
      href: "/contribute/correction",
      number: "04",
      title: "Correct a record",
      copy: "Replace an exact field with sourced information.",
      evidence: "Source for the correction",
    },
    {
      href: "/contribute/claim",
      number: "05",
      title: "Claim a profile",
      copy: "Confirm your relationship and propose updates.",
      evidence: "Organisation-domain email",
    },
  ];
  return (
    <main className="standard-width contribute-page" id="main-content" tabIndex={-1}>
      <header className="page-intro reading-intro">
        <span className="eyebrow">Contribute evidence</span>
        <h1>Help make the map more accurate</h1>
        <p>
          Choose a route. Every submission receives human review.
        </p>
      </header>
      <div className="contribution-grid">
        {options.map((option) => (
          <Link href={option.href} key={option.href}>
            <span className="mono">{option.number}</span>
            <h2>{option.title}</h2>
            <p>{option.copy}</p>
            <small><strong>Prepare:</strong> {option.evidence}</small>
            <span className="contribution-arrow">Start →</span>
          </Link>
        ))}
      </div>
      <section className="review-process">
        <div><span className="eyebrow">After submission</span><h2>Review process</h2></div>
        <ol>
          <li><strong>1. Intake</strong><span>Duplicate and sensitive-data checks</span></li>
          <li><strong>2. Research</strong><span>Source classification and corroboration</span></li>
          <li><strong>3. Editorial review</strong><span>Human decision and public change record</span></li>
        </ol>
      </section>
    </main>
  );
}

export async function DataPage() {
  const { canonicalDirectory } = await loadPublicOrganisationRegistry();
  return (
    <main className="standard-width data-page" id="main-content" tabIndex={-1}>
      <header className="page-intro reading-intro">
        <span className="eyebrow">Data access</span>
        <h1>Data and downloads</h1>
        <p>
          Export a filtered view or inspect versioned release packages.
        </p>
        <div className="intro-actions">
          <Link className="button button-primary" href="/directory">Export software</Link>
          <Link className="button button-outline" href="/organisations">Export organisations</Link>
          <a className="button button-outline" href="https://github.com/kaykluz/africa-energy-software-map/tree/main/data" target="_blank" rel="noreferrer">
            Inspect data on GitHub ↗
          </a>
        </div>
      </header>
      <section className="release-card">
        <div>
          <span className="eyebrow">Current interface dataset</span>
          <h2>{release.version}</h2>
          <p>{release.status}</p>
        </div>
        <dl>
          <div><dt>Products</dt><dd>{products.length}</dd></div>
          <div><dt>Organisation listings</dt><dd>{organisationCatalogue.counts.total.toLocaleString()}</dd></div>
          <div><dt>Canonical organisations</dt><dd>{canonicalDirectory.length}</dd></div>
          <div><dt>Deployments</dt><dd>{deployments.length}</dd></div>
          <div><dt>Sources</dt><dd>{sources.length}</dd></div>
        </dl>
        <p className="release-gate">
          {registryManifest.reviewGate.reviewedAssertions} of{" "}
          {registryManifest.reviewGate.assertions} assertions reviewed ·{" "}
          {registryManifest.reviewGate.unresolvedSources} sources need metadata
        </p>
      </section>
      <figure className="data-visual">
        <Image
          alt="Abstract equal-area map of Africa with evidence tiles and a cobalt data route"
          height={630}
          priority={false}
          src="/social-card.jpg"
          unoptimized
          width={1200}
        />
        <figcaption>
          Visual language: equal-area country access, evidence intensity and a
          traceable route through source-linked records—not physical infrastructure.
        </figcaption>
      </figure>
      <section className="data-section">
        <div>
          <span className="eyebrow">
            {release.mode === "published"
              ? "Reviewed release"
              : "Candidate package"}
          </span>
          <h2>Download the current data</h2>
          <p>
            {release.mode === "published"
              ? "Versioned tables, assertions and country-safe deployment data."
              : "These files form a pre-publication candidate package and remain private until editorial review is complete."}
          </p>
        </div>
        <div className="download-list">
          {dataDistributions.map((distribution) => (
            <article key={distribution.id}>
              <div>
                <h3>{distribution.label}</h3>
                <p>{distributionDescription(distribution.id)}</p>
              </div>
              <a download href={distribution.href}>
                {distribution.format} ↓
              </a>
            </article>
          ))}
          <article>
            <div>
              <h3>Schema and dictionary</h3>
              <p>Stable identifiers, accepted values and field definitions.</p>
            </div>
            <a
              href="https://github.com/kaykluz/africa-energy-software-map/tree/main/schemas"
              rel="noreferrer"
              target="_blank"
            >
              GitHub ↗
            </a>
          </article>
          <article>
            <div>
              <h3>Excel workbook</h3>
              <p>Non-technical release workbook after editorial promotion.</p>
            </div>
            <span>Planned</span>
          </article>
        </div>
      </section>
      <section className="data-section two-column-copy">
        <div><h2>Software wall</h2><p>Browse classified software and enabling infrastructure by function, stage and sector.</p><Link href="/landscape">Open the wall →</Link></div>
        <div><h2>Organisation catalogue</h2><p>Browse all listings by actor role, energy market, headquarters and documented country coverage. Reviewed profiles remain clearly separate.</p><Link href="/organisations">Open organisations →</Link></div>
        <div><h2>Versioning and provenance</h2><p>Every immutable release states its version, date, Git commit, record counts, limitations, checksums and licence.</p></div>
      </section>
    </main>
  );
}

function distributionDescription(id: string) {
  return {
    csv_package: "Normalised tables, metadata, licence and checksums.",
    registry_json: "The complete snapshot used by this interface.",
    assertions_jsonl: "One source-linked reviewed assertion per line.",
    deployments_geojson: "Country-safe geography without precise coordinates.",
    download_manifest: "Counts, review status, file sizes and hashes.",
  }[id] ?? "Versioned release file.";
}

export async function SearchResultsPage({ query }: { query: string }) {
  const { canonicalDirectory, catalogueRecords } = await loadPublicOrganisationRegistry();
  const canonicalOrganisations = canonicalDirectory.map((record) => record.organisation);
  const canonicalDirectoryById = new Map(
    canonicalDirectory.map((record) => [record.organisation.id, record]),
  );
  const canonicalOrganisationLinks = organisationLinkIndex(canonicalDirectory);
  const term = normaliseQuery(query);
  const productResults = term
    ? products.filter((product) =>
        normaliseQuery(
          [
            product.name,
            product.organisation,
            product.category,
            product.description,
            ...product.capabilities,
          ].join(" "),
        ).includes(term),
      )
    : [];
  const organisationResults = term
    ? canonicalOrganisations.filter((organisation) =>
        normaliseQuery(
          [
            organisation.name,
            organisation.type,
            organisation.description,
            organisation.origin,
            organisation.countryOfOrigin,
            organisation.headquarters,
            ...(canonicalDirectoryById.get(organisation.id)?.aliases ?? []),
          ].join(" "),
        ).includes(term),
      )
    : [];
  const categoryResults = term
    ? categories.filter((category) =>
        normaliseQuery(category.name).includes(term),
      )
    : [];
  const countryResults = term
    ? africanCountries.filter(([, name]) => normaliseQuery(name).includes(term))
    : [];
  const canonicalResultHrefs = new Set([
    ...productResults.map((product) => `/products/${product.slug}`),
    ...organisationResults.map((organisation) => `/organisations/${organisation.slug}`),
  ]);
  const landscapeResults = term
    ? landscapeItems
        .filter((item) => normaliseQuery([
          item.name,
          item.parent ?? "",
          ...(item.aliases ?? []),
          item.summaryAsSubmitted,
          ...item.geographies,
        ].join(" ")).includes(term))
        .map((item) => ({
          href: resolveLandscapeItemHref(item, canonicalOrganisationLinks) ?? `/landscape?q=${encodeURIComponent(item.name)}`,
          item,
          parentHref: item.parent
            ? resolveOrganisationHref(item.parent, canonicalOrganisationLinks)
            : undefined,
        }))
        .filter((result) => !canonicalResultHrefs.has(result.href))
    : [];
  const catalogueResults = term
    ? catalogueRecords
        .filter((record) => record.reviewState === "needs_review")
        .filter((record) =>
          normaliseQuery([
            record.name,
            ...record.aliases,
            record.parent,
            record.primaryRole,
            ...record.roles,
            ...record.segments,
            ...record.countriesActive,
            record.headquartersCountry,
          ].join(" ")).includes(term),
        )
    : [];
  return (
    <main className="standard-width search-page" id="main-content" tabIndex={-1}>
      <header className="page-intro">
        <span className="eyebrow">Search the registry</span>
        <h1>{query ? `Results for “${query}”` : "Search"}</h1>
        <form action="/search" className="search-page-form">
          <label className="sr-only" htmlFor="results-search">Search</label>
          <input defaultValue={query} id="results-search" name="q" placeholder="Products, organisations, capabilities or countries" type="search" />
          <button className="button button-primary" type="submit">Search</button>
        </form>
      </header>
      {!query ? (
        <div className="inline-empty"><strong>Enter at least two characters.</strong><p>Try “metering”, “Nigeria” or “PAYGo”.</p></div>
      ) : productResults.length ||
        organisationResults.length ||
        categoryResults.length ||
        countryResults.length ||
        landscapeResults.length ||
        catalogueResults.length ? (
        <div className="search-groups">
          {productResults.length ? (
            <section><h2>Products <span>{productResults.length}</span></h2>
              {productResults.map((product) => {
                const organisation = organisations.find((item) => item.id === product.organisationId);
                return (
                  <article className="search-entity-row" key={product.id}>
                    <ProductMark
                      organisationId={product.organisationId}
                      organisationName={product.organisation}
                      productId={product.id}
                      productName={product.name}
                      size={42}
                    />
                    <span>
                      <Link href={`/products/${product.slug}`}><strong>{product.name}</strong></Link>
                      {organisation ? <Link href={`/organisations/${organisation.slug}`}><small>{product.organisation}</small></Link> : <small>{product.organisation}</small>}
                    </span>
                    <Link href={`/?category=${product.categoryId}`}>{product.category} →</Link>
                  </article>
                );
              })}
            </section>
          ) : null}
          {organisationResults.length ? (
            <section>
              <h2>Organisations <span>{organisationResults.length}</span></h2>
              {organisationResults.map((organisation) => (
                <Link
                  href={`/organisations/${organisation.slug}`}
                  key={organisation.id}
                >
                  <OrganisationMark name={organisation.name} organisationId={organisation.id} size={42} />
                  <span>
                    <strong>{organisation.name}</strong>
                    <small>{organisation.type}</small>
                  </span>
                  <span>Open record →</span>
                </Link>
              ))}
            </section>
          ) : null}
          {catalogueResults.length ? (
            <section>
              <h2>Organisation listings <span>{catalogueResults.length}</span></h2>
              {catalogueResults.slice(0, 100).map((record) => (
                <Link href={`/organisations?q=${encodeURIComponent(record.name)}`} key={record.id}>
                  <OrganisationMark name={record.name} organisationId={record.id} size={42} />
                  <span>
                    <strong>{record.name}</strong>
                    <small>{[record.primaryRole, record.headquartersCountry, "Review pending"].filter(Boolean).join(" · ")}</small>
                  </span>
                  <span>View listing →</span>
                </Link>
              ))}
              {catalogueResults.length > 100 ? <p>Showing the first 100 matches. Narrow the search or open the full organisation catalogue.</p> : null}
            </section>
          ) : null}
          {categoryResults.length ? (
            <section><h2>Capabilities <span>{categoryResults.length}</span></h2>
              {categoryResults.map((category) => (
                <Link href={`/?category=${category.id}`} key={category.id}><span><strong>{category.name}</strong><small>Value-chain category</small></span><span>View in Explore →</span></Link>
              ))}
            </section>
          ) : null}
          {countryResults.length ? (
            <section><h2>Countries <span>{countryResults.length}</span></h2>
              {countryResults.map(([iso2, name]) => (
                <Link href={`/countries/${iso2.toLowerCase()}`} key={iso2}><span><strong>{name}</strong><small>{iso2}</small></span><span>Open country →</span></Link>
              ))}
            </section>
          ) : null}
          {landscapeResults.length ? (
            <section><h2>Software wall <span>{landscapeResults.length}</span></h2>
              {landscapeResults.slice(0, 100).map(({ href, item, parentHref }) => (
                <article className="search-entity-row" key={item.id}>
                  <span>
                    <Link href={href}><strong>{item.name}</strong></Link>
                    {item.parent ? (
                      parentHref ? <Link href={parentHref}><small>{item.parent}</small></Link> : <small>{item.parent}</small>
                    ) : <small>Full catalogue listing</small>}
                  </span>
                  <Link href={href}>Open listing →</Link>
                </article>
              ))}
            </section>
          ) : null}
        </div>
      ) : (
        <div className="zero-results">
          <span className="eyebrow">No published match</span>
          <h2>No published record matched “{query}”.</h2>
          <p>
            This does not prove the product or capability does not exist. Try a
            broader term, clear filters or submit a candidate for review.
          </p>
          <div><Link className="button button-primary" href="/contribute/product">Submit product</Link><Link className="button button-outline" href="/">Open Explore</Link></div>
        </div>
      )}
    </main>
  );
}

export function ChangesPage() {
  return (
    <main className="standard-width changes-page" id="main-content" tabIndex={-1}>
      <header className="page-intro reading-intro">
        <span className="eyebrow">Public editorial record</span>
        <h1>Changes</h1>
        <p>Trace additions, corrections, evidence changes and methodology decisions to public review.</p>
      </header>
      <div className="change-list">
        <article><time dateTime="2026-08-03">3 August 2026</time><div><span className="semantic-tag">Organisation presence</span><h2>Country presence separated into sourced layers</h2><p>Added distinct views for evidenced activity, company-stated presence, offices and entities, product availability, and software deployments. Company websites may support company-stated records but do not become independent evidence.</p><a href="https://github.com/kaykluz/africa-energy-software-map/pulls" target="_blank" rel="noreferrer">View pull requests ↗</a></div></article>
        <article><time dateTime="2026-07-30">30 July 2026</time><div><span className="semantic-tag">Prototype</span><h2>Interactive design workstream opened</h2><p>Added a candidate-data interface for review. No records were published.</p><a href="https://github.com/kaykluz/africa-energy-software-map/pulls" target="_blank" rel="noreferrer">View pull requests ↗</a></div></article>
        <article><time dateTime="2026-07-30">30 July 2026</time><div><span className="semantic-tag">Evidence review</span><h2>Batch 001 source-linked review proposed</h2><p>Completed source records and assertion corrections remain pending human editorial review.</p><a href="https://github.com/kaykluz/africa-energy-software-map/pull/3" target="_blank" rel="noreferrer">View proposal ↗</a></div></article>
        <article><time dateTime="2026-07-29">29 July 2026</time><div><span className="semantic-tag">Foundation</span><h2>Repository and governance created</h2><p>Established schemas, contribution rules, AI safeguards and the Phase 1 UI/UX contract.</p><a href="https://github.com/kaykluz/africa-energy-software-map" target="_blank" rel="noreferrer">View repository ↗</a></div></article>
      </div>
    </main>
  );
}

export function PolicyPage({
  title,
  eyebrow,
  intro,
  sections,
}: {
  title: string;
  eyebrow: string;
  intro: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <main className="reading-page reading-width" id="main-content" tabIndex={-1}>
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p className="reading-lead">{intro}</p>
      {sections.map((section) => (
        <section key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p></section>
      ))}
      <p className="policy-date">Last reviewed · 3 August 2026</p>
    </main>
  );
}

function WorkedExample() {
  return (
    <section className="worked-example">
      <span className="eyebrow">Worked example</span>
      <h3>One product, four different claims</h3>
      <div>
        <article><span>01</span><strong>Provider availability</strong><p>“The product supports utilities in Africa.” Kept as a provider claim.</p></article>
        <article><span>02</span><strong>Evidenced deployment</strong><p>An official programme names product, customer, country and year.</p></article>
        <article><span>03</span><strong>Customer confirmation</strong><p>The named customer confirms the same use through an auditable route.</p></article>
        <article><span>04</span><strong>Outcome claim</strong><p>Any claimed performance result needs its own source and is not inferred from deployment.</p></article>
      </div>
    </section>
  );
}

function ContentSection({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: React.ReactNode;
}) {
  return <section id={id}><h2>{heading}</h2>{children}</section>;
}
