import snapshotJson from "@/generated/registry-snapshot.json";

export type EvidenceStatus =
  | "provider_claim_only"
  | "public_source"
  | "independently_evidenced"
  | "customer_confirmed";

export type OriginClassification =
  | "africa_built"
  | "africa_founded_global_hq"
  | "global_deployed_in_africa"
  | "public_or_open_infrastructure";

export type ProductLifecycle =
  | "active"
  | "pilot"
  | "historical"
  | "acquired"
  | "merged"
  | "inactive"
  | "under_review";

export type DeploymentLifecycle =
  | "live"
  | "pilot"
  | "historical"
  | "ended"
  | "under_review";

export type Product = {
  id: string;
  name: string;
  slug: string;
  organisationId: string;
  organisation: string;
  description: string;
  categoryId: string;
  category: string;
  stageId: string;
  origin: OriginClassification;
  lifecycle: ProductLifecycle;
  accessModel: string;
  openSourceUrl?: string;
  website: string;
  launchedYear?: string;
  lastChecked: string;
  deploymentCountries: string[];
  evidence: EvidenceStatus[];
  capabilities: string[];
};

export type Deployment = {
  id: string;
  productId: string;
  countryIso2: string;
  country: string;
  area: string;
  customer: string;
  customerDisclosure: "named" | "undisclosed" | "unknown" | "confidential";
  lifecycle: DeploymentLifecycle;
  year: string;
  evidence: EvidenceStatus;
  sourceId: string;
  lastChecked: string;
};

export type Organisation = {
  id: string;
  name: string;
  slug: string;
  type: string;
  origin: string;
  countryOfOrigin: string;
  headquarters: string;
  lifecycle: string;
  website: string;
  description: string;
  lastChecked: string;
  providerProfileConfirmed: boolean;
};

export type Source = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  sourceType: string;
  independenceClass: string;
  independence: string;
  retrieved: string;
  sourceLicense: string;
  automationPermitted: boolean;
  notes: string;
};

export type Assertion = {
  id: string;
  subjectType: string;
  subjectId: string;
  predicate: string;
  value: string;
  sourceId: string;
  evidenceStatus: EvidenceStatus;
  reviewedBy: string;
  reviewedAt: string;
  validFrom: string;
  validTo: string;
  notes: string;
};

export type Category = {
  id: string;
  name: string;
  stageId: string;
  marketCondition:
    | "commercial_market"
    | "bundled_or_gated"
    | "donor_supported"
    | "structurally_thin"
    | "insufficient_evidence";
  verdict: string;
  researchState:
    | "published"
    | "research_queue"
    | "not_researched"
    | "no_verified_entry"
    | "structurally_thin";
};

type SnapshotData = {
  schemaVersion: string;
  release: {
    mode: "candidate" | "published";
    version: string;
    date: string;
    status: string;
    sourceBatch: string;
    sourceWorkbook: { filename: string; sha256: string };
  };
  reviewGate: {
    assertions: number;
    reviewedAssertions: number;
    unreviewedAssertions: number;
    unresolvedSources: number;
    publishable: boolean;
  };
  counts: {
    organisations: number;
    products: number;
    deployments: number;
    sources: number;
    assertions: number;
  };
  organisations: Array<{
    id: string;
    name: string;
    slug: string;
    organisationType: string;
    originClassification: OriginClassification;
    countryOfOriginIso2: string;
    headquartersCountryIso2: string;
    lifecycleStatus: ProductLifecycle;
    website: string;
    description: string;
    providerProfileConfirmed: boolean;
    lastCheckedAt: string;
  }>;
  products: Array<{
    id: string;
    organisationId: string;
    organisation: string;
    name: string;
    slug: string;
    description: string;
    categoryId: string;
    category: string;
    stageId: string;
    originClassification: OriginClassification;
    lifecycleStatus: ProductLifecycle;
    accessModel: string;
    openSourceUrl: string;
    website: string;
    launchedYear: string;
    lastCheckedAt: string;
    deploymentCountries: string[];
    evidenceStatuses: EvidenceStatus[];
    capabilities: string[];
  }>;
  deployments: Array<{
    id: string;
    productId: string;
    countryIso2: string;
    subnationalArea: string;
    customerName: string;
    customerDisclosure: Deployment["customerDisclosure"];
    lifecycleStatus: DeploymentLifecycle;
    startedYear: string;
    endedYear: string;
    locationPrecision: string;
    lastCheckedAt: string;
    evidenceStatus: EvidenceStatus;
    sourceId: string;
  }>;
  sources: Array<{
    id: string;
    url: string;
    title: string;
    publisher: string;
    sourceType: string;
    publicationDate: string;
    retrievedAt: string;
    archivedUrl: string;
    sourceLicense: string;
    independenceClass: string;
    automationPermitted: boolean;
    notes: string;
  }>;
  assertions: Assertion[];
  stages: Array<{ id: string; name: string; order: number }>;
  categories: Category[];
  countries: Array<{ iso2: string; name: string }>;
  countrySummaries: Array<{
    countryIso2: string;
    deploymentCount: number;
    independentOrCustomerCount: number;
    providerClaimCount: number;
    productCount: number;
    categoryCounts: Record<string, number>;
  }>;
  distributions: Array<{
    id: string;
    label: string;
    format: string;
    href: string;
  }>;
};

const snapshot = snapshotJson as unknown as SnapshotData;

export const evidenceLabels: Record<EvidenceStatus, string> = {
  provider_claim_only: "Provider claim",
  public_source: "Publicly sourced",
  independently_evidenced: "Independently evidenced",
  customer_confirmed: "Customer confirmed",
};

export const originLabels: Record<OriginClassification, string> = {
  africa_built: "Africa-built",
  africa_founded_global_hq: "Africa-founded, global HQ",
  global_deployed_in_africa: "Global, deployed in Africa",
  public_or_open_infrastructure: "Public or open infrastructure",
};

const countriesByIso2 = new Map(
  snapshot.countries.map((country) => [country.iso2, country.name]),
);

export const release = {
  version: snapshot.release.version,
  date: displayDate(snapshot.release.date),
  isoDate: snapshot.release.date,
  status: snapshot.release.status,
  mode: snapshot.release.mode,
};

export const registryManifest = {
  schemaVersion: snapshot.schemaVersion,
  sourceBatch: snapshot.release.sourceBatch,
  sourceWorkbook: snapshot.release.sourceWorkbook,
  reviewGate: snapshot.reviewGate,
  counts: snapshot.counts,
};

export const dataDistributions = snapshot.distributions;

export const organisations: Organisation[] = snapshot.organisations.map(
  (record) => ({
    id: record.id,
    name: record.name,
    slug: record.slug,
    type: labelValue(record.organisationType),
    origin: originLabels[record.originClassification],
    countryOfOrigin: countryName(record.countryOfOriginIso2),
    headquarters: countryName(record.headquartersCountryIso2),
    lifecycle: labelValue(record.lifecycleStatus),
    website: record.website,
    description: punctuate(record.description),
    lastChecked: displayDate(record.lastCheckedAt),
    providerProfileConfirmed: record.providerProfileConfirmed,
  }),
);

export const products: Product[] = snapshot.products.map((record) => ({
  id: record.id,
  name: record.name,
  slug: record.slug,
  organisationId: record.organisationId,
  organisation: record.organisation,
  description: punctuate(record.description.replaceAll(";", ",")),
  categoryId: record.categoryId,
  category: record.category,
  stageId: record.stageId,
  origin: record.originClassification,
  lifecycle: record.lifecycleStatus,
  accessModel: labelValue(record.accessModel),
  openSourceUrl: record.openSourceUrl || undefined,
  website: record.website,
  launchedYear: record.launchedYear || undefined,
  lastChecked: displayDate(record.lastCheckedAt),
  deploymentCountries: record.deploymentCountries,
  evidence: record.evidenceStatuses,
  capabilities: record.capabilities.map((value) => sentenceCase(value)),
}));

export const deployments: Deployment[] = snapshot.deployments.map((record) => ({
  id: record.id,
  productId: record.productId,
  countryIso2: record.countryIso2,
  country: countryName(record.countryIso2),
  area:
    record.locationPrecision === "country"
      ? "Country-level disclosure"
      : record.subnationalArea,
  customer: customerLabel(
    record.customerName,
    record.customerDisclosure,
  ),
  customerDisclosure: record.customerDisclosure,
  lifecycle: record.lifecycleStatus,
  year: record.startedYear,
  evidence: record.evidenceStatus,
  sourceId: record.sourceId,
  lastChecked: displayDate(record.lastCheckedAt),
}));

export const sources: Source[] = snapshot.sources.map((record) => ({
  id: record.id,
  title: record.title,
  publisher: record.publisher,
  url: record.url,
  sourceType: record.sourceType,
  independenceClass: record.independenceClass,
  independence: labelValue(record.independenceClass),
  retrieved: displayDate(record.retrievedAt),
  sourceLicense: record.sourceLicense,
  automationPermitted: record.automationPermitted,
  notes: record.notes,
}));

export const assertions = snapshot.assertions;
export const stages = snapshot.stages;
export const categories = snapshot.categories;
export const countrySummaries = snapshot.countrySummaries;
export const africanCountries = snapshot.countries.map(
  (country) => [country.iso2, country.name] as const,
);

export const productBySlug = (slug: string) =>
  products.find((product) => product.slug === slug);

export const productById = (id: string) =>
  products.find((product) => product.id === id);

export const organisationBySlug = (slug: string) =>
  organisations.find((organisation) => organisation.slug === slug);

export const registrySnapshot = {
  release,
  manifest: registryManifest,
  organisations,
  products,
  deployments,
  sources,
  assertions,
  stages,
  categories,
  countries: africanCountries,
  countrySummaries,
  distributions: dataDistributions,
} as const;

function countryName(iso2: string) {
  if (!iso2) return "Not publicly documented";
  return countriesByIso2.get(iso2) ?? iso2;
}

function displayDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "Not documented";
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${day} ${months[month - 1]} ${year}`;
}

function labelValue(value: string) {
  return value
    .replaceAll("_", " ")
    .replace("start up", "start-up")
    .replace("scale up", "scale-up")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .replace("Or ", "or ");
}

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function punctuate(value: string) {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function customerLabel(
  value: string,
  disclosure: Deployment["customerDisclosure"],
) {
  if (disclosure === "named" && value) return value;
  if (disclosure === "confidential") return "Customer confidential";
  if (disclosure === "undisclosed") return "Customer undisclosed";
  return "Customer not documented";
}
