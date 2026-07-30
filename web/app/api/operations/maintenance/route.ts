import { runMaintenance } from "@/db/operations";
import { authorisedOperationsRequest } from "@/lib/operations-auth";

export async function POST(request: Request) {
  if (!(await authorisedOperationsRequest(request))) {
    return Response.json(
      { error: { code: "operations_unauthorised", message: "Not authorised." } },
      { status: 401, headers: responseHeaders() },
    );
  }
  return Response.json(await runMaintenance(), {
    headers: responseHeaders(),
  });
}

function responseHeaders() {
  return {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
}
