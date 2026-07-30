import Link from "next/link";
import {
  deployments,
  organisationBySlug,
  organisations,
  productById,
  productBySlug,
  products,
  release,
  sources,
} from "@/lib/registry-data";
import {
  EvidenceStatusLabel,
  Freshness,
  LifecycleTag,
  OriginLabel,
} from "@/components/semantic-tags";

export function ProductProfile({ slug }: { slug: string }) {
  const product = productBySlug(slug);
  if (!product) return <NotFoundRecord type="product" />;
  const productDeployments = deployments.filter(
    (deployment) => deployment.productId === product.id,
  );
  const organisation = organisations.find(
    (record) => record.id === product.organisationId,
  );

  return (
    <main className="profile-page profile-width" id="main-content">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">Stack</Link><span aria-hidden="true">/</span>
        <Link href={`/?category=${product.categoryId}`}>{product.category}</Link>
        <span aria-hidden="true">/</span><span>{product.name}</span>
      </nav>
      <header className="record-header">
        <div>
          <span className="eyebrow">Product record · candidate</span>
          <h1>{product.name}</h1>
          <Link className="record-owner" href={`/organisations/${organisation?.slug ?? ""}`}>
            {product.organisation}
          </Link>
          <p>{product.description}</p>
          <div className="record-labels">
            <OriginLabel value={product.origin} />
            <LifecycleTag value={product.lifecycle} />
            {product.evidence.map((status) => (
              <EvidenceStatusLabel key={status} status={status} />
            ))}
          </div>
          <Freshness date={product.lastChecked} />
        </div>
        <div className="record-actions">
          <Link className="button button-primary" href={`/contribute/deployment?product=${product.slug}`}>
            Add deployment
          </Link>
          <Link className="button button-outline" href={`/contribute/correction?product=${product.slug}`}>
            Suggest correction
          </Link>
        </div>
      </header>

      <div className="record-layout">
        <article className="record-main">
          <ProfileSection heading="At a glance">
            <dl className="fact-grid">
              <Fact label="Category" value={product.category} />
              <Fact label="Access model" value={product.accessModel} />
              <Fact label="Lifecycle" value={capitalise(product.lifecycle)} />
              <Fact
                label="Deployment countries"
                value={
                  product.deploymentCountries.length
                    ? product.deploymentCountries.join(", ")
                    : "No evidenced country in this batch"
                }
              />
            </dl>
          </ProfileSection>
          <ProfileSection heading="Capabilities">
            <ul className="capability-list">
              {product.capabilities.map((capability) => (
                <li key={capability}>{capability}</li>
              ))}
            </ul>
          </ProfileSection>
          <ProfileSection heading="African deployments">
            {productDeployments.length ? (
              <div className="profile-deployment-list">
                {productDeployments.map((deployment) => (
                  <article key={deployment.id}>
                    <header>
                      <div>
                        <h3>{deployment.country}</h3>
                        <span>{deployment.area}</span>
                      </div>
                      <LifecycleTag value={deployment.lifecycle} />
                    </header>
                    <dl>
                      <Fact label="Customer" value={deployment.customer} />
                      <Fact label="Year" value={deployment.year} />
                      <Fact
                        label="Disclosure"
                        value={
                          deployment.customerDisclosure === "undisclosed"
                            ? "Customer undisclosed"
                            : "Named customer"
                        }
                      />
                      <div>
                        <dt>Evidence</dt>
                        <dd><EvidenceStatusLabel status={deployment.evidence} /></dd>
                      </div>
                    </dl>
                    <Freshness date={deployment.lastChecked} />
                  </article>
                ))}
              </div>
            ) : (
              <div className="inline-empty">
                <strong>No evidenced deployment in this candidate batch.</strong>
                <p>
                  A product page or provider statement can show availability, but it
                  does not prove an African deployment.
                </p>
                <Link href={`/contribute/deployment?product=${product.slug}`}>
                  Add deployment evidence →
                </Link>
              </div>
            )}
          </ProfileSection>
          <ProfileSection heading="Claimed availability">
            <div className="claim-separation">
              <EvidenceStatusLabel status="provider_claim_only" />
              <p>
                Provider-authored product information is available. It is kept
                separate from the evidenced-deployment count above.
              </p>
            </div>
          </ProfileSection>
          <ProfileSection heading="Assertion-level evidence and sources">
            <div className="source-list">
              {sources
                .filter((source) =>
                  productDeployments.some(
                    (deployment) => deployment.sourceId === source.id,
                  ) || source.url === rootWebsite(product.website),
                )
                .map((source) => (
                  <article key={source.id}>
                    <div>
                      <span className="eyebrow">{source.independence}</span>
                      <h3>{source.title}</h3>
                      <p>{source.publisher} · retrieved {source.retrieved}</p>
                    </div>
                    <a href={source.url} rel="noreferrer" target="_blank">
                      Open source ↗
                    </a>
                  </article>
                ))}
            </div>
          </ProfileSection>
          <ProfileSection heading="Record history">
            <ol className="history-list">
              <li><span className="mono">30 Jul 2026</span><p>Candidate record normalised for the interactive prototype.</p></li>
              <li><span className="mono">24 Jul 2026</span><p>Source material last checked in the workbook review.</p></li>
            </ol>
          </ProfileSection>
        </article>

        <aside className="record-rail">
          <div className="rail-card">
            <span className="eyebrow">Record status</span>
            <strong>Editorial review required</strong>
            <p>
              This prototype renders candidate records to test the information
              architecture. It does not publish them.
            </p>
          </div>
          <div className="rail-card">
            <span className="eyebrow">Owning organisation</span>
            <strong>{organisation?.name}</strong>
            <p>{organisation?.description}</p>
            <Link href={`/organisations/${organisation?.slug}`}>View organisation →</Link>
          </div>
          <div className="rail-card">
            <span className="eyebrow">Source website</span>
            <a href={product.website} rel="noreferrer" target="_blank">Visit provider website ↗</a>
            <p>External websites are not verification by themselves.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

export function OrganisationProfile({ slug }: { slug: string }) {
  const organisation = organisationBySlug(slug);
  if (!organisation) return <NotFoundRecord type="organisation" />;
  const organisationProducts = products.filter(
    (product) => product.organisationId === organisation.id,
  );
  const organisationDeployments = deployments.filter((deployment) =>
    organisationProducts.some((product) => product.id === deployment.productId),
  );

  return (
    <main className="profile-page profile-width" id="main-content">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/directory">Directory</Link><span aria-hidden="true">/</span>
        <span>{organisation.name}</span>
      </nav>
      <header className="record-header">
        <div>
          <span className="eyebrow">Organisation record · candidate</span>
          <h1>{organisation.name}</h1>
          <p>{organisation.description}</p>
          <div className="record-labels">
            <span className="origin-label"><span className="origin-mark" aria-hidden="true" />{organisation.origin}</span>
            <LifecycleTag value={organisation.lifecycle.toLowerCase()} />
          </div>
          <Freshness date={organisation.lastChecked} />
        </div>
        <div className="record-actions">
          <Link className="button button-primary" href={`/contribute/claim?organisation=${organisation.slug}`}>
            Claim profile
          </Link>
          <Link className="button button-outline" href={`/contribute/correction?organisation=${organisation.slug}`}>
            Suggest correction
          </Link>
        </div>
      </header>
      <div className="record-layout">
        <article className="record-main">
          <ProfileSection heading="Overview">
            <dl className="fact-grid">
              <Fact label="Type" value={organisation.type} />
              <Fact label="Country of origin" value={organisation.countryOfOrigin} />
              <Fact label="Current headquarters" value={organisation.headquarters} />
              <Fact label="Provider profile confirmation" value="Not confirmed" />
            </dl>
          </ProfileSection>
          <ProfileSection heading="Products">
            <div className="linked-product-list">
              {organisationProducts.map((product) => (
                <Link href={`/products/${product.slug}`} key={product.id}>
                  <span><strong>{product.name}</strong><small>{product.category}</small></span>
                  <span>{product.deploymentCountries.length} evidenced countries →</span>
                </Link>
              ))}
            </div>
          </ProfileSection>
          <ProfileSection heading="Evidenced African presence">
            <p>
              {organisationDeployments.length} candidate deployment records in
              Nigeria. Claimed presence is not added to this total.
            </p>
            <Link href={`/directory?country=NG`}>View filtered Directory →</Link>
          </ProfileSection>
          <ProfileSection heading="Organisation history">
            <p>No sourced rename, merger or acquisition history is recorded in this candidate batch.</p>
          </ProfileSection>
        </article>
        <aside className="record-rail">
          <div className="rail-card">
            <span className="eyebrow">Public website</span>
            <a href={organisation.website} rel="noreferrer" target="_blank">{organisation.website.replace("https://", "")} ↗</a>
          </div>
          <div className="rail-card">
            <span className="eyebrow">Important distinction</span>
            <strong>Claiming is not verification</strong>
            <p>Claiming a profile allows sourced corrections to be proposed. It does not verify deployment claims.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

export function CountryProfile({ iso2 }: { iso2: string }) {
  const countryIso2 = iso2.toUpperCase();
  if (countryIso2 !== "NG") {
    return (
      <main className="reading-page reading-width" id="main-content">
        <span className="eyebrow">Country record</span>
        <h1>{countryIso2}</h1>
        <div className="inline-empty">
          <strong>No country summary in the prototype dataset.</strong>
          <p>
            This is an unknown research state, not evidence of zero deployments.
          </p>
          <Link href="/deployments">Return to Deployments →</Link>
        </div>
      </main>
    );
  }
  const countryDeployments = deployments.filter(
    (deployment) => deployment.countryIso2 === "NG",
  );
  return (
    <main className="profile-page profile-width" id="main-content">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/deployments">Deployments</Link><span aria-hidden="true">/</span><span>Nigeria</span>
      </nav>
      <header className="record-header country-record-header">
        <div>
          <span className="eyebrow">Country record · candidate evidence</span>
          <h1>Nigeria</h1>
          <p>
            Evidence-led software index. This page is not a complete energy-market
            or regulatory profile.
          </p>
        </div>
        <div className="country-stat-row">
          <Stat value="4" label="Deployments" />
          <Stat value="3" label="Products" />
          <Stat value="2" label="Categories" />
        </div>
      </header>
      <div className="record-layout">
        <article className="record-main">
          <ProfileSection heading="Category distribution">
            <div className="distribution-bars">
              <div><span>Distribution utility operations</span><i><b style={{ width: "50%" }} /></i><strong>2</strong></div>
              <div><span>PAYGo and mini-grid operations</span><i><b style={{ width: "50%" }} /></i><strong>2</strong></div>
            </div>
          </ProfileSection>
          <ProfileSection heading="Evidenced deployments">
            <div className="profile-deployment-list">
              {countryDeployments.map((deployment) => {
                const product = productById(deployment.productId);
                return (
                  <article key={deployment.id}>
                    <header>
                      <div><h3>{product?.name}</h3><span>{deployment.area}</span></div>
                      <LifecycleTag value={deployment.lifecycle} />
                    </header>
                    <dl>
                      <Fact label="Customer" value={deployment.customer} />
                      <Fact label="Year" value={deployment.year} />
                      <div><dt>Evidence</dt><dd><EvidenceStatusLabel status={deployment.evidence} /></dd></div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </ProfileSection>
          <ProfileSection heading="Research coverage">
            <p>
              Candidate sources include an official programme page, an AFD article
              and provider-authored product material. Coverage is not yet systematic
              across utilities, mini-grids or states.
            </p>
          </ProfileSection>
        </article>
        <aside className="record-rail">
          <div className="rail-card">
            <span className="eyebrow">Explore this country</span>
            <Link href="/deployments?country=NG">View in Deployments →</Link>
            <Link href="/directory?country=NG">View in Directory →</Link>
          </div>
          <div className="rail-card">
            <span className="eyebrow">Last country review</span>
            <strong>{release.date}</strong>
            <Link href="/contribute/deployment">Suggest missing deployment →</Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ProfileSection({
  children,
  heading,
}: {
  children: React.ReactNode;
  heading: string;
}) {
  return (
    <section className="profile-section">
      <h2>{heading}</h2>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><strong>{value}</strong><span>{label}</span></div>;
}

function NotFoundRecord({ type }: { type: string }) {
  return (
    <main className="reading-page reading-width" id="main-content">
      <span className="eyebrow">Record not found</span>
      <h1>No published {type} matched this address.</h1>
      <p>The record may have moved, merged or not yet completed editorial review.</p>
      <Link className="button button-primary" href="/directory">Search the Directory</Link>
    </main>
  );
}

function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function rootWebsite(url: string) {
  try {
    return new URL(url).origin + "/";
  } catch {
    return url;
  }
}
