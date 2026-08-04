import { listOrganisationCatalogueReviews } from "@/db/organisation-catalogue-reviews";
import { loadPublicOrganisationRegistry } from "@/db/canonical-organisations";
import { authorisedReviewer, reviewJson } from "@/lib/review-api";
import {
  catalogueCanonicalIdentity,
  catalogueRoles,
  catalogueSegments,
  organisationCatalogue,
  organisationCatalogueRecords,
} from "@/lib/organisation-catalogue";

export async function GET(request: Request) {
  const authorisation = await authorisedReviewer();
  if (!authorisation.ok) return authorisation.response;
  const params = new URL(request.url).searchParams;
  const query = clean(params.get("q"), 160).toLowerCase();
  if (params.get("targets") === "1") {
    const { canonicalDirectory } = await loadPublicOrganisationRegistry();
    const excludedCandidate = organisationCatalogueRecords.find(
      (record) => record.id === clean(params.get("excludeCandidate"), 120),
    );
    const excludedOrganisationId = excludedCandidate
      ? catalogueCanonicalIdentity(excludedCandidate).organisationId
      : "";
    const records = canonicalDirectory
      .filter((record) =>
        record.organisation.id !== excludedOrganisationId &&
        (!query || [
            record.organisation.id,
            record.organisation.name,
            ...record.aliases,
          ].join(" ").toLowerCase().includes(query)),
      )
      .slice(0, 20)
      .map((record) => ({
        id: record.organisation.id,
        name: record.organisation.name,
        href: `/organisations/${record.organisation.slug}`,
        aliases: record.aliases,
      }));
    return reviewJson({ records });
  }
  const status = clean(params.get("status"), 30) || "pending";
  const role = clean(params.get("role"), 120) || "all";
  const segment = clean(params.get("segment"), 120) || "all";
  const page = positiveInteger(params.get("page"), 1);
  const pageSize = Math.min(100, positiveInteger(params.get("pageSize"), 40));
  const reviews = await listOrganisationCatalogueReviews();
  const reviewMap = new Map(reviews.map((review) => [review.candidateId, review]));
  const filtered = organisationCatalogueRecords.filter((record) => {
    const review = reviewMap.get(record.id);
    if (status === "pending" && (record.reviewState === "reviewed" || review)) return false;
    if (status === "decided" && !review) return false;
    if (status === "reviewed" && record.reviewState !== "reviewed") return false;
    if (["accept", "amend", "reject", "needs_evidence", "duplicate"].includes(status)) {
      if (review?.decision !== status) return false;
    }
    if (role !== "all" && !record.roles.includes(role)) return false;
    if (segment !== "all" && !record.segments.includes(segment)) return false;
    if (!query) return true;
    return [
      record.name,
      record.parent,
      record.headquartersCountry,
      record.primaryRole,
      record.roles.join(" "),
      record.segments.join(" "),
      record.countriesActive.join(" "),
      record.inclusionBasis,
    ].join(" ").toLowerCase().includes(query);
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const records = filtered
    .slice((safePage - 1) * pageSize, safePage * pageSize)
    .map((record) => ({ record, review: reviewMap.get(record.id) ?? null }));
  return reviewJson({
    counts: organisationCatalogue.counts,
    decisions: reviews.length,
    reconciledOrDecided: organisationCatalogue.counts.reviewedMatches + reviews.length,
    total: filtered.length,
    page: safePage,
    pageSize,
    pageCount,
    records,
    options: { roles: catalogueRoles, segments: catalogueSegments },
  });
}

function clean(value: string | null, maximum: number) {
  return (value ?? "").trim().replaceAll("\u0000", "").slice(0, maximum);
}

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
