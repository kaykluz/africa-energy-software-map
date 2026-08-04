import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import {
  africanCountries,
  assertions,
  categories,
  countrySummaries,
  deployments,
  organisationBySlug,
  organisationPresenceLabels,
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
import { OrganisationMark, ProductMark } from "@/components/brand-mark";
import {
  organisationAliases,
  organisationDirectory,
  organisationDirectoryRecord,
  organisationEcosystemGroups,
  organisationRoleName,
  publicOrganisationDescription,
  relatedOrganisations,
  organisationSegmentName,
  organisationSectorName,
  softwareStageName,
  type OrganisationDirectoryRecord,
} from "@/lib/organisation-data";
import { buildOrganisationProfileGraph } from "@/lib/organisation-graph";
import {
  organisationLinkIndex,
  resolveOrganisationHref,
  type ExactLinkIndex,
} from "@/lib/entity-links";

export function ProductProfile({
  directory = organisationDirectory,
  slug,
}: {
  directory?: OrganisationDirectoryRecord[];
  slug: string;
}) {
  const product = productBySlug(slug);
  if (!product) return <NotFoundRecord type="product" />;
  const productDeployments = deployments.filter(
    (deployment) => deployment.productId === product.id,
  );
  const organisation = organisations.find(
    (record) => record.id === product.organisationId,
  );
  const organisationLinks = organisationLinkIndex(directory);
  const ownerHref = resolveOrganisationHref(product.organisation, organisationLinks);
  const relatedSubjectIds = new Set([
    product.id,
    ...productDeployments.map((deployment) => deployment.id),
  ]);
  const relatedSourceIds = new Set(
    assertions
      .filter((assertion) => relatedSubjectIds.has(assertion.subjectId))
      .map((assertion) => assertion.sourceId),
  );

  return (
    <main className="profile-page profile-width" id="main-content" tabIndex={-1}>
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">Explore</Link><span aria-hidden="true">/</span>
        <Link href={`/?category=${product.categoryId}`}>{product.category}</Link>
        <span aria-hidden="true">/</span><span>{product.name}</span>
      </nav>
      <header className="record-header">
        <div>
          <ProductMark
            className="record-brand-mark"
            organisationId={product.organisationId}
            organisationName={product.organisation}
            productId={product.id}
            productName={product.name}
            size={88}
          />
          <span className="eyebrow">Reviewed product record</span>
          <h1>{product.name}</h1>
          {ownerHref ? (
            <Link className="record-owner" href={ownerHref}>{product.organisation}</Link>
          ) : <span className="record-owner">{product.organisation}</span>}
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
              <Fact label="Category" value={<Link href={`/?category=${product.categoryId}`}>{product.category}</Link>} />
              <Fact label="Access model" value={product.accessModel} />
              <Fact label="Lifecycle" value={capitalise(product.lifecycle)} />
              <Fact
                label="Launch year"
                value={product.launchedYear ?? "Not documented"}
              />
              <Fact
                label="Deployment countries"
                value={
                  product.deploymentCountries.length
                    ? <CountryIsoLinks iso2s={product.deploymentCountries} />
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
                        <h3><Link href={`/countries/${deployment.countryIso2.toLowerCase()}`}>{deployment.country}</Link></h3>
                        <span>{deployment.area}</span>
                      </div>
                      <LifecycleTag value={deployment.lifecycle} />
                    </header>
                    <dl>
                      <Fact
                        label="Customer"
                        value={<OrganisationNameLink
                          index={organisationLinks}
                          name={deployment.customer}
                          searchFallback={deployment.customerDisclosure === "named"}
                        />}
                      />
                      <Fact label="Year" value={deployment.year} />
                      <Fact
                        label="Disclosure"
                        value={disclosureLabel(
                          deployment.customerDisclosure,
                        )}
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
                <strong>No evidenced deployment in the current release.</strong>
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
                .filter((source) => relatedSourceIds.has(source.id))
                .map((source) => (
                  <article key={source.id}>
                    <div>
                      <span className="eyebrow">{source.independence}</span>
                      <h3><a href={source.url} rel="noreferrer" target="_blank">{source.title}</a></h3>
                      <p><OrganisationNameLink index={organisationLinks} name={source.publisher} /> · retrieved {source.retrieved}</p>
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
              <li><span className="mono">{release.date}</span><p>Published in reviewed release {release.version}.</p></li>
              <li><span className="mono">{product.lastChecked}</span><p>Source material last checked during editorial review.</p></li>
            </ol>
          </ProfileSection>
        </article>

        <aside className="record-rail">
          <div className="rail-card">
            <span className="eyebrow">Record status</span>
            <strong>{release.status}</strong>
            <p>
              Assertions in this record passed the release review gate. Evidence
              strength and unknown fields remain visible rather than being flattened.
            </p>
          </div>
          <div className="rail-card">
            <span className="eyebrow">Owning organisation</span>
            {organisation ? <Link href={`/organisations/${organisation.slug}`}><strong>{organisation.name}</strong></Link> : null}
            <p>{organisation?.description}</p>
            {organisation ? <Link href={`/organisations/${organisation.slug}`}>View organisation →</Link> : null}
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

export function OrganisationProfile({
  directory = organisationDirectory,
  directoryRecord: suppliedDirectoryRecord,
  slug,
}: {
  directory?: OrganisationDirectoryRecord[];
  directoryRecord?: OrganisationDirectoryRecord;
  slug: string;
}) {
  const organisation = suppliedDirectoryRecord?.organisation ?? organisationBySlug(slug);
  if (!organisation) return <NotFoundRecord type="organisation" />;
  const directoryRecord = suppliedDirectoryRecord ?? organisationDirectoryRecord(organisation.id);
  const organisationLinks = organisationLinkIndex(directory);
  const organisationDescription = publicOrganisationDescription(organisation.description);
  const graph = directoryRecord
    ? buildOrganisationProfileGraph(directoryRecord, directory)
    : null;
  const organisationProducts = graph?.canonicalProducts ?? products.filter(
    (product) => product.organisationId === organisation.id,
  );
  const organisationDeployments = graph?.deployments ?? [];
  const deploymentCountries = Array.from(
    new Set(organisationDeployments.map(({ deployment }) => deployment.country)),
  );
  const aliasNames = suppliedDirectoryRecord
    ? suppliedDirectoryRecord.aliases
    : organisationAliases(organisation.id).map((item) => item.alias);
  const corporateRelationships = relatedOrganisations(organisation.id);

  return (
    <main className="profile-page profile-width" id="main-content" tabIndex={-1}>
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/directory">Directory</Link><span aria-hidden="true">/</span>
        <span>{organisation.name}</span>
      </nav>
      <header className="record-header">
        <div>
          <OrganisationMark
            className="record-brand-mark"
            name={organisation.name}
            organisationId={organisation.id}
            size={88}
          />
          <span className="eyebrow">Reviewed organisation record</span>
          <h1>{organisation.name}</h1>
          {aliasNames.length ? (
            <p className="record-aliases">
              Also known as {aliasNames.join(", ")}
            </p>
          ) : null}
          {organisationDescription ? <p>{organisationDescription}</p> : null}
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
              <Fact label="Country of origin" value={<CountryNameLink name={organisation.countryOfOrigin} />} />
              <Fact label="Current headquarters" value={<CountryNameLink name={organisation.headquarters} />} />
              <Fact
                label="Provider profile confirmation"
                value={
                  organisation.providerProfileConfirmed
                    ? "Confirmed"
                    : "Not confirmed"
                }
              />
            </dl>
          </ProfileSection>
          {directoryRecord ? (
            <ProfileSection heading="Actor type and markets">
              <div className="organisation-profile-classification">
                <div>
                  <span>Specific roles</span>
                  <div>
                    {directoryRecord.roleIds.map((roleId) => (
                      <Link href={`/organisations?view=ecosystem&role=${roleId}`} key={roleId}>
                        {organisationRoleName(roleId)}
                        {roleId === directoryRecord.primaryRole.id ? " · primary" : ""}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <span>Actor type</span>
                  <div>
                    {directoryRecord.ecosystemGroupIds.map((groupId) => (
                      <Link href={`/organisations?view=ecosystem&group=${groupId}`} key={groupId}>
                        {organisationEcosystemGroups.find((item) => item.id === groupId)?.name ?? groupId}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <span>Broad sectors</span>
                  <div>
                    {directoryRecord.sectorIds.length ? directoryRecord.sectorIds.map((sectorId) => (
                      <Link href={`/organisations?view=ecosystem&sector=${sectorId}`} key={sectorId}>
                        {organisationSectorName(sectorId)}
                      </Link>
                    )) : <em>Not yet classified</em>}
                  </div>
                </div>
                {directoryRecord.segmentIds.length ? (
                  <div>
                    <span>Energy markets</span>
                    <div>
                      {directoryRecord.segmentIds.map((segmentId) => (
                        <Link href={`/organisations?view=ecosystem&segment=${segmentId}`} key={segmentId}>
                          {organisationSegmentName(segmentId)}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <small className="organisation-derived-note">
                Classifications come from reviewed organisation data or reviewed software relationships.
              </small>
            </ProfileSection>
          ) : null}
          {directoryRecord?.catalogueListings.length ? (
            <ProfileSection heading="Merged catalogue records">
              <div className="organisation-graph-list catalogue">
                {directoryRecord.catalogueListings.map((listing) => (
                  <article key={listing.id}>
                    <div>
                      <span>One canonical identity · catalogue record {listing.id}</span>
                      <h3>{listing.name}</h3>
                      <div className="organisation-catalogue-links">
                        {listing.roles.map((role) => (
                          <Link href={`/organisations?view=catalogue&role=${encodeURIComponent(role)}`} key={`role-${role}`}>{role}</Link>
                        ))}
                        {listing.segments.map((segment) => (
                          <Link href={`/organisations?view=catalogue&segment=${encodeURIComponent(segment)}`} key={`segment-${segment}`}>{segment}</Link>
                        ))}
                        {listing.technologies.map((technology) => (
                          <Link href={`/landscape?q=${encodeURIComponent(technology)}`} key={`technology-${technology}`}>{technology}</Link>
                        ))}
                        {listing.africanRegionsActive.includes("Africa-wide") ? (
                          <Link href="/organisations?view=catalogue&scope=africa_wide">Africa-wide coverage</Link>
                        ) : null}
                        {listing.countriesActive.map((country) => (
                          <span key={`country-${country}`}><CountryNameLink name={country} /></span>
                        ))}
                      </div>
                      {listing.parent ? (
                        <p>Parent / group · <OrganisationNameLink index={organisationLinks} name={listing.parent} searchFallback /></p>
                      ) : null}
                    </div>
                    <div>
                      <span>{listing.lastReviewed || "Review date not documented"}</span>
                      {listing.sourceUrls[0] ? <a href={listing.sourceUrls[0]} rel="noreferrer" target="_blank">Source ↗</a> : null}
                    </div>
                  </article>
                ))}
              </div>
              <small className="organisation-derived-note">
                Names and source-listed classifications from duplicate catalogue rows are retained here, but they resolve to this single organisation profile.
              </small>
            </ProfileSection>
          ) : null}
          <ProfileSection heading="Linked software">
            {organisationProducts.length ? (
              <div className="linked-product-list">
                {organisationProducts.map((product) => {
                  const productDeployments = graph?.deployments.filter(
                    ({ deployment }) => deployment.productId === product.id,
                  ).length ?? product.deploymentCountries.length;
                  const relationship = product.organisationId === organisation.id
                    ? "Owner"
                    : "Linked organisation";
                  return (
                <article key={product.id}>
                  <ProductMark
                    organisationId={product.organisationId}
                    organisationName={product.organisation}
                    productId={product.id}
                    productName={product.name}
                    size={38}
                  />
                  <span>
                    <Link href={`/products/${product.slug}`}><strong>{product.name}</strong></Link>
                    <small>
                      <Link href={`/directory?category=${product.categoryId}`}>{product.category}</Link>
                      {" · "}{relationship}
                    </small>
                  </span>
                  <Link href={`/products/${product.slug}`}>{productDeployments} deployment {productDeployments === 1 ? "record" : "records"} →</Link>
                </article>
                  );
                })}
              </div>
            ) : (
              <p>No reviewed software relationship is published for this organisation.</p>
            )}
            {graph?.catalogueSoftware.length ? (
              <div className="organisation-catalogue-software">
                <header>
                  <strong>Additional catalogue software</strong>
                  <span>{graph.catalogueSoftware.length} distinct listings</span>
                </header>
                {graph.catalogueSoftware.map((item) => (
                  <article key={item.id}>
                    <div>
                      <h3><Link href={item.href}>{item.name}</Link></h3>
                      <p>{item.summary || item.status}</p>
                      <div>
                        {item.categoryIds.map((categoryId) => {
                          const category = categories.find((value) => value.id === categoryId);
                          return category ? (
                            <Link href={`/landscape?q=${encodeURIComponent(category.name)}`} key={`category-${category.id}`}>{category.name}</Link>
                          ) : null;
                        })}
                        {item.stageIds.map((stageId) => (
                          <Link href={`/landscape?stage=${stageId}`} key={`stage-${stageId}`}>{softwareStageName(stageId)}</Link>
                        ))}
                        {item.sectorIds.map((sectorId) => (
                          <Link href={`/landscape?sector=${sectorId}`} key={`sector-${sectorId}`}>{organisationSectorName(sectorId)}</Link>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span>Catalogue · not yet canonical</span>
                      {item.website ? <a href={item.website} rel="noreferrer" target="_blank">Website ↗</a> : null}
                      {item.sourceUrls[0] ? <a href={item.sourceUrls[0]} rel="noreferrer" target="_blank">Source ↗</a> : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </ProfileSection>
          {directoryRecord?.stageIds.length ? (
            <ProfileSection heading="Software coverage">
              <div className="organisation-software-stages">
                {directoryRecord.stageIds.map((stageId) => (
                  <Link href={`/landscape?stage=${stageId}`} key={stageId}>{softwareStageName(stageId)}</Link>
                ))}
              </div>
            </ProfileSection>
          ) : null}
          <ProfileSection heading="African presence">
            {directoryRecord?.presenceRecords.length ? (
              <div className="organisation-presence-list">
                {directoryRecord.presenceRecords.map((presence) => {
                  const source = sources.find((item) => item.id === presence.sourceId);
                  const isCompanySource = source?.independenceClass === "provider_authored";
                  return (
                    <article key={presence.id}>
                      <div>
                        <h3><Link href={`/countries/${presence.countryIso2.toLowerCase()}`}>{presence.country}</Link></h3>
                        <p>{organisationPresenceLabels[presence.presenceType]} · {capitalise(presence.lifecycleStatus)}</p>
                      </div>
                      <div>
                        <EvidenceStatusLabel status={presence.evidenceStatus} />
                        {source ? (
                          <a href={source.url} rel="noreferrer" target="_blank">
                            {isCompanySource ? "Company source" : "View source"} ↗
                          </a>
                        ) : null}
                        <small>Checked {presence.lastChecked}</small>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : directoryRecord?.catalogueCountryIso2s.length ? (
              <div className="organisation-presence-list">
                {directoryRecord.catalogueCountryIso2s.map((countryIso2) => {
                  const country = africanCountries.find(([iso2]) => iso2 === countryIso2)?.[1] ?? countryIso2;
                  return (
                    <article key={countryIso2}>
                      <div>
                        <h3><Link href={`/countries/${countryIso2.toLowerCase()}`}>{country}</Link></h3>
                        <p>Documented catalogue coverage</p>
                      </div>
                      <div>
                        {directoryRecord.catalogueSourceUrl ? (
                          <a href={directoryRecord.catalogueSourceUrl} rel="noreferrer" target="_blank">View source ↗</a>
                        ) : null}
                        <small>Reviewed {organisation.lastChecked}</small>
                      </div>
                    </article>
                  );
                })}
                <small className="organisation-derived-note">
                  Catalogue coverage is not automatically a deployment, office or independently evidenced activity.
                </small>
              </div>
            ) : (
              <div className="inline-empty compact">
                <strong>No explicit organisation-presence record is published yet.</strong>
                <p>A company website can support a company-stated record. Independent and customer sources remain visibly stronger.</p>
                <Link href={`/contribute/organisation?organisation=${organisation.slug}`}>Add sourced presence →</Link>
              </div>
            )}
            <div className="organisation-software-presence">
              <strong>Software-linked footprint</strong>
              <p>
                {organisationDeployments.length} reviewed software deployment{" "}
                {organisationDeployments.length === 1 ? "record" : "records"}
                {deploymentCountries.length ? " across " : ""}
                {deploymentCountries.length ? <CountryNameLinks names={deploymentCountries} /> : " in the current release"}.
              </p>
              <Link href={`/directory?q=${encodeURIComponent(organisation.name)}`}>View software records →</Link>
            </div>
          </ProfileSection>
          {graph?.deployments.length ? (
            <ProfileSection heading="Deployments and parties">
              <div className="organisation-graph-list">
                {graph.deployments.map(({ deployment, product, relationshipLabels, source }) => (
                  <article key={deployment.id}>
                    <div>
                      <span>{relationshipLabels.join(" · ")}</span>
                      <h3>
                        {product ? <Link href={`/products/${product.slug}`}>{product.name}</Link> : deployment.id}
                      </h3>
                      <p>
                        <Link href={`/countries/${deployment.countryIso2.toLowerCase()}`}>{deployment.country}</Link>
                        {" · "}{deployment.year || "Year not documented"}
                        {" · "}<OrganisationNameLink
                          index={organisationLinks}
                          name={deployment.customer}
                          searchFallback={deployment.customerDisclosure === "named"}
                        />
                      </p>
                    </div>
                    <div>
                      <EvidenceStatusLabel status={deployment.evidence} />
                      {source ? <a href={source.url} rel="noreferrer" target="_blank">Source ↗</a> : null}
                    </div>
                  </article>
                ))}
              </div>
            </ProfileSection>
          ) : null}
          {graph && (graph.projectFocus.length || graph.researchLeads.length) ? (
            <ProfileSection heading="Projects and deployment leads">
              {graph.projectFocus.length ? (
                <div className="organisation-project-focus">
                  {graph.projectFocus.map((focus) => <span key={focus}>{focus}</span>)}
                </div>
              ) : null}
              {graph.researchLeads.length ? (
                <div className="organisation-graph-list catalogue">
                  {graph.researchLeads.map((lead) => (
                    <article key={lead.id}>
                      <div>
                        <span>Catalogue lead · {lead.relationshipLabels.join(" · ")}</span>
                        <h3><Link href={`/landscape?q=${encodeURIComponent(lead.product || lead.name)}`}>{lead.name}</Link></h3>
                        <p>
                          {[lead.product, lead.customer, lead.countries.join(", "), lead.date]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <div>
                        <span>Requires project-level review</span>
                        {lead.sourceUrls[0] ? <a href={lead.sourceUrls[0]} rel="noreferrer" target="_blank">Source ↗</a> : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
              <small className="organisation-derived-note">
                Catalogue leads and portfolio descriptions stay separate from reviewed named projects, transactions and operational deployments.
              </small>
            </ProfileSection>
          ) : null}
          {graph?.relatedParties.length ? (
            <ProfileSection heading="Related parties">
              <div className="organisation-party-grid">
                {graph.relatedParties.map(({ organisation: related, labels }) => (
                  <article key={related.id}>
                    <OrganisationMark name={related.name} organisationId={related.id} size={38} />
                    <div>
                      <h3><Link href={`/organisations/${related.slug}`}>{related.name}</Link></h3>
                      <p>{labels.join(" · ")}</p>
                    </div>
                    <Link aria-label={`Open ${related.name}`} href={`/organisations/${related.slug}`}>→</Link>
                  </article>
                ))}
              </div>
            </ProfileSection>
          ) : null}
          <ProfileSection heading="Organisation history">
            {corporateRelationships.length || graph?.historyLeads.length ? (
              <div className="source-list">
                {corporateRelationships.map(({ record, organisation: related, label }) => (
                  <article key={record.id}>
                    <div>
                      <span>{label}</span>
                      <h3><Link href={`/organisations/${related.slug}`}>{related.name}</Link></h3>
                      <p>
                        {record.validFrom ? `From ${record.validFrom}` : "Start date not documented"}
                        {record.validTo ? ` · to ${record.validTo}` : ""}
                      </p>
                    </div>
                    <div>
                      <Link href={`/organisations/${related.slug}`}>View profile →</Link>
                      {sources
                        .filter((source) => assertions.some(
                          (assertion) =>
                            assertion.subjectType === "organisation_relationship" &&
                            assertion.subjectId === record.id &&
                            assertion.sourceId === source.id,
                        ))
                        .slice(0, 1)
                        .map((source) => (
                          <a href={source.url} key={source.id} rel="noreferrer" target="_blank">
                            Source ↗
                          </a>
                        ))}
                    </div>
                  </article>
                ))}
                {graph?.historyLeads.map((lead) => (
                  <article key={lead.id}>
                    <div>
                      <span>Relationship catalogue lead</span>
                      <h3>{lead.name}</h3>
                      <p>{[lead.event, lead.date].filter(Boolean).join(" · ")}</p>
                    </div>
                    {lead.sourceUrls[0] ? (
                      <a href={lead.sourceUrls[0]} rel="noreferrer" target="_blank">Source ↗</a>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p>No sourced rename, merger or acquisition history is recorded in the current release.</p>
            )}
          </ProfileSection>
          {graph?.sources.length ? (
            <ProfileSection heading="Sources">
              <div className="organisation-source-ledger">
                {graph.sources.map((source) => (
                  <article key={source.id}>
                    <div>
                      <span>{source.contexts.join(" · ")}</span>
                      <h3><a href={source.url} rel="noreferrer" target="_blank">{source.title}</a></h3>
                      <p>
                        <OrganisationNameLink index={organisationLinks} name={source.publisher} />
                        {" · "}{source.independence}
                      </p>
                    </div>
                    <a href={source.url} rel="noreferrer" target="_blank">Open ↗</a>
                  </article>
                ))}
              </div>
            </ProfileSection>
          ) : null}
        </article>
        <aside className="record-rail">
          {organisation.website ? (
            <div className="rail-card">
              <span className="eyebrow">Public website</span>
              <a href={organisation.website} rel="noreferrer" target="_blank">{organisation.website.replace("https://", "")} ↗</a>
            </div>
          ) : null}
          {directoryRecord?.catalogueSourceUrl ? (
            <div className="rail-card">
              <span className="eyebrow">Canonical source</span>
              <a href={directoryRecord.catalogueSourceUrl} rel="noreferrer" target="_blank">Open reviewed source ↗</a>
              <p>Accepted through the human review workspace.</p>
            </div>
          ) : null}
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

export function CountryProfile({
  directory = organisationDirectory,
  iso2,
}: {
  directory?: OrganisationDirectoryRecord[];
  iso2: string;
}) {
  const countryIso2 = iso2.toUpperCase();
  const countryName =
    africanCountries.find(([code]) => code === countryIso2)?.[1] ??
    countryIso2;
  const summary = countrySummaries.find(
    (item) => item.countryIso2 === countryIso2,
  );
  const countryOrganisationRecords = directory.filter((record) =>
    record.countryIso2s.includes(countryIso2),
  );
  const organisationLinks = organisationLinkIndex(directory);
  if (!summary && !countryOrganisationRecords.length) {
    return (
      <main className="reading-page reading-width" id="main-content" tabIndex={-1}>
        <span className="eyebrow">Country record</span>
        <h1>{countryName}</h1>
        <div className="inline-empty">
          <strong>No country summary in the current release.</strong>
          <p>
            This is an unknown research state, not evidence of zero deployments.
          </p>
          <Link href="/deployments">Return to Map →</Link>
        </div>
      </main>
    );
  }
  const countryDeployments = deployments.filter(
    (deployment) => deployment.countryIso2 === countryIso2,
  );
  const categoryRows = Object.entries(summary?.categoryCounts ?? {})
    .map(([categoryId, count]) => ({
      category: categories.find((item) => item.id === categoryId),
      count,
    }))
    .filter((item) => item.category)
    .sort((a, b) => b.count - a.count);
  const maxCategoryCount = Math.max(
    1,
    ...categoryRows.map((item) => item.count),
  );
  const countrySourceCount = new Set(
    countryDeployments.map((deployment) => deployment.sourceId),
  );
  return (
    <main className="profile-page profile-width" id="main-content" tabIndex={-1}>
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/deployments">Map</Link><span aria-hidden="true">/</span><span>{countryName}</span>
      </nav>
      <header className="record-header country-record-header">
        <div>
          <span className="eyebrow">Reviewed country evidence</span>
          <h1>{countryName}</h1>
          <p>
            Evidence-led software index. This page is not a complete energy-market
            or regulatory profile.
          </p>
        </div>
        <div className="country-stat-row">
          <Stat value={String(summary?.deploymentCount ?? 0)} label="Deployments" />
          <Stat value={String(summary?.productCount ?? 0)} label="Products" />
          <Stat value={String(countryOrganisationRecords.length)} label="Organisations" />
        </div>
      </header>
      <div className="record-layout">
        <article className="record-main">
          {categoryRows.length ? (
            <ProfileSection heading="Category distribution">
              <div className="distribution-bars">
                {categoryRows.map(({ category, count }) => (
                  <div key={category?.id}>
                    {category ? <Link href={`/directory?category=${category.id}&country=${countryIso2}`}>{category.name}</Link> : null}
                    <i><b style={{ width: `${(count / maxCategoryCount) * 100}%` }} /></i>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            </ProfileSection>
          ) : null}
          <ProfileSection heading="Evidenced deployments">
            <div className="profile-deployment-list">
              {countryDeployments.map((deployment) => {
                const product = productById(deployment.productId);
                return (
                  <article key={deployment.id}>
                    <header>
                      <div className="profile-deployment-product">
                        {product ? (
                          <ProductMark
                            organisationId={product.organisationId}
                            organisationName={product.organisation}
                            productId={product.id}
                            productName={product.name}
                            size={36}
                          />
                        ) : null}
                        <div>{product ? <h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3> : null}<small>{deployment.area}</small></div>
                      </div>
                      <LifecycleTag value={deployment.lifecycle} />
                    </header>
                    <dl>
                      <Fact
                        label="Customer"
                        value={<OrganisationNameLink
                          index={organisationLinks}
                          name={deployment.customer}
                          searchFallback={deployment.customerDisclosure === "named"}
                        />}
                      />
                      <Fact label="Year" value={deployment.year} />
                      <div><dt>Evidence</dt><dd><EvidenceStatusLabel status={deployment.evidence} /></dd></div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </ProfileSection>
          <ProfileSection heading="Organisations">
            {countryOrganisationRecords.length ? (
              <div className="country-organisation-list">
                {countryOrganisationRecords.map((record) => {
                  const presences = record.presenceRecords.filter(
                    (item) => item.countryIso2 === countryIso2,
                  );
                  const labels = Array.from(new Set(
                    presences.map((item) => organisationPresenceLabels[item.presenceType]),
                  ));
                  const companyStatedOnly =
                    record.companyStatedCountryIso2s.includes(countryIso2) &&
                    !record.evidencedCountryIso2s.includes(countryIso2);
                  const catalogueListed = record.catalogueCountryIso2s.includes(countryIso2);
                  return (
                    <article key={record.organisation.id}>
                      <OrganisationMark name={record.organisation.name} organisationId={record.organisation.id} size={38} />
                      <div>
                        <h3><Link href={`/organisations/${record.organisation.slug}`}>{record.organisation.name}</Link></h3>
                        <p>{labels.length ? labels.join(" · ") : catalogueListed ? "Documented catalogue coverage" : "Software deployment linked"}</p>
                      </div>
                      <span>{companyStatedOnly ? "Company-stated" : presences.length ? "Evidenced" : catalogueListed ? "Canonical listing" : "Software-linked"}</span>
                    </article>
                  );
                })}
              </div>
            ) : <p>No organisation-presence record is published for this country yet.</p>}
            <Link href={`/organisations?view=ecosystem&country=${countryIso2}`}>View filtered organisations →</Link>
          </ProfileSection>
          <ProfileSection heading="Research coverage">
            <p>
              {countrySourceCount.size} source-linked reviewed{" "}
              {countrySourceCount.size === 1
                ? "record supports"
                : "records support"}{" "}
              this country view. Coverage is not yet systematic across operators
              or regions.
            </p>
          </ProfileSection>
        </article>
        <aside className="record-rail">
          <div className="rail-card">
            <span className="eyebrow">Explore this country</span>
            <Link href={`/deployments?country=${countryIso2}`}>View in Map →</Link>
            <Link href={`/directory?country=${countryIso2}`}>View in Data →</Link>
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

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><strong>{value}</strong><span>{label}</span></div>;
}

function NotFoundRecord({ type }: { type: string }) {
  return (
    <main className="reading-page reading-width" id="main-content" tabIndex={-1}>
      <span className="eyebrow">Record not found</span>
      <h1>No published {type} matched this address.</h1>
      <p>The record may have moved, merged or not yet completed editorial review.</p>
      <Link className="button button-primary" href="/directory">Search the data</Link>
    </main>
  );
}

function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function disclosureLabel(
  value: "named" | "undisclosed" | "unknown" | "confidential",
) {
  return {
    named: "Named customer",
    undisclosed: "Customer undisclosed",
    unknown: "Customer not documented",
    confidential: "Customer confidential",
  }[value];
}

function CountryIsoLinks({ iso2s }: { iso2s: string[] }) {
  return iso2s.map((iso2, index) => (
    <Fragment key={iso2}>
      {index ? ", " : null}
      <Link href={`/countries/${iso2.toLowerCase()}`}>
        {africanCountries.find(([countryIso2]) => countryIso2 === iso2)?.[1] ?? iso2}
      </Link>
    </Fragment>
  ));
}

function CountryNameLink({ name }: { name: string }) {
  const country = africanCountries.find(([, countryName]) => countryName === name);
  return country ? <Link href={`/countries/${country[0].toLowerCase()}`}>{name}</Link> : <>{name}</>;
}

function OrganisationNameLink({
  index,
  name,
  searchFallback = false,
}: {
  index: ExactLinkIndex;
  name: string;
  searchFallback?: boolean;
}) {
  const href = resolveOrganisationHref(name, index);
  if (href) return <Link href={href}>{name}</Link>;
  if (searchFallback && name && !/not disclosed|not documented|confidential|unknown/i.test(name)) {
    return <Link href={`/organisations?q=${encodeURIComponent(name)}`}>{name}</Link>;
  }
  return <>{name}</>;
}

function CountryNameLinks({ names }: { names: string[] }) {
  return names.map((name, index) => (
    <Fragment key={name}>
      {index ? ", " : null}
      <CountryNameLink name={name} />
    </Fragment>
  ));
}
