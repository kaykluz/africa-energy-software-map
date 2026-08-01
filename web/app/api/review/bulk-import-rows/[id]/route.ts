import {
  bulkAmendableFields,
  bulkRowDecisions,
  BulkRowConflictError,
  BulkRowNotFoundError,
  BulkRowValidationError,
  saveBulkRowReview,
  type BulkAmendableField,
  type BulkRowDecision,
} from "@/db/bulk-reviews";
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

const rowIdPattern = /^bulk_[0-9a-f-]{36}_\d{3}$/i;
const allowedAmendments = new Set<string>(bulkAmendableFields);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorisation = await authorisedReviewer();
  if (!authorisation.ok) return authorisation.response;
  const body = await readReviewBody(request, 30_000);
  if (!body.ok) return body.response;
  const { id } = await params;
  if (!rowIdPattern.test(id)) {
    return reviewError("candidate_not_found", "Candidate row not found.", 404);
  }
  const decision = textValue(body.value, "decision", 30);
  if (!bulkRowDecisions.includes(decision as BulkRowDecision)) {
    return reviewError(
      "invalid_decision",
      "Choose Accept, Amend, Reject or More evidence.",
      422,
    );
  }
  const amendmentInput = body.value.amendments;
  if (
    amendmentInput !== undefined &&
    (!amendmentInput ||
      typeof amendmentInput !== "object" ||
      Array.isArray(amendmentInput))
  ) {
    return reviewError(
      "invalid_amendments",
      "The amended fields could not be read.",
      422,
    );
  }
  const amendmentRecord = (amendmentInput ?? {}) as Record<string, unknown>;
  const unsupported = Object.keys(amendmentRecord).filter(
    (field) => !allowedAmendments.has(field),
  );
  if (unsupported.length) {
    return reviewError(
      "unsupported_amendment",
      "One or more fields cannot be amended in this workflow.",
      422,
    );
  }
  if (
    Object.values(amendmentRecord).some((value) => typeof value !== "string")
  ) {
    return reviewError(
      "invalid_amendments",
      "Amended field values must be text.",
      422,
    );
  }
  const amendments = Object.fromEntries(
    Object.entries(amendmentRecord)
      .filter(([, value]) => typeof value === "string")
      .map(([field, value]) => [
        field,
        String(value).trim().replaceAll("\u0000", "").slice(0, 4_000),
      ]),
  ) as Partial<Record<BulkAmendableField, string>>;
  try {
    return reviewJson(
      await saveBulkRowReview({
        rowId: id,
        decision: decision as BulkRowDecision,
        amendments,
        sourceUrl: textValue(body.value, "sourceUrl", 2_000),
        sourceOpened: booleanValue(body.value, "sourceOpened"),
        sourceDirect: booleanValue(body.value, "sourceDirect"),
        sourceSupports: booleanValue(body.value, "sourceSupports"),
        safetyChecked: booleanValue(body.value, "safetyChecked"),
        notes: textValue(body.value, "notes", 4_000),
        reviewerEmail: reviewReviewerEmail(authorisation.access),
        expectedVersion: numberValue(body.value, "expectedVersion"),
      }),
    );
  } catch (error) {
    if (error instanceof BulkRowNotFoundError) {
      return reviewError("candidate_not_found", error.message, 404);
    }
    if (error instanceof BulkRowConflictError) {
      return reviewError("review_conflict", error.message, 409);
    }
    if (error instanceof BulkRowValidationError) {
      return reviewJson(
        {
          error: {
            code: "candidate_review_invalid",
            message: error.message,
            details: error.details,
          },
        },
        422,
      );
    }
    if (error instanceof SourceUrlError) {
      return reviewError("source_url_invalid", error.message, 422);
    }
    throw error;
  }
}
