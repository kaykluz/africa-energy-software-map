import {
  ReviewConflictError,
  ReviewNotFoundError,
  updateContributionStatus,
} from "@/db/reviews";
import {
  authorisedReviewer,
  readReviewBody,
  reviewError,
  reviewJson,
  reviewReviewerEmail,
  textValue,
} from "@/lib/review-api";

const statuses = new Set([
  "triaged",
  "researching",
  "needs_evidence",
  "reviewed",
  "accepted",
  "rejected",
  "duplicate",
  "withdrawn",
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
  const status = textValue(body.value, "status", 30);
  const reason = textValue(body.value, "reason", 2_000);
  if (!statuses.has(status)) {
    return reviewError(
      "invalid_status",
      "Choose a supported moderation status.",
      422,
    );
  }
  if (!reason) {
    return reviewError(
      "reason_required",
      "Record a short reason for the status change.",
      422,
    );
  }
  try {
    return reviewJson(
      await updateContributionStatus({
        contributionId: id,
        status,
        reason,
        reviewerEmail: reviewReviewerEmail(authorisation.access),
      }),
    );
  } catch (error) {
    if (error instanceof ReviewNotFoundError) {
      return reviewError("contribution_not_found", error.message, 404);
    }
    if (error instanceof ReviewConflictError) {
      return reviewError("invalid_transition", error.message, 409);
    }
    throw error;
  }
}
