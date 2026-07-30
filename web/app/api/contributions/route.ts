import {
  createReceipt,
  sha256,
  validateContribution,
} from "@/lib/contribution-intake";
import { isContributionIntakePaused } from "@/db/operations";
import {
  reserveRateLimit,
  storeContribution,
} from "@/db/contributions";

const maximumBodyBytes = 20_000;
const dailyLimit = 5;

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return errorResponse(
      "origin_rejected",
      "Submit the form from the Africa Energy Software Map.",
      403,
    );
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return errorResponse(
      "content_type",
      "The contribution must use JSON.",
      415,
    );
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > maximumBodyBytes) {
    return errorResponse(
      "too_large",
      "The contribution is too large. Link to supporting material instead.",
      413,
    );
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > maximumBodyBytes) {
      return errorResponse(
        "too_large",
        "The contribution is too large. Link to supporting material instead.",
        413,
      );
    }
    body = JSON.parse(raw);
  } catch {
    return errorResponse(
      "invalid_json",
      "The contribution could not be read.",
      400,
    );
  }

  const validation = validateContribution(body);
  if (!validation.ok) {
    return Response.json(
      {
        error: {
          code: "validation",
          message: validation.message,
          fields: validation.fields,
        },
      },
      { status: 422, headers: responseHeaders() },
    );
  }

  const now = new Date();
  const receipt = createReceipt(validation.value.type, now);
  if (validation.value.companyWebsite) {
    return Response.json(
      {
        id: receipt.id,
        status: "received",
        statusLabel: "Awaiting intake review",
        statusUrl: null,
      },
      { status: 201, headers: responseHeaders() },
    );
  }

  if (await isContributionIntakePaused()) {
    return errorResponse(
      "intake_paused",
      "Contributions are temporarily paused. Please try again later.",
      503,
    );
  }

  const rateWindow = now.toISOString().slice(0, 10);
  const rateKey = await sha256(
    [
      rateWindow,
      request.headers.get("cf-connecting-ip") ?? "unknown",
      request.headers.get("user-agent") ?? "unknown",
    ].join("|"),
  );
  if (!(await reserveRateLimit(rateKey, rateWindow, dailyLimit))) {
    return errorResponse(
      "rate_limited",
      "This browser has reached today’s contribution limit. Try again tomorrow.",
      429,
    );
  }

  const tokenHash = await sha256(receipt.token);
  await storeContribution({
    contribution: validation.value,
    id: receipt.id,
    tokenHash,
    rateWindow,
    now: now.toISOString(),
  });
  const statusUrl = `/contribute/status/${encodeURIComponent(
    receipt.id,
  )}?token=${encodeURIComponent(receipt.token)}`;

  return Response.json(
    {
      id: receipt.id,
      status: "received",
      statusLabel: "Awaiting intake review",
      statusUrl,
    },
    { status: 201, headers: responseHeaders() },
  );
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

function errorResponse(code: string, message: string, status: number) {
  return Response.json(
    { error: { code, message } },
    { status, headers: responseHeaders() },
  );
}

function responseHeaders() {
  return {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  };
}
