import {
  assertions,
  deployments,
  organisationAliasRecords,
  organisationPresenceRecords,
  organisationRelationshipRecords,
  organisationRoleRecords,
  organisationSectorRecords,
  organisationSegmentRecords,
  organisationSoftwareRelationshipRecords,
  productById,
  sources,
  type Deployment,
  type Product,
  type Source,
} from "@/lib/registry-data";
import {
  landscapeDeploymentLeads,
  landscapeItems,
  landscapeRelationships,
  type LandscapeKind,
} from "@/lib/landscape-data";
import {
  normaliseEntityKey,
  organisationLinkIndex,
  resolveOrganisationHref,
  resolveProductHref,
} from "@/lib/entity-links";
import type { OrganisationDirectoryRecord } from "@/lib/organisation-data";

export type OrganisationGraphDeployment = {
  deployment: Deployment;
  product?: Product;
  relationshipLabels: string[];
  source?: Source;
};

export type OrganisationGraphCatalogueSoftware = {
  id: string;
  name: string;
  kind: LandscapeKind;
  summary: string;
  status: string;
  href: string;
  website: string;
  categoryIds: string[];
  stageIds: string[];
  sectorIds: string[];
  sourceUrls: string[];
  mergedListingCount: number;
};

export type OrganisationGraphResearchLead = {
  id: string;
  name: string;
  product: string;
  customer: string;
  countries: string[];
  date: string;
  sourceUrls: string[];
  relationshipLabels: string[];
};

export type OrganisationGraphHistoryLead = {
  id: string;
  name: string;
  event: string;
  date: string;
  sourceUrls: string[];
};

export type OrganisationGraphSource = {
  id: string;
  url: string;
  title: string;
  publisher: string;
  independence: string;
  retrieved: string;
  contexts: string[];
};

export type OrganisationGraphParty = {
  organisation: OrganisationDirectoryRecord["organisation"];
  labels: string[];
};

export type OrganisationProfileGraph = {
  canonicalProducts: Product[];
  catalogueSoftware: OrganisationGraphCatalogueSoftware[];
  deployments: OrganisationGraphDeployment[];
  researchLeads: OrganisationGraphResearchLead[];
  historyLeads: OrganisationGraphHistoryLead[];
  projectFocus: string[];
  relatedParties: OrganisationGraphParty[];
  sources: OrganisationGraphSource[];
};

export function buildOrganisationProfileGraph(
  record: OrganisationDirectoryRecord,
  directory: OrganisationDirectoryRecord[],
): OrganisationProfileGraph {
  const currentHref = `/organisations/${record.organisation.slug}`;
  const organisationLinks = organisationLinkIndex(directory);
  const canonicalProducts = uniqueBy(record.ownedProducts, (product) => product.id);
  const canonicalProductIds = new Set(canonicalProducts.map((product) => product.id));
  const directlyOwnedProductIds = new Set(
    canonicalProducts
      .filter((product) => product.organisationId === record.organisation.id)
      .map((product) => product.id),
  );

  const canonicalDeployments = deployments.filter((deployment) =>
    canonicalProductIds.has(deployment.productId),
  );
  const customerDeployments = deployments.filter(
    (deployment) =>
      deployment.customerDisclosure === "named" &&
      resolveOrganisationHref(deployment.customer, organisationLinks) === currentHref,
  );
  const graphDeployments = uniqueBy(
    [...canonicalDeployments, ...customerDeployments],
    (deployment) => deployment.id,
  ).map((deployment): OrganisationGraphDeployment => {
    const product = productById(deployment.productId);
    const labels: string[] = [];
    if (directlyOwnedProductIds.has(deployment.productId)) labels.push("Software owner");
    if (
      canonicalProductIds.has(deployment.productId) &&
      !directlyOwnedProductIds.has(deployment.productId)
    ) labels.push("Linked software party");
    if (resolveOrganisationHref(deployment.customer, organisationLinks) === currentHref) {
      labels.push("Customer");
    }
    return {
      deployment,
      product,
      relationshipLabels: labels,
      source: sources.find((source) => source.id === deployment.sourceId),
    };
  });

  const landscapeForOrganisation = landscapeItems.filter((item) =>
    Boolean(item.parent) &&
    resolveOrganisationHref(item.parent ?? "", organisationLinks) === currentHref,
  );
  const unresolvedLandscapeSoftware = landscapeForOrganisation.filter((item) => {
    if (!["product", "public_tool", "research_lead"].includes(item.kind)) return false;
    const resolved = resolveProductHref(item.name);
    return !resolved || !canonicalProducts.some((product) => resolved === `/products/${product.slug}`);
  });
  const catalogueSoftware = mergeCatalogueSoftware(unresolvedLandscapeSoftware);

  const researchLeads = landscapeDeploymentLeads.flatMap((lead) => {
    const labels: string[] = [];
    if (resolveOrganisationHref(lead.organisation, organisationLinks) === currentHref) {
      labels.push("Organisation");
    }
    if (
      lead.customerAsSubmitted &&
      resolveOrganisationHref(lead.customerAsSubmitted, organisationLinks) === currentHref
    ) labels.push("Customer");
    const resolvedProduct = resolveProductHref(lead.product);
    if (
      resolvedProduct &&
      canonicalProducts.some((product) => resolvedProduct === `/products/${product.slug}`)
    ) labels.push("Linked software");
    if (!labels.length) return [];
    return [{
      id: lead.id,
      name: lead.name,
      product: lead.product,
      customer: lead.customerAsSubmitted,
      countries: lead.countries,
      date: lead.dateAsSubmitted,
      sourceUrls: sourceUrls(lead.sourceUrls, lead.sourceDomains),
      relationshipLabels: labels,
    }];
  });

  const historyLeads = landscapeRelationships.flatMap((lead) =>
    resolveOrganisationHref(lead.subject, organisationLinks) === currentHref
      ? [{
          id: lead.id,
          name: lead.name,
          event: lead.eventAsSubmitted,
          date: lead.dateAsSubmitted,
          sourceUrls: sourceUrls(undefined, lead.sourceDomains),
        }]
      : [],
  );

  const subjectIds = new Set([
    record.organisation.id,
    ...canonicalProductIds,
    ...graphDeployments.map(({ deployment }) => deployment.id),
    ...organisationAliasRecords
      .filter((item) => item.organisationId === record.organisation.id)
      .map((item) => item.id),
    ...organisationRelationshipRecords
      .filter((item) =>
        item.organisationId === record.organisation.id ||
        item.relatedOrganisationId === record.organisation.id,
      )
      .map((item) => item.id),
    ...organisationRoleRecords
      .filter((item) => item.organisationId === record.organisation.id)
      .map((item) => item.id),
    ...organisationSectorRecords
      .filter((item) => item.organisationId === record.organisation.id)
      .map((item) => item.id),
    ...organisationSegmentRecords
      .filter((item) => item.organisationId === record.organisation.id)
      .map((item) => item.id),
    ...organisationSoftwareRelationshipRecords
      .filter((item) => item.organisationId === record.organisation.id)
      .map((item) => item.id),
    ...organisationPresenceRecords
      .filter((item) => item.organisationId === record.organisation.id)
      .map((item) => item.id),
  ]);
  const canonicalSourceIds = new Set(
    assertions
      .filter((assertion) => subjectIds.has(assertion.subjectId))
      .map((assertion) => assertion.sourceId),
  );
  graphDeployments.forEach(({ deployment }) => canonicalSourceIds.add(deployment.sourceId));

  const sourceContexts = new Map<string, { url: string; contexts: Set<string> }>();
  const addSourceContext = (url: string, context: string) => {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    const key = sourceIdentityKey(normalized);
    const current = sourceContexts.get(key) ?? {
      url: normalized,
      contexts: new Set<string>(),
    };
    current.contexts.add(context);
    sourceContexts.set(key, current);
  };
  for (const source of sources.filter((item) => canonicalSourceIds.has(item.id))) {
    addSourceContext(source.url, "Reviewed assertion");
  }
  if (record.organisation.website) addSourceContext(record.organisation.website, "Official website");
  for (const url of record.catalogueSourceUrls) addSourceContext(url, "Organisation catalogue");
  for (const listing of record.catalogueListings) {
    if (listing.website) addSourceContext(listing.website, "Official website");
  }
  for (const item of landscapeForOrganisation) {
    if (item.websiteAsSubmitted) addSourceContext(item.websiteAsSubmitted, "Software website");
    for (const url of sourceUrls(item.sourceUrls, item.sourceDomains)) {
      addSourceContext(url, "Software catalogue");
    }
  }
  for (const lead of researchLeads) {
    for (const url of lead.sourceUrls) addSourceContext(url, "Deployment research lead");
  }
  for (const lead of historyLeads) {
    for (const url of lead.sourceUrls) addSourceContext(url, "Relationship research lead");
  }

  const canonicalSourceByUrl = new Map(
    sources.map((source) => [sourceIdentityKey(normalizeUrl(source.url)), source]),
  );
  const graphSources = Array.from(sourceContexts.entries()).map(([key, entry], index) => {
    const source = canonicalSourceByUrl.get(key);
    const url = source?.url ?? entry.url;
    return {
      id: source?.id ?? `external_${index}_${normaliseEntityKey(url).slice(0, 32)}`,
      url,
      title: source?.title ?? sourceTitle(url),
      publisher: source?.publisher ?? sourceHost(url),
      independence: source?.independence ?? contextIndependence(entry.contexts),
      retrieved: source?.retrieved ?? "Catalogue date",
      contexts: Array.from(entry.contexts).sort(),
    };
  }).sort((left, right) => left.title.localeCompare(right.title));

  const partyLabels = new Map<string, Set<string>>();
  const addParty = (href: string | undefined, label: string) => {
    if (!href || href === currentHref) return;
    const current = partyLabels.get(href) ?? new Set<string>();
    current.add(label);
    partyLabels.set(href, current);
  };
  for (const { deployment, product } of graphDeployments) {
    addParty(resolveOrganisationHref(deployment.customer, organisationLinks), "Customer");
    if (product) addParty(resolveOrganisationHref(product.organisation, organisationLinks), "Software provider");
  }
  for (const listing of record.catalogueListings) {
    addParty(resolveOrganisationHref(listing.parent, organisationLinks), "Catalogue parent or group");
  }
  for (const source of graphSources) {
    addParty(resolveOrganisationHref(source.publisher, organisationLinks), "Source publisher");
  }
  const relatedParties = Array.from(partyLabels.entries()).flatMap(([href, labels]) => {
    const organisation = directory.find(
      (item) => `/organisations/${item.organisation.slug}` === href,
    )?.organisation;
    return organisation ? [{ organisation, labels: Array.from(labels).sort() }] : [];
  }).sort((left, right) => left.organisation.name.localeCompare(right.organisation.name));

  return {
    canonicalProducts,
    catalogueSoftware,
    deployments: graphDeployments,
    researchLeads,
    historyLeads,
    projectFocus: Array.from(new Set(
      record.catalogueListings.map((item) => item.projectFocus).filter(Boolean),
    )).sort(),
    relatedParties,
    sources: graphSources,
  };
}

function mergeCatalogueSoftware(
  items: Array<(typeof landscapeItems)[number]>,
): OrganisationGraphCatalogueSoftware[] {
  const groups = new Map<string, Array<(typeof landscapeItems)[number]>>();
  for (const item of items) {
    const key = normaliseEntityKey(item.name);
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  }
  return Array.from(groups.values()).map((group) => {
    const item = group[0];
    return {
      id: item.id,
      name: item.name,
      kind: item.kind,
      summary: group.map((value) => value.summaryAsSubmitted).find(Boolean) ?? "",
      status: group.map((value) => value.statusAsSubmitted).find(Boolean) ?? "Catalogue listing",
      href: `/landscape?q=${encodeURIComponent(item.name)}`,
      website: normalizeUrl(
        group.map((value) => value.websiteAsSubmitted ?? "").find(Boolean) ?? "",
      ),
      categoryIds: unique(group.flatMap((value) => value.categoryIds)),
      stageIds: unique(group.flatMap((value) => value.stageIds)),
      sectorIds: unique(group.flatMap((value) => value.sectorIds)),
      sourceUrls: unique(group.flatMap((value) => sourceUrls(value.sourceUrls, value.sourceDomains))),
      mergedListingCount: group.length,
    };
  }).sort((left, right) => left.name.localeCompare(right.name));
}

function sourceUrls(urls: string[] | undefined, domains: string[]) {
  return unique([
    ...(urls ?? []),
    ...domains.map((domain) => `https://${domain}`),
  ].map(normalizeUrl).filter(Boolean));
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function sourceIdentityKey(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.replace(/\/+$/, "") || "/";
    return `${host}${path}${url.search}`;
  } catch {
    return value;
  }
}

function sourceHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function sourceTitle(value: string) {
  const host = sourceHost(value);
  return host ? `${host} source` : "External source";
}

function contextIndependence(contexts: Set<string>) {
  return contexts.has("Official website") ? "Provider-authored" : "Catalogue source";
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function uniqueBy<T>(values: T[], key: (value: T) => string) {
  return Array.from(new Map(values.map((value) => [key(value), value])).values());
}
