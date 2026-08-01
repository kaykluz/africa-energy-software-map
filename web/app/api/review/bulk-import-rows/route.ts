import { listBulkImportRows } from "@/db/bulk-imports";
import {
  authorisedReviewer,
  reviewError,
  reviewJson,
} from "@/lib/review-api";

const bulkImportIdPattern = /^bulk_[0-9a-f-]{36}$/i;

export async function GET(request: Request) {
  const authorisation = await authorisedReviewer();
  if (!authorisation.ok) return authorisation.response;
  const importId = new URL(request.url).searchParams.get("importId") ?? "";
  if (!bulkImportIdPattern.test(importId)) {
    return reviewError(
      "bulk_import_id_invalid",
      "Choose a valid candidate import.",
      400,
    );
  }
  return reviewJson(await listBulkImportRows(importId));
}
