import {
  getChatGPTUser,
  requireChatGPTUser,
  type ChatGPTUser,
} from "@/app/chatgpt-auth";

export type ReviewerAccess =
  | { allowed: true; user: ChatGPTUser }
  | { allowed: false; user: ChatGPTUser | null };

export async function requireReviewPage(): Promise<ReviewerAccess> {
  const user = await requireChatGPTUser("/review");
  return {
    allowed: isAllowedReviewer(user.email),
    user,
  };
}

export async function reviewApiAccess(): Promise<ReviewerAccess> {
  const user = await getChatGPTUser();
  if (!user) return { allowed: false, user: null };
  return {
    allowed: isAllowedReviewer(user.email),
    user,
  };
}

export function reviewAccessError(access: ReviewerAccess) {
  return Response.json(
    {
      error: {
        code: access.user ? "reviewer_forbidden" : "reviewer_sign_in_required",
        message: access.user
          ? "This account is not on the reviewer allowlist."
          : "Sign in with an authorised reviewer account.",
      },
    },
    {
      status: access.user ? 403 : 401,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}

function isAllowedReviewer(email: string) {
  const allowlist = (process.env.REVIEWER_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.trim().toLowerCase());
}
