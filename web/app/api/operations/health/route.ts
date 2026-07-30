import { getOperationsStatus } from "@/db/operations";
import { authorisedOperationsRequest } from "@/lib/operations-auth";

export async function GET(request: Request) {
  if (!(await authorisedOperationsRequest(request))) {
    return Response.json(
      { error: { code: "operations_unauthorised", message: "Not authorised." } },
      { status: 401, headers: responseHeaders() },
    );
  }
  const status = await getOperationsStatus();
  return Response.json(
    {
      status:
        status.expiredContacts === 0 && status.lastMaintenance
          ? "healthy"
          : "attention",
      checkedAt: new Date().toISOString(),
      ...status,
    },
    { headers: responseHeaders() },
  );
}

function responseHeaders() {
  return {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
}
