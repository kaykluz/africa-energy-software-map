import {
  revealContributionContact,
  ReviewNotFoundError,
} from "@/db/reviews";
import {
  authorisedReviewer,
  readReviewBody,
  reviewError,
  reviewJson,
  reviewReviewerEmail,
} from "@/lib/review-api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorisation = await authorisedReviewer();
  if (!authorisation.ok) return authorisation.response;
  const body = await readReviewBody(request);
  if (!body.ok) return body.response;
  const { id } = await params;
  try {
    return reviewJson({
      contact: await revealContributionContact({
        contributionId: id,
        reviewerEmail: reviewReviewerEmail(authorisation.access),
      }),
    });
  } catch (error) {
    if (error instanceof ReviewNotFoundError) {
      return reviewError("contribution_not_found", error.message, 404);
    }
    throw error;
  }
}
