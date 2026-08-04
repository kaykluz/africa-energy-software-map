import {
  buildOrganisationDirectoryRecord,
  organisationDirectory,
  type OrganisationDirectoryRecord,
} from "@/lib/organisation-data";
import {
  organisationCatalogueRecords,
  catalogueCanonicalIdentity,
  type OrganisationCatalogueRecord,
} from "@/lib/organisation-catalogue";
import {
  africanCountries,
  type Organisation,
} from "@/lib/registry-data";
import {
  listOrganisationCatalogueReviews,
  type OrganisationCatalogueReviewRecord,
} from "./organisation-catalogue-reviews";

export type CanonicalCataloguePromotion = {
  candidateId: string;
  decision: "accept" | "amend";
  directoryRecord: OrganisationDirectoryRecord;
  effectiveCatalogueRecord: OrganisationCatalogueRecord;
  reviewedAt: string;
  sourceUrl: string;
  version: number;
};

export type PublicOrganisationRegistry = {
  catalogueRecords: OrganisationCatalogueRecord[];
  canonicalDirectory: OrganisationDirectoryRecord[];
  promotions: CanonicalCataloguePromotion[];
};

const roleIds: Record<string, string> = {
  Developer: "org_role_developer_ipp",
  Enabler: "org_role_enabler",
  EPC: "org_role_epc",
  Financier: "org_role_financier",
  OEM: "org_role_oem_manufacturer",
  Operator: "org_role_operator",
  "Public Institution": "org_role_public_institution",
  "Software/Data": "org_role_software_data",
};

const segmentIds: Record<string, string> = {
  "C&I": "org_segment_commercial_industrial",
  "Carbon Markets": "org_segment_carbon_markets",
  "Clean Cooking": "org_segment_clean_cooking",
  "E-mobility": "org_segment_emobility",
  Efficiency: "org_segment_efficiency_demand",
  "Mini-grids": "org_segment_minigrids",
  "Productive Use": "org_segment_productive_use",
  "SHS/PAYGo": "org_segment_shs_paygo",
  Storage: "org_segment_energy_storage",
  "T&D": "org_segment_transmission_distribution",
  "Utility-scale": "org_segment_utility_generation",
};

const iso2ByCountry = new Map(
  africanCountries.map(([iso2, country]) => [normalise(country), iso2]),
);

export async function loadPublicOrganisationRegistry(): Promise<PublicOrganisationRegistry> {
  const reviews = await listOrganisationCatalogueReviews();
  const promotions = reviews.flatMap((review) => materialisePromotion(review));
  const promotionByCandidate = new Map(
    promotions.map((promotion) => [promotion.candidateId, promotion]),
  );
  const catalogueRecords = organisationCatalogueRecords.map(
    (record) => promotionByCandidate.get(record.id)?.effectiveCatalogueRecord ?? record,
  );
  const canonicalDirectory = [
    ...organisationDirectory,
    ...promotions.map((promotion) => promotion.directoryRecord),
  ].sort((left, right) =>
    left.organisation.name.localeCompare(right.organisation.name),
  );
  return { catalogueRecords, canonicalDirectory, promotions };
}

export async function canonicalOrganisationDirectoryBySlug(
  slug: string,
): Promise<OrganisationDirectoryRecord | undefined> {
  const registry = await loadPublicOrganisationRegistry();
  return registry.canonicalDirectory.find(
    (record) => record.organisation.slug === slug,
  );
}

function materialisePromotion(
  review: OrganisationCatalogueReviewRecord,
): CanonicalCataloguePromotion[] {
  if (!(["accept", "amend"] as const).includes(review.decision as "accept" | "amend")) {
    return [];
  }
  const candidate = organisationCatalogueRecords.find(
    (record) => record.id === review.candidateId,
  );
  if (!candidate || candidate.reconciliation.status === "reviewed_match") return [];

  const effective = applyAmendments(candidate, review);
  const canonicalIdentity = catalogueCanonicalIdentity(candidate);
  const website = safeUrl(effective.website);
  const sourceUrl = safeUrl(review.normalizedSourceUrl) || safeUrl(effective.sourceUrl) || website;
  const organisation: Organisation = {
    id: canonicalIdentity.organisationId,
    name: effective.name || candidate.name,
    slug: canonicalIdentity.slug,
    type: effective.organisationType || effective.primaryRole || "Organisation",
    origin: effective.africaHeadquartered
      ? "Africa-headquartered"
      : "International, active in Africa",
    countryOfOrigin: "Not publicly documented",
    headquarters: effective.headquartersCountry || "Not publicly documented",
    lifecycle: effective.lifecycle || "Not publicly documented",
    website,
    description: effective.description,
    lastChecked: displayDate(review.updatedAt || review.reviewedAt),
    providerProfileConfirmed: false,
  };
  const mappedRoles = unique([
    effective.primaryRole,
    ...effective.roles,
  ].map((role) => roleIds[role]).filter(Boolean));
  const mappedSegments = unique(
    effective.segments.map((segment) => segmentIds[segment]).filter(Boolean),
  );
  const catalogueCountryIso2s = unique(
    effective.countriesActive
      .map((country) => iso2ByCountry.get(normalise(country)) ?? "")
      .filter(Boolean),
  );
  const directoryRecord = buildOrganisationDirectoryRecord(organisation, {
    aliases: effective.aliases,
    catalogueCandidateId: candidate.id,
    catalogueCountryIso2s,
    catalogueSourceUrl: sourceUrl,
    canonicalReviewVersion: review.version,
    roleIds: mappedRoles.length ? mappedRoles : ["org_role_to_classify"],
    segmentIds: mappedSegments,
  });
  return [{
    candidateId: candidate.id,
    decision: review.decision as "accept" | "amend",
    directoryRecord,
    effectiveCatalogueRecord: {
      ...effective,
      reconciliation: {
        status: "reviewed_match",
        canonicalOrganisationId: canonicalIdentity.organisationId,
        canonicalHref: canonicalIdentity.href,
      },
      reviewState: "reviewed",
      sourceUrl,
      website,
    },
    reviewedAt: review.reviewedAt,
    sourceUrl,
    version: review.version,
  }];
}

function applyAmendments(
  candidate: OrganisationCatalogueRecord,
  review: OrganisationCatalogueReviewRecord,
): OrganisationCatalogueRecord {
  const amendments = review.decision === "amend" ? review.amendments : {};
  const stringValue = (field: keyof typeof amendments, fallback: string) =>
    amendments[field]?.trim() || fallback;
  const listValue = (field: keyof typeof amendments, fallback: string[]) => {
    const value = amendments[field];
    return value === undefined ? fallback : splitList(value);
  };
  const countriesActive = listValue("countriesActive", candidate.countriesActive);
  return {
    ...candidate,
    aliases: listValue("aliases", candidate.aliases),
    parent: stringValue("parent", candidate.parent),
    organisationType: stringValue("organisationType", candidate.organisationType),
    primaryRole: stringValue("primaryRole", candidate.primaryRole),
    roles: listValue("roles", candidate.roles),
    headquartersCity: stringValue("headquartersCity", candidate.headquartersCity),
    headquartersCountry: stringValue("headquartersCountry", candidate.headquartersCountry),
    countriesActive,
    countryCount: countriesActive.length,
    segments: listValue("segments", candidate.segments),
    lifecycle: stringValue("lifecycle", candidate.lifecycle),
    name: stringValue("name", candidate.name),
    website: stringValue("website", candidate.website),
    description: stringValue("description", candidate.description),
    sourceUrl: stringValue("sourceUrl", candidate.sourceUrl),
    confidence: stringValue("confidence", candidate.confidence),
    coverageNotes: stringValue("coverageNotes", candidate.coverageNotes),
  };
}

function splitList(value: string) {
  return unique(
    value
      .split(/\s*[;|\n]\s*/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function normalise(value: string) {
  return value
    .replace(/[’‘]/g, "'")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function displayDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not documented";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}
