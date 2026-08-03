import Link from "next/link";
import Image from "next/image";
import {
  categories,
  dataDistributions,
  deployments,
  organisations,
  products,
  release,
  registryManifest,
  sources,
  type EvidenceStatus,
} from "@/lib/registry-data";
import { normaliseQuery } from "@/lib/registry-query";
import { EvidenceStatusLabel } from "@/components/semantic-tags";

export function MethodologyPage() {
  const sections = [
    ["scope", "Scope and exclusions"],
    ["taxonomy", "Entities and taxonomy"],
    ["deployment-definition", "Deployment definition"],
    ["evidence", "Evidence and source independence"],
    ["origin", "Origin and lifecycle"],
    ["market-condition", "Market-condition findings"],
    ["ai-use", "AI use and human review"],
    ["sensitive-infrastructure", "Sensitive infrastructure"],
    ["licence-exports", "Licence and exports"],
  ] as const;
  return (
    <main className="methodology-page standard-width" id="main-content" tabIndex={-1}>
      <header className="page-intro reading-intro">
        <span className="eyebrow">Methodology 1.0 · effective 30 July 2026</span>
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
              energy systems: products, organisations, capabilities, deployments,
              sources and assertions. It excludes general service-company lists,
              physical-asset mapping, exact non-public coordinates, paid inclusion,
              subjective rankings and unmoderated editing.
            </p>
          </ContentSection>
          <ContentSection id="taxonomy" heading="Entities and taxonomy">
            <p>
              Stable identifiers connect a product to its owner, capabilities,
              deployments and assertion-level evidence. The public stack uses six
              value-chain stages plus one cross-cutting band. A product has one
              primary category and may later carry additional capabilities.
            </p>
            <div className="methodology-stat-grid">
              <span><strong>6</strong> value-chain stages</span>
              <span><strong>14</strong> Phase 1 categories</span>
              <span><strong>4</strong> evidence states</span>
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
          <ContentSection id="prototype-data" heading="Prototype-data status">
            <p>
              This interactive build uses the first five candidate products and four
              candidate deployments from the workbook migration. They are displayed
              to validate page behaviour and are marked “editorial review required”.
              Interface labels do not promote them to a public release.
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
      href: "/contribute/deployment",
      number: "02",
      title: "Add a deployment",
      copy: "Connect software to a country and source.",
      evidence: "Customer, official or independent source",
    },
    {
      href: "/contribute/correction",
      number: "03",
      title: "Correct a record",
      copy: "Replace an exact field with sourced information.",
      evidence: "Source for the correction",
    },
    {
      href: "/contribute/claim",
      number: "04",
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

export function DataPage() {
  return (
    <main className="standard-width data-page" id="main-content" tabIndex={-1}>
      <header className="page-intro reading-intro">
        <span className="eyebrow">Data access</span>
        <h1>Data and downloads</h1>
        <p>
          Export a filtered view or inspect versioned release packages.
        </p>
        <div className="intro-actions">
          <Link className="button button-primary" href="/directory">Create a filtered export</Link>
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
          <div><dt>Organisations</dt><dd>{organisations.length}</dd></div>
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
              : "These files reproduce the prototype. They remain candidate data until editorial review is complete."}
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
        <div><h2>Software wall</h2><p>Browse and export every submitted name across the value chain.</p><Link href="/landscape">Open the wall →</Link></div>
        <div><h2>Versioning and provenance</h2><p>Every immutable release states its version, date, Git commit, record counts, limitations, checksums and licence.</p></div>
      </section>
    </main>
  );
}

function distributionDescription(id: string) {
  return {
    csv_package: "Normalised tables, metadata, licence and checksums.",
    registry_json: "The complete snapshot used by this interface.",
    assertions_jsonl: "One source-linked candidate assertion per line.",
    deployments_geojson: "Country-safe geography without precise coordinates.",
    download_manifest: "Counts, review status, file sizes and hashes.",
  }[id] ?? "Candidate dataset file.";
}

export function SearchResultsPage({ query }: { query: string }) {
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
    ? organisations.filter((organisation) =>
        normaliseQuery(
          [
            organisation.name,
            organisation.type,
            organisation.description,
            organisation.origin,
            organisation.countryOfOrigin,
            organisation.headquarters,
          ].join(" "),
        ).includes(term),
      )
    : [];
  const categoryResults = term
    ? categories.filter((category) =>
        normaliseQuery(category.name).includes(term),
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
        categoryResults.length ? (
        <div className="search-groups">
          {productResults.length ? (
            <section><h2>Products <span>{productResults.length}</span></h2>
              {productResults.map((product) => (
                <Link href={`/products/${product.slug}`} key={product.id}><span><strong>{product.name}</strong><small>{product.organisation}</small></span><span>{product.category} →</span></Link>
              ))}
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
                  <span>
                    <strong>{organisation.name}</strong>
                    <small>{organisation.type}</small>
                  </span>
                  <span>Open record →</span>
                </Link>
              ))}
            </section>
          ) : null}
          {categoryResults.length ? (
            <section><h2>Capabilities <span>{categoryResults.length}</span></h2>
              {categoryResults.map((category) => (
                <Link href={`/?category=${category.id}`} key={category.id}><span><strong>{category.name}</strong><small>Value-chain category</small></span><span>View in Explore →</span></Link>
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
      <p className="policy-date">Draft for prototype review · 30 July 2026</p>
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
