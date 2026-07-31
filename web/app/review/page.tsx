import type { Metadata } from "next";
import Link from "next/link";
import { chatGPTSignOutPath } from "@/app/chatgpt-auth";
import { ReviewWorkspace } from "@/components/review-workspace";
import { requireReviewPage } from "@/lib/review-auth";
import {
  reviewAssertions,
  reviewBatchId,
  reviewSources,
} from "@/lib/review-data";
import { registryManifest } from "@/lib/registry-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Review workspace",
  description: "Private editorial workspace for candidate data and contributions.",
  robots: { index: false, follow: false },
};

export default function ReviewPage() {
  return <ReviewGate />;
}

async function ReviewGate() {
  const access = await requireReviewPage();
  if (!access.allowed) {
    return (
      <main className="review-access-page" id="main-content">
        <div>
          <span aria-hidden="true" className="review-lock">×</span>
          <h1>Reviewer access required</h1>
          <p>
            {access.user?.displayName ?? "This account"} is signed in but is not
            on the reviewer allowlist.
          </p>
          <div>
            <Link className="button button-primary" href="/">
              Return to the map
            </Link>
            <Link
              className="button button-outline"
              href={chatGPTSignOutPath("/review")}
            >
              Change account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <ReviewWorkspace
      assertions={reviewAssertions}
      batchId={reviewBatchId}
      manifest={registryManifest}
      reviewer={{
        displayName: access.user.displayName,
        email: access.user.email,
      }}
      signOutHref={chatGPTSignOutPath("/")}
      sources={reviewSources}
    />
  );
}
