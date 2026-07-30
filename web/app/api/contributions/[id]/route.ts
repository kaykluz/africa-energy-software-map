import { findContributionByReceipt } from "@/db/contributions";
import { sha256, statusLabel } from "@/lib/contribution-intake";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!/^AEM-[A-Z]{3}-\d{8}-[A-F0-9]{16}$/.test(id) || token.length !== 48) {
    return notFound();
  }
  const contribution = await findContributionByReceipt(
    id,
    await sha256(token),
  );
  if (!contribution) return notFound();

  return Response.json(
    {
      id: contribution.id,
      type: contribution.submissionType,
      status: contribution.status,
      statusLabel: statusLabel(contribution.status),
      submittedAt: contribution.submittedAt,
      updatedAt: contribution.updatedAt,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}

function notFound() {
  return Response.json(
    {
      error: {
        code: "receipt_not_found",
        message: "This receipt link is invalid or no longer available.",
      },
    },
    {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
