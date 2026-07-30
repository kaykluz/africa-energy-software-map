import {
  DuplicateBulkImportError,
  listBulkImports,
  storeBulkImport,
} from "@/db/bulk-imports";
import { validateBulkImport } from "@/lib/bulk-import";
import {
  authorisedReviewer,
  readReviewBody,
  reviewError,
  reviewJson,
  reviewReviewerEmail,
} from "@/lib/review-api";

const maximumBulkBodyBytes = 400_000;

export async function GET() {
  const authorisation = await authorisedReviewer();
  if (!authorisation.ok) return authorisation.response;
  return reviewJson(await listBulkImports());
}

export async function POST(request: Request) {
  const authorisation = await authorisedReviewer();
  if (!authorisation.ok) return authorisation.response;
  const body = await readReviewBody(request, maximumBulkBodyBytes);
  if (!body.ok) return body.response;
  const validation = validateBulkImport(body.value);
  if (!validation.ok) {
    return reviewJson(
      {
        error: {
          code: "bulk_import_invalid",
          message: "The workbook needs attention before it can enter review.",
          details: validation.errors,
        },
      },
      422,
    );
  }
  try {
    return reviewJson(
      await storeBulkImport(
        validation.value,
        reviewReviewerEmail(authorisation.access),
      ),
      201,
    );
  } catch (error) {
    if (error instanceof DuplicateBulkImportError) {
      return reviewError("bulk_import_duplicate", error.message, 409);
    }
    throw error;
  }
}
