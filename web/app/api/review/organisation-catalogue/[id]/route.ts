import {
  organisationCatalogueAmendableFields,
  organisationCatalogueDecisions,
  OrganisationCatalogueConflictError,
  OrganisationCatalogueNotFoundError,
  OrganisationCatalogueValidationError,
  saveOrganisationCatalogueReview,
  type OrganisationCatalogueAmendableField,
  type OrganisationCatalogueDecision,
} from "@/db/organisation-catalogue-reviews";
import {
  authorisedReviewer,
  booleanValue,
  numberValue,
  readReviewBody,
  reviewError,
  reviewJson,
  reviewReviewerEmail,
  textValue,
} from "@/lib/review-api";
import { SourceUrlError } from "@/lib/source-url";

const candidateIdPattern = /^listing_afr_\d{4}$/;
const allowedAmendments = new Set<string>(organisationCatalogueAmendableFields);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorisation = await authorisedReviewer();
  if (!authorisation.ok) return authorisation.response;
  const body = await readReviewBody(request, 30_000);
  if (!body.ok) return body.response;
  const { id } = await params;
  if (!candidateIdPattern.test(id)) {
    return reviewError("organisation_candidate_not_found", "Organisation candidate not found.", 404);
  }
  const decision = textValue(body.value, "decision", 30);
  if (!organisationCatalogueDecisions.includes(decision as OrganisationCatalogueDecision)) {
    return reviewError(
      "invalid_decision",
      "Choose Accept, Amend, Reject, Duplicate or More evidence.",
      422,
    );
  }
  const input = body.value.amendments;
  if (input !== undefined && (!input || typeof input !== "object" || Array.isArray(input))) {
    return reviewError("invalid_amendments", "The corrected fields could not be read.", 422);
  }
  const amendmentRecord = (input ?? {}) as Record<string, unknown>;
  if (Object.keys(amendmentRecord).some((field) => !allowedAmendments.has(field))) {
    return reviewError("unsupported_amendment", "One or more fields cannot be amended here.", 422);
  }
  if (Object.values(amendmentRecord).some((value) => typeof value !== "string")) {
    return reviewError("invalid_amendments", "Corrected field values must be text.", 422);
  }
  const amendments = Object.fromEntries(
    Object.entries(amendmentRecord).map(([field, value]) => [
      field,
      String(value).trim().replaceAll("\u0000", "").slice(0, 4_000),
    ]),
  ) as Partial<Record<OrganisationCatalogueAmendableField, string>>;
  try {
    return reviewJson(
      await saveOrganisationCatalogueReview({
        candidateId: id,
        decision: decision as OrganisationCatalogueDecision,
        amendments,
        sourceUrl: textValue(body.value, "sourceUrl", 2_000),
        sourceOpened: booleanValue(body.value, "sourceOpened"),
        identityConfirmed: booleanValue(body.value, "identityConfirmed"),
        classificationsConfirmed: booleanValue(body.value, "classificationsConfirmed"),
        safetyChecked: booleanValue(body.value, "safetyChecked"),
        notes: textValue(body.value, "notes", 4_000),
        reviewerEmail: reviewReviewerEmail(authorisation.access),
        expectedVersion: numberValue(body.value, "expectedVersion"),
      }),
    );
  } catch (error) {
    if (error instanceof OrganisationCatalogueNotFoundError) {
      return reviewError("organisation_candidate_not_found", error.message, 404);
    }
    if (error instanceof OrganisationCatalogueConflictError) {
      return reviewError("review_conflict", error.message, 409);
    }
    if (error instanceof OrganisationCatalogueValidationError || error instanceof SourceUrlError) {
      return reviewError("organisation_review_invalid", error.message, 422);
    }
    throw error;
  }
}
