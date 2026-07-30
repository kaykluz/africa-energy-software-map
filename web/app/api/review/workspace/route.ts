import { loadReviewWorkspace } from "@/db/reviews";
import { authorisedReviewer, reviewJson } from "@/lib/review-api";

export async function GET() {
  const authorisation = await authorisedReviewer();
  if (!authorisation.ok) return authorisation.response;
  return reviewJson(await loadReviewWorkspace());
}
