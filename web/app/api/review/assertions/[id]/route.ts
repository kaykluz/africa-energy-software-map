import {
  clearAssertionReview,
  ReviewConflictError,
  saveAssertionReview,
} from "@/db/reviews";
import { promotedAssertionBatchId } from "@/db/bulk-reviews";
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
import {
  isReviewAssertionId,
  reviewEvidenceOptions,
} from "@/lib/review-data";

const decisions = new Set([
  "accept",
  "amend",
  "reject",
  "needs_evidence",
]);
const evidenceStatuses = new Set(
  reviewEvidenceOptions.map((option) => option.value),
);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorisation = await authorisedReviewer();
  if (!authorisation.ok) return authorisation.response;
  const body = await readReviewBody(request);
  if (!body.ok) return body.response;
  const { id } = await params;
  if (!isReviewAssertionId(id) && !(await promotedAssertionBatchId(id))) {
    return reviewError("assertion_not_found", "Assertion not found.", 404);
  }

  const decision = textValue(body.value, "decision", 30);
  const proposedValue = textValue(body.value, "proposedValue", 2_000);
  const proposedEvidenceStatus = textValue(
    body.value,
    "proposedEvidenceStatus",
    40,
  );
  const notes = textValue(body.value, "notes", 4_000);
  const sourceChecked = booleanValue(body.value, "sourceChecked");
  const safetyChecked = booleanValue(body.value, "safetyChecked");
  if (!decisions.has(decision)) {
    return reviewError(
      "invalid_decision",
      "Choose Accept, Amend, Reject or More evidence.",
      422,
    );
  }
  if (
    proposedEvidenceStatus &&
    !evidenceStatuses.has(
      proposedEvidenceStatus as
        | "provider_claim_only"
        | "public_source"
        | "independently_evidenced"
        | "customer_confirmed",
    )
  ) {
    return reviewError(
      "invalid_evidence_status",
      "Choose a supported evidence classification.",
      422,
    );
  }
  if (decision === "amend" && !proposedValue) {
    return reviewError(
      "amendment_required",
      "Enter the corrected value before saving an amendment.",
      422,
    );
  }
  if (decision !== "accept" && !notes) {
    return reviewError(
      "review_note_required",
      "Add a short reason for this decision.",
      422,
    );
  }
  if (decision !== "needs_evidence" && (!sourceChecked || !safetyChecked)) {
    return reviewError(
      "checks_required",
      "Confirm both the source and safety checks.",
      422,
    );
  }

  try {
    const review = await saveAssertionReview({
      assertionId: id,
      decision: decision as
        | "accept"
        | "amend"
        | "reject"
        | "needs_evidence",
      proposedValue,
      proposedEvidenceStatus,
      notes,
      sourceChecked,
      safetyChecked,
      reviewerEmail: reviewReviewerEmail(authorisation.access),
      expectedVersion: numberValue(body.value, "expectedVersion"),
    });
    return reviewJson(review);
  } catch (error) {
    if (error instanceof ReviewConflictError) {
      return reviewError("review_conflict", error.message, 409);
    }
    throw error;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorisation = await authorisedReviewer();
  if (!authorisation.ok) return authorisation.response;
  const body = await readReviewBody(request);
  if (!body.ok) return body.response;
  const { id } = await params;
  if (!isReviewAssertionId(id) && !(await promotedAssertionBatchId(id))) {
    return reviewError("assertion_not_found", "Assertion not found.", 404);
  }
  try {
    await clearAssertionReview({
      assertionId: id,
      reviewerEmail: reviewReviewerEmail(authorisation.access),
      expectedVersion: numberValue(body.value, "expectedVersion"),
    });
    return reviewJson({ assertionId: id, cleared: true });
  } catch (error) {
    if (error instanceof ReviewConflictError) {
      return reviewError("review_conflict", error.message, 409);
    }
    throw error;
  }
}
