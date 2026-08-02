import { exportReviewPackage } from "@/db/reviews";
import {
  authorisedReviewer,
  reviewHeaders,
  reviewReviewerEmail,
} from "@/lib/review-api";

export async function GET() {
  const authorisation = await authorisedReviewer();
  if (!authorisation.ok) return authorisation.response;
  const reviewPackage = await exportReviewPackage(
    reviewReviewerEmail(authorisation.access),
  );
  return new Response(`${JSON.stringify(reviewPackage, null, 2)}\n`, {
    headers: {
      ...reviewHeaders(),
      "Content-Disposition":
        'attachment; filename="aesm-review-package-batch-001.json"',
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
