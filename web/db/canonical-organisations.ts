import {
  buildOrganisationDirectoryRecord,
  organisationDirectory,
  organisationRoles,
  organisationSectors,
  organisationSegments,
  type OrganisationCatalogueLink,
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

const sectorIdsBySegment: Record<string, string[]> = {
  "C&I": ["sector_commercial_industrial"],
  "Carbon Markets": ["sector_markets_finance_carbon"],
  "Clean Cooking": ["sector_distributed_energy_access"],
  "E-mobility": ["sector_emobility_batteries"],
  Efficiency: ["sector_commercial_industrial"],
  "Mini-grids": ["sector_distributed_energy_access"],
  "Productive Use": ["sector_distributed_energy_access"],
  "SHS/PAYGo": ["sector_distributed_energy_access"],
  Storage: ["sector_generation_storage"],
  "T&D": ["sector_power_utilities"],
  "Utility-scale": ["sector_generation_storage"],
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
  const baseCanonicalDirectory = [
    ...organisationDirectory,
    ...promotions.map((promotion) => promotion.directoryRecord),
  ];
  const canonicalById = new Map(
    baseCanonicalDirectory.map((record) => [record.organisation.id, record]),
  );
  const duplicateByCandidate = new Map(
    reviews.flatMap((review) => {
      if (review.decision !== "duplicate" || !review.canonicalOrganisationId) return [];
      const target = canonicalById.get(review.canonicalOrganisationId);
      const candidate = organisationCatalogueRecords.find(
        (record) => record.id === review.candidateId,
      );
      if (!target || !candidate) return [];
      const sourceUrl = safeUrl(review.normalizedSourceUrl) || safeUrl(candidate.sourceUrl) || safeUrl(candidate.website);
      return [[candidate.id, {
        ...candidate,
        reconciliation: {
          status: "reviewed_match" as const,
          canonicalOrganisationId: target.organisation.id,
          canonicalHref: `/organisations/${target.organisation.slug}`,
        },
        reviewState: "reviewed" as const,
        sourceUrl,
      }] as const];
    }),
  );
  const catalogueRecords = organisationCatalogueRecords.map((record) =>
    duplicateByCandidate.get(record.id) ??
    promotionByCandidate.get(record.id)?.effectiveCatalogueRecord ??
    record,
  );
  const catalogueByCanonicalId = new Map<string, OrganisationCatalogueRecord[]>();
  for (const record of catalogueRecords) {
    if (record.reconciliation.status !== "reviewed_match") continue;
    const current = catalogueByCanonicalId.get(
      record.reconciliation.canonicalOrganisationId,
    ) ?? [];
    current.push(record);
    catalogueByCanonicalId.set(record.reconciliation.canonicalOrganisationId, current);
  }
  const canonicalDirectory = baseCanonicalDirectory.map((record) =>
    mergeCatalogueMetadata(
      record,
      catalogueByCanonicalId.get(record.organisation.id) ?? [],
    ),
  ).sort((left, right) =>
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
  const mappedSectors = unique(
    effective.segments.flatMap((segment) => sectorIdsBySegment[segment] ?? []),
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
    sectorIds: mappedSectors,
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

function mergeCatalogueMetadata(
  record: OrganisationDirectoryRecord,
  catalogueRecords: OrganisationCatalogueRecord[],
): OrganisationDirectoryRecord {
  if (!catalogueRecords.length) return record;
  const catalogueListings: OrganisationCatalogueLink[] = catalogueRecords.map((item) => ({
    id: item.id,
    name: item.name,
    aliases: item.aliases,
    parent: item.parent,
    roles: item.roles,
    segments: item.segments,
    technologies: item.technologies,
    projectFocus: item.projectFocus,
    countriesActive: item.countriesActive,
    sourceUrls: unique([
      item.sourceUrl,
      ...item.additionalSourceUrls,
    ].map(safeUrl).filter(Boolean)),
    website: safeUrl(item.website),
    lastReviewed: item.lastReviewed,
  }));
  const catalogueSourceUrls = unique(catalogueListings.flatMap((item) => item.sourceUrls));
  const catalogueCountryIso2s = unique([
    ...record.catalogueCountryIso2s,
    ...catalogueRecords.flatMap((item) =>
      item.countriesActive
        .map((country) => iso2ByCountry.get(normalise(country)) ?? "")
        .filter(Boolean),
    ),
  ]).sort();
  const countryIso2s = unique([
    ...record.countryIso2s,
    ...catalogueCountryIso2s,
  ]).sort();
  const countryNames = countryIso2s.map(
    (iso2) => africanCountries.find(([value]) => value === iso2)?.[1] ?? iso2,
  );
  const aliases = unique([
    ...record.aliases,
    ...catalogueListings.flatMap((item) => [item.name, ...item.aliases]),
  ]).filter((name) => name !== record.organisation.name);
  const catalogueRoleIds = unique(catalogueRecords.flatMap((item) =>
    [item.primaryRole, ...item.roles].map((role) => roleIds[role]).filter(Boolean),
  ));
  const roleIdsWithCatalogue = unique([
    ...record.roleIds.filter((roleId) =>
      roleId !== "org_role_to_classify" || catalogueRoleIds.length === 0,
    ),
    ...catalogueRoleIds,
  ]);
  const primaryRole = record.primaryRole.id === "org_role_to_classify" && catalogueRoleIds[0]
    ? organisationRoles.find((role) => role.id === catalogueRoleIds[0]) ?? record.primaryRole
    : record.primaryRole;
  const ecosystemGroupIds = unique(roleIdsWithCatalogue.flatMap((roleId) =>
    organisationRoles.find((role) => role.id === roleId)?.ecosystemGroupIds ?? [],
  ));
  const catalogueSegmentIds = unique(catalogueRecords.flatMap((item) =>
    item.segments.map((segment) => segmentIds[segment]).filter(Boolean),
  ));
  const segmentIdsWithCatalogue = sortByTaxonomy(
    unique([...record.segmentIds, ...catalogueSegmentIds]),
    organisationSegments,
  );
  const catalogueSectorIds = unique(catalogueRecords.flatMap((item) =>
    item.segments.flatMap((segment) => sectorIdsBySegment[segment] ?? []),
  ));
  const sectorIdsWithCatalogue = sortByTaxonomy(
    unique([...record.sectorIds, ...catalogueSectorIds]),
    organisationSectors,
  );
  return {
    ...record,
    aliases,
    catalogueCountryIso2s,
    catalogueListings,
    catalogueSourceUrl: catalogueSourceUrls[0] ?? record.catalogueSourceUrl,
    catalogueSourceUrls,
    countryCount: countryIso2s.length,
    countryIso2s,
    countryNames,
    ecosystemGroupIds,
    primaryRole,
    roleIds: roleIdsWithCatalogue,
    sectorIds: sectorIdsWithCatalogue,
    segmentIds: segmentIdsWithCatalogue,
  };
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

function sortByTaxonomy(
  values: string[],
  taxonomy: Array<{ id: string }>,
) {
  const order = new Map(taxonomy.map((item, index) => [item.id, index]));
  return values.sort((left, right) =>
    (order.get(left) ?? Number.MAX_SAFE_INTEGER) -
    (order.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
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
