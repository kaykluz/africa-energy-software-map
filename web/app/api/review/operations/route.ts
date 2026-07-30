import {
  getOperationsStatus,
  OperationsConflictError,
  setContributionIntakePaused,
} from "@/db/operations";
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

export async function GET() {
  const authorisation = await authorisedReviewer();
  if (!authorisation.ok) return authorisation.response;
  return reviewJson(await getOperationsStatus());
}

export async function PUT(request: Request) {
  const authorisation = await authorisedReviewer();
  if (!authorisation.ok) return authorisation.response;
  const body = await readReviewBody(request);
  if (!body.ok) return body.response;
  const reason = textValue(body.value, "reason", 2_000);
  if (!reason) {
    return reviewError(
      "reason_required",
      "Record why contribution intake is changing.",
      422,
    );
  }
  try {
    return reviewJson(
      await setContributionIntakePaused({
        paused: booleanValue(body.value, "paused"),
        reason,
        reviewerEmail: reviewReviewerEmail(authorisation.access),
        expectedVersion: numberValue(body.value, "expectedVersion"),
      }),
    );
  } catch (error) {
    if (error instanceof OperationsConflictError) {
      return reviewError("operations_conflict", error.message, 409);
    }
    throw error;
  }
}
