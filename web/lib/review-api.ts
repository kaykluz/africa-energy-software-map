import {
  reviewAccessError,
  reviewApiAccess,
  type ReviewerAccess,
} from "@/lib/review-auth";

const maximumReviewBodyBytes = 12_000;

export async function authorisedReviewer() {
  const access = await reviewApiAccess();
  return access.allowed
    ? { ok: true as const, access }
    : { ok: false as const, response: reviewAccessError(access) };
}

export async function readReviewBody(
  request: Request,
  maximumBytes = maximumReviewBodyBytes,
) {
  if (!sameOrigin(request)) {
    return {
      ok: false as const,
      response: reviewError(
        "origin_rejected",
        "Make this change from the review workspace.",
        403,
      ),
    };
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return {
      ok: false as const,
      response: reviewError(
        "content_type",
        "The review change must use JSON.",
        415,
      ),
    };
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > maximumBytes) {
    return {
      ok: false as const,
      response: reviewError(
        "too_large",
        "The review note is too large.",
        413,
      ),
    };
  }
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > maximumBytes) {
      return {
        ok: false as const,
        response: reviewError(
          "too_large",
          "The review note is too large.",
          413,
        ),
      };
    }
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("invalid");
    }
    return {
      ok: true as const,
      value: value as Record<string, unknown>,
    };
  } catch {
    return {
      ok: false as const,
      response: reviewError(
        "invalid_json",
        "The review change could not be read.",
        400,
      ),
    };
  }
}

export function reviewJson(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: reviewHeaders(),
  });
}

export function reviewError(code: string, message: string, status: number) {
  return reviewJson({ error: { code, message } }, status);
}

export function reviewHeaders() {
  return {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
}

export function reviewReviewerEmail(access: ReviewerAccess) {
  return access.allowed ? access.user.email : "";
}

export function textValue(
  record: Record<string, unknown>,
  field: string,
  maximum: number,
) {
  const value = record[field];
  return typeof value === "string"
    ? value.trim().replaceAll("\u0000", "").slice(0, maximum)
    : "";
}

export function booleanValue(
  record: Record<string, unknown>,
  field: string,
) {
  return record[field] === true;
}

export function numberValue(
  record: Record<string, unknown>,
  field: string,
) {
  const value = record[field];
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || (fetchSite && fetchSite !== "same-origin")) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
