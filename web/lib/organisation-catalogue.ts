import catalogueJson from "@/generated/organisation-catalogue.json";

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
  role?: string;
  segment?: string;
  country?: string;
  headquarters?: string;
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
  assessedIso2s: string[];
  countries: Record<
    string,
    {
      count: number;
      records: Array<{
        id: string;
        name: string;
        primaryRole: string;
        headquartersCountry: string;
        website: string;
        canonicalHref: string;
        reviewState: "reviewed" | "needs_review";
      }>;
    }
  >;
};

export function buildOrganisationCatalogueMapData(
  africanCountries: Array<readonly [string, string]>,
  records: OrganisationCatalogueRecord[] = organisationCatalogueRecords,
): OrganisationCatalogueMapData {
  const iso2ByName = new Map(africanCountries.map(([iso2, name]) => [normalise(name), iso2]));
  const countries: OrganisationCatalogueMapData["countries"] = {};
  const recordsWithCountry = new Set<string>();
  for (const record of records) {
    for (const countryName of record.countriesActive) {
      const iso2 = iso2ByName.get(normalise(countryName));
      if (!iso2) continue;
      recordsWithCountry.add(record.id);
      const group = countries[iso2] ?? { count: 0, records: [] };
      group.count += 1;
      if (group.records.length < 8) {
        group.records.push({
          id: record.id,
          name: record.name,
          primaryRole: record.primaryRole,
          headquartersCountry: record.headquartersCountry,
          website: record.website,
          canonicalHref:
            record.reconciliation.status === "reviewed_match"
              ? record.reconciliation.canonicalHref
              : "",
          reviewState: record.reviewState,
        });
      }
      countries[iso2] = group;
    }
  }
  return {
    totalWithDocumentedCountry: recordsWithCountry.size,
    assessedIso2s: africanCountries.map(([iso2]) => iso2),
    countries,
  };
}

export function queryOrganisationCatalogue({
  query = "",
  role = "all",
  segment = "all",
  country = "all",
  headquarters = "all",
  scope = "all",
  page = 1,
  pageSize = 60,
}: OrganisationCatalogueQuery = {}, records: OrganisationCatalogueRecord[] = organisationCatalogueRecords): OrganisationCataloguePage {
  const needle = normalise(query);
  const filtered = records.filter((record) => {
    if (role !== "all" && !record.roles.includes(role)) return false;
    if (segment !== "all" && !record.segments.includes(segment)) return false;
    if (country !== "all" && !record.countriesActive.includes(country)) return false;
    if (headquarters !== "all" && record.headquartersCountry !== headquarters) return false;
    if (scope === "africa_hq" && !record.africaHeadquartered) return false;
    if (scope === "international" && record.africaHeadquartered) return false;
    if (scope === "reviewed" && record.reviewState !== "reviewed") return false;
    if (scope === "pending" && record.reviewState !== "needs_review") return false;
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
