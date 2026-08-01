import {
  ReviewConflictError,
  saveSourceReview,
} from "@/db/reviews";
import {
  authorisedReviewer,
  numberValue,
  readReviewBody,
  reviewError,
  reviewJson,
  reviewReviewerEmail,
  textValue,
} from "@/lib/review-api";
import { isReviewSourceId } from "@/lib/review-data";
import { promotedSourceExists } from "@/db/bulk-reviews";

const rightsStatuses = new Set(["resolved", "needs_research", "exclude"]);
const independenceClasses = new Set([
  "provider_authored",
  "customer_or_official",
  "independent_primary",
  "independent_secondary",
  "aggregator",
  "community_submission",
  "unknown",
]);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorisation = await authorisedReviewer();
  if (!authorisation.ok) return authorisation.response;
  const body = await readReviewBody(request);
  if (!body.ok) return body.response;
  const { id } = await params;
  if (!isReviewSourceId(id) && !(await promotedSourceExists(id))) {
    return reviewError("source_not_found", "Source not found.", 404);
  }
  const rightsStatus = textValue(body.value, "rightsStatus", 30);
  const sourceLicense = textValue(body.value, "sourceLicense", 120);
  const independenceClass = textValue(
    body.value,
    "independenceClass",
    80,
  );
  const notes = textValue(body.value, "notes", 4_000);
  if (!rightsStatuses.has(rightsStatus)) {
    return reviewError(
      "invalid_rights_status",
      "Choose Resolved, Needs research or Exclude.",
      422,
    );
  }
  if (
    independenceClass &&
    !independenceClasses.has(independenceClass)
  ) {
    return reviewError(
      "invalid_independence",
      "Choose a supported source-independence class.",
      422,
    );
  }
  if (rightsStatus === "resolved" && (!sourceLicense || sourceLicense === "unknown")) {
    return reviewError(
      "licence_required",
      "Record a resolved source licence or rights basis.",
      422,
    );
  }
  if (rightsStatus !== "resolved" && !notes) {
    return reviewError(
      "source_note_required",
      "Add a short note explaining the unresolved or excluded source.",
      422,
    );
  }
  try {
    return reviewJson(
      await saveSourceReview({
        sourceId: id,
        rightsStatus: rightsStatus as
          | "resolved"
          | "needs_research"
          | "exclude",
        sourceLicense,
        independenceClass,
        notes,
        reviewerEmail: reviewReviewerEmail(authorisation.access),
        expectedVersion: numberValue(body.value, "expectedVersion"),
      }),
    );
  } catch (error) {
    if (error instanceof ReviewConflictError) {
      return reviewError("review_conflict", error.message, 409);
    }
    throw error;
  }
}
