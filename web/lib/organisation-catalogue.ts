import catalogueJson from "@/generated/organisation-catalogue.json";
import {
  organisationRoleName,
  organisationSegmentName,
} from "@/lib/organisation-data";
import { isAfricaWideCoverageLabel } from "@/lib/geography-scope";

export type OrganisationCatalogueRecord = {
  id: string;
  sourceRow: number;
  workbookId: string;
  name: string;
  aliases: string[];
  parent: string;
  organisationType: string;
  primaryRole: string;
  roles: string[];
  valueChainDetail: string;
  headquartersCity: string;
  headquartersCountry: string;
  africaHeadquartered: boolean;
  headquartersRegion: string;
  africanRegionsActive: string[];
  countriesActive: string[];
  countryCount: number;
  segments: string[];
  technologies: string[];
  projectFocus: string;
  lifecycle: string;
  website: string;
  description: string;
  sourceUrl: string;
  additionalSourceUrls: string[];
  inclusionBasis: string;
  confidence: string;
  lastReviewed: string;
  coverageNotes: string;
  evidenceSourceCount: number;
  reconciliation:
    | {
        status: "reviewed_match";
        canonicalOrganisationId: string;
        canonicalHref: string;
      }
    | { status: "candidate" };
  reviewState: "reviewed" | "needs_review";
};

type OrganisationCatalogue = {
  schemaVersion: string;
  generatedAt: string;
  asOf: string;
  sourceWorkbook: {
    filename: string;
    sha256: string;
    sheet: string;
    sourceRows: number;
  };
  publicationBoundary: {
    inclusionCatalogue: boolean;
    reviewedRelease: boolean;
    candidateRecordsRequireReview: boolean;
    privateEditorialCellsRemoved: number;
  };
  counts: {
    total: number;
    reviewedMatches: number;
    needsReview: number;
    africaHeadquartered: number;
  };
  sources: Array<{
    name: string;
    publisher: string;
    url: string;
    sourceType: string;
    coverage: string;
    recordsIngested: number;
    accessed: string;
    caveat: string;
  }>;
  records: OrganisationCatalogueRecord[];
};

export const organisationCatalogue = catalogueJson as OrganisationCatalogue;
export const organisationCatalogueRecords = organisationCatalogue.records;
export const organisationCatalogueById = new Map(
  organisationCatalogueRecords.map((record) => [record.id, record]),
);

export function catalogueCanonicalIdentity(record: OrganisationCatalogueRecord) {
  const organisationId = `org_catalogue_${record.workbookId.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
  const slugBase = normalise(record.name).replaceAll(" ", "-") || "organisation";
  const slug = `${slugBase}-${record.workbookId.toLowerCase()}`;
  return { organisationId, slug, href: `/organisations/${slug}` };
}

export const catalogueRoles = uniqueSorted(
  organisationCatalogueRecords.flatMap((record) => record.roles),
);
export const catalogueSegments = uniqueSorted(
  organisationCatalogueRecords.flatMap((record) => record.segments),
);
export const catalogueCountries = uniqueSorted(
  organisationCatalogueRecords.flatMap((record) => record.countriesActive),
);
export const catalogueHeadquarters = uniqueSorted(
  organisationCatalogueRecords.map((record) => record.headquartersCountry),
);

export type OrganisationCatalogueQuery = {
  query?: string;
  group?: string;
  role?: string;
  sector?: string;
  segment?: string;
  country?: string;
  headquarters?: string;
  origin?: string;
  scope?: string;
  page?: number;
  pageSize?: number;
};

export type OrganisationCataloguePage = {
  counts: OrganisationCatalogue["counts"];
  asOf: string;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  records: OrganisationCatalogueRecord[];
  options: {
    roles: string[];
    segments: string[];
    countries: string[];
    headquarters: string[];
  };
};

export type OrganisationCatalogueMapData = {
  totalWithDocumentedCountry: number;
  totalWithAfricaWideCoverage: number;
  totalWithHeadquarters: number;
  totalWithAnyLocation: number;
  assessedIso2s: string[];
  countries: Record<
    string,
    {
      count: number;
      activityCount: number;
      africaWideCount: number;
      headquartersCount: number;
      recordKeys: string[];
      activityRecordKeys: string[];
      africaWideRecordKeys: string[];
      headquartersRecordKeys: string[];
      records: Array<{
        id: string;
        name: string;
        primaryRole: string;
        headquartersCountry: string;
        website: string;
        canonicalHref: string;
        reviewState: "reviewed" | "needs_review";
        locationTypes: Array<"catalogue_activity" | "africa_wide" | "headquarters">;
      }>;
    }
  >;
};

export function buildOrganisationCatalogueMapData(
  africanCountries: Array<readonly [string, string]>,
  records: OrganisationCatalogueRecord[] = organisationCatalogueRecords,
  options: { includeRecordsFor?: string[] } = {},
): OrganisationCatalogueMapData {
  const iso2ByName = new Map(africanCountries.map(([iso2, name]) => [normalise(name), iso2]));
  const recordCountries = options.includeRecordsFor
    ? new Set(options.includeRecordsFor)
    : null;
  const countries: OrganisationCatalogueMapData["countries"] = {};
  const recordsWithCountry = new Set<string>();
  const recordsWithAfricaWideCoverage = new Set<string>();
  const recordsWithHeadquarters = new Set<string>();
  const recordsWithAnyLocation = new Set<string>();
  for (const record of records) {
    const locations = new Map<string, Set<"catalogue_activity" | "africa_wide" | "headquarters">>();
    const africaWide = organisationHasAfricaWideCoverage(record);
    for (const countryName of record.countriesActive) {
      const iso2 = iso2ByName.get(normalise(countryName));
      if (!iso2) continue;
      recordsWithCountry.add(record.id);
      const types = locations.get(iso2) ?? new Set();
      types.add("catalogue_activity");
      locations.set(iso2, types);
    }
    if (africaWide) {
      recordsWithAfricaWideCoverage.add(record.id);
    }
    const headquartersIso2 = iso2ByName.get(normalise(record.headquartersCountry));
    if (headquartersIso2) {
      recordsWithHeadquarters.add(record.id);
      const types = locations.get(headquartersIso2) ?? new Set();
      types.add("headquarters");
      locations.set(headquartersIso2, types);
    }
    if (africaWide) {
      for (const types of locations.values()) types.add("africa_wide");
    }
    for (const [iso2, locationTypes] of locations) {
      recordsWithAnyLocation.add(record.id);
      const canonicalHref = record.reconciliation.status === "reviewed_match"
        ? record.reconciliation.canonicalHref
        : "";
      const recordKey = canonicalHref || `catalogue:${record.id}`;
      const group = countries[iso2] ?? {
        count: 0,
        activityCount: 0,
        africaWideCount: 0,
        headquartersCount: 0,
        recordKeys: [],
        activityRecordKeys: [],
        africaWideRecordKeys: [],
        headquartersRecordKeys: [],
        records: [],
      };
      group.recordKeys.push(recordKey);
      group.count = group.recordKeys.length;
      if (locationTypes.has("catalogue_activity")) {
        group.activityCount += 1;
        group.activityRecordKeys.push(recordKey);
      }
      if (locationTypes.has("africa_wide")) {
        group.africaWideCount += 1;
        group.africaWideRecordKeys.push(recordKey);
      }
      if (locationTypes.has("headquarters")) {
        group.headquartersCount += 1;
        group.headquartersRecordKeys.push(recordKey);
      }
      if (!recordCountries || recordCountries.has(iso2)) {
        group.records.push({
          id: record.id,
          name: record.name,
          primaryRole: record.primaryRole,
          headquartersCountry: record.headquartersCountry,
          website: record.website,
          canonicalHref,
          reviewState: record.reviewState,
          locationTypes: Array.from(locationTypes),
        });
      }
      countries[iso2] = group;
    }
  }
  return {
    totalWithDocumentedCountry: recordsWithCountry.size,
    totalWithAfricaWideCoverage: recordsWithAfricaWideCoverage.size,
    totalWithHeadquarters: recordsWithHeadquarters.size,
    totalWithAnyLocation: recordsWithAnyLocation.size,
    assessedIso2s: africanCountries.map(([iso2]) => iso2),
    countries,
  };
}

export function queryOrganisationCatalogue({
  query = "",
  group = "all",
  role = "all",
  sector = "all",
  segment = "all",
  country = "all",
  headquarters = "all",
  scope = "all",
  page = 1,
  pageSize = 60,
}: OrganisationCatalogueQuery = {}, records: OrganisationCatalogueRecord[] = organisationCatalogueRecords): OrganisationCataloguePage {
  const filtered = filterOrganisationCatalogueRecords({
    query,
    group,
    role,
    sector,
    segment,
    country,
    headquarters,
    scope,
  }, records);
  const safePageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const pageCount = Math.max(1, Math.ceil(filtered.length / safePageSize));
  const safePage = Math.min(pageCount, Math.max(1, Math.trunc(page)));
  return {
    counts: {
      total: records.length,
      reviewedMatches: records.filter((record) => record.reviewState === "reviewed").length,
      needsReview: records.filter((record) => record.reviewState === "needs_review").length,
      africaHeadquartered: records.filter((record) => record.africaHeadquartered).length,
    },
    asOf: organisationCatalogue.asOf,
    total: filtered.length,
    page: safePage,
    pageSize: safePageSize,
    pageCount,
    records: filtered.slice((safePage - 1) * safePageSize, safePage * safePageSize),
    options: {
      roles: uniqueSorted(records.flatMap((record) => record.roles)),
      segments: uniqueSorted(records.flatMap((record) => record.segments)),
      countries: uniqueSorted(records.flatMap((record) => record.countriesActive)),
      headquarters: uniqueSorted(records.map((record) => record.headquartersCountry)),
    },
  };
}

export function filterOrganisationCatalogueRecords({
  query = "",
  group = "all",
  role = "all",
  sector = "all",
  segment = "all",
  country = "all",
  headquarters = "all",
  origin = "all",
  scope = "all",
}: OrganisationCatalogueQuery = {}, records: OrganisationCatalogueRecord[] = organisationCatalogueRecords) {
  const needle = normalise(query);
  return records.filter((record) => {
    const recordGroups = new Set(record.roles.flatMap((name) => catalogueGroupsByRoleName[name] ?? []));
    const roleLabels = new Set([
      role,
      organisationRoleName(role),
      catalogueRoleNameByTaxonomyId[role] ?? "",
    ]);
    const segmentLabels = new Set([
      segment,
      organisationSegmentName(segment),
      catalogueSegmentNameByTaxonomyId[segment] ?? "",
    ]);
    if (group !== "all" && !recordGroups.has(group)) return false;
    if (role !== "all" && !record.roles.some((name) => roleLabels.has(name))) return false;
    if (sector !== "all" && !record.segments.some((name) =>
      (catalogueSectorIdsBySegment[name] ?? []).includes(sector),
    )) return false;
    if (segment !== "all" && !record.segments.some((name) => segmentLabels.has(name))) return false;
    if (
      country !== "all" &&
      !record.countriesActive.includes(country) &&
      record.headquartersCountry !== country
    ) return false;
    if (headquarters !== "all" && record.headquartersCountry !== headquarters) return false;
    if (origin === "Africa-headquartered" && !record.africaHeadquartered) return false;
    if (origin === "International, active in Africa" && record.africaHeadquartered) return false;
    if (scope === "africa_hq" && !record.africaHeadquartered) return false;
    if (scope === "international" && record.africaHeadquartered) return false;
    if (scope === "reviewed" && record.reviewState !== "reviewed") return false;
    if (scope === "pending" && record.reviewState !== "needs_review") return false;
    if (scope === "africa_wide" && !organisationHasAfricaWideCoverage(record)) return false;
    if (!needle) return true;
    return normalise([
      record.name,
      ...record.aliases,
      record.parent,
      record.organisationType,
      record.primaryRole,
      ...record.roles,
      ...record.segments,
      ...record.technologies,
      ...record.countriesActive,
      record.headquartersCountry,
      record.description,
    ].join(" ")).includes(needle);
  });
}

export function organisationHasAfricaWideCoverage(record: OrganisationCatalogueRecord) {
  return record.africanRegionsActive.some(isAfricaWideCoverageLabel);
}

const catalogueSectorIdsBySegment: Record<string, string[]> = {
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

const catalogueRoleNameByTaxonomyId: Record<string, string> = {
  org_role_financier: "Financier",
  org_role_developer_ipp: "Developer",
  org_role_oem_manufacturer: "OEM",
  org_role_epc: "EPC",
  org_role_operator: "Operator",
  org_role_software_data: "Software/Data",
  org_role_enabler: "Enabler",
  org_role_public_institution: "Public Institution",
};

const catalogueGroupsByRoleName: Record<string, string[]> = {
  Financier: ["org_group_capital"],
  Developer: ["org_group_developers"],
  OEM: ["org_group_oems"],
  EPC: ["org_group_epcs"],
  Operator: ["org_group_operators"],
  "Software/Data": ["org_group_software"],
  Enabler: ["org_group_enablers"],
  "Public Institution": ["org_group_public"],
};

const catalogueSegmentNameByTaxonomyId: Record<string, string> = {
  org_segment_utility_generation: "Utility-scale",
  org_segment_transmission_distribution: "T&D",
  org_segment_minigrids: "Mini-grids",
  org_segment_shs_paygo: "SHS/PAYGo",
  org_segment_commercial_industrial: "C&I",
  org_segment_emobility: "E-mobility",
  org_segment_energy_storage: "Storage",
  org_segment_clean_cooking: "Clean Cooking",
  org_segment_efficiency_demand: "Efficiency",
  org_segment_productive_use: "Productive Use",
  org_segment_carbon_markets: "Carbon Markets",
};

export function catalogueRoleFilterValue(value = "all") {
  if (value === "all") return value;
  return catalogueRoleNameByTaxonomyId[value] ?? organisationRoleName(value);
}

export function catalogueSegmentFilterValue(value = "all") {
  if (value === "all") return value;
  return catalogueSegmentNameByTaxonomyId[value] ?? organisationSegmentName(value);
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
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
