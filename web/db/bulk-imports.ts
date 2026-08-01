import { getD1Database } from "./index";
import type { BulkRowReviewRecord } from "./bulk-reviews";
import type {
  BulkImportRow,
  ValidatedBulkImport,
} from "@/lib/bulk-import";
import { normalizeSourceUrl } from "@/lib/source-url";

export type BulkImportRecord = {
  id: string;
  originalFilename: string;
  workbookHash: string;
  status: string;
  uploadedBy: string;
  uploadedAt: string;
  rowCount: number;
  entityCount: number;
  plannedBatchCount: number;
  warnings: string[];
  batches: Array<{
    number: number;
    rowKeys: string[];
    entityCount: number;
    assertionEstimate: number;
  }>;
  version: number;
};

export type BulkImportRowRecord = {
  id: string;
  importId: string;
  rowNumber: number;
  rowKey: string;
  recordType: string;
  status: string;
  payload: BulkImportRow;
  effectivePayload: BulkImportRow;
  review: BulkRowReviewRecord | null;
  promotedAssertionCount: number;
  createdAt: string;
};

export async function listBulkImports(): Promise<BulkImportRecord[]> {
  const database = await getD1Database();
  const result = await database
    .prepare(
      `SELECT
         id,
         original_filename AS originalFilename,
         workbook_hash AS workbookHash,
         status,
         uploaded_by AS uploadedBy,
         uploaded_at AS uploadedAt,
         row_count AS rowCount,
         entity_count AS entityCount,
         planned_batch_count AS plannedBatchCount,
         warnings_json AS warningsJson,
         batch_plan_json AS batchPlanJson,
         version
       FROM bulk_imports
       ORDER BY uploaded_at DESC
       LIMIT 25`,
    )
    .all<
      Omit<BulkImportRecord, "warnings" | "batches"> & {
        warningsJson: string;
        batchPlanJson: string;
      }
    >();
  return result.results.map((record) => ({
    ...record,
    warnings: parseJsonArray(record.warningsJson),
    batches: JSON.parse(record.batchPlanJson) as BulkImportRecord["batches"],
  }));
}

export async function listBulkImportRows(
  importId: string,
): Promise<BulkImportRowRecord[]> {
  const database = await getD1Database();
  const result = await database
    .prepare(
      `SELECT
         rows.id,
         rows.import_id AS importId,
         rows.row_number AS rowNumber,
         rows.row_key AS rowKey,
         rows.record_type AS recordType,
         rows.status,
         rows.payload_json AS payloadJson,
         rows.created_at AS createdAt,
         reviews.decision,
         reviews.amended_payload_json AS amendedPayloadJson,
         reviews.normalized_source_url AS normalizedSourceUrl,
         reviews.source_opened AS sourceOpened,
         reviews.source_direct AS sourceDirect,
         reviews.source_supports AS sourceSupports,
         reviews.safety_checked AS safetyChecked,
         reviews.notes AS reviewNotes,
         reviews.reviewer_email AS reviewerEmail,
         reviews.reviewed_at AS reviewedAt,
         reviews.updated_at AS updatedAt,
         reviews.version AS reviewVersion,
         (
           SELECT COUNT(*) FROM promoted_assertions promoted
           WHERE promoted.row_id = rows.id
         ) AS promotedAssertionCount
       FROM bulk_import_rows rows
       LEFT JOIN bulk_row_reviews reviews ON reviews.row_id = rows.id
       WHERE rows.import_id = ?
       ORDER BY rows.row_number ASC
       LIMIT 100`,
    )
    .bind(importId)
    .all<
      Omit<
        BulkImportRowRecord,
        "payload" | "effectivePayload" | "review"
      > & {
        payloadJson: string;
        decision: BulkRowReviewRecord["decision"] | null;
        amendedPayloadJson: string | null;
        normalizedSourceUrl: string | null;
        sourceOpened: number | boolean | null;
        sourceDirect: number | boolean | null;
        sourceSupports: number | boolean | null;
        safetyChecked: number | boolean | null;
        reviewNotes: string | null;
        reviewerEmail: string | null;
        reviewedAt: string | null;
        updatedAt: string | null;
        reviewVersion: number | null;
      }
    >();
  return result.results.map(
    ({
      payloadJson,
      decision,
      amendedPayloadJson,
      normalizedSourceUrl,
      sourceOpened,
      sourceDirect,
      sourceSupports,
      safetyChecked,
      reviewNotes,
      reviewerEmail,
      reviewedAt,
      updatedAt,
      reviewVersion,
      ...record
    }) => {
      const payload = JSON.parse(payloadJson) as BulkImportRow;
      const amendments = amendedPayloadJson
        ? (JSON.parse(amendedPayloadJson) as BulkRowReviewRecord["amendments"])
        : {};
      const sourceUrl =
        normalizedSourceUrl ?? normalizeSourceUrl(payload.source_url);
      return {
        ...record,
        payload,
        effectivePayload: {
          ...payload,
          ...amendments,
          source_url: sourceUrl,
        },
        review:
          decision &&
          reviewerEmail &&
          reviewedAt &&
          updatedAt &&
          reviewVersion
            ? {
                rowId: record.id,
                decision,
                amendments,
                normalizedSourceUrl: sourceUrl,
                sourceOpened: Boolean(sourceOpened),
                sourceDirect: Boolean(sourceDirect),
                sourceSupports: Boolean(sourceSupports),
                safetyChecked: Boolean(safetyChecked),
                notes: reviewNotes,
                reviewerEmail,
                reviewedAt,
                updatedAt,
                version: reviewVersion,
              }
            : null,
      };
    },
  );
}

export async function storeBulkImport(
  value: ValidatedBulkImport,
  reviewerEmail: string,
): Promise<BulkImportRecord> {
  const database = await getD1Database();
  const duplicate = await database
    .prepare("SELECT id FROM bulk_imports WHERE workbook_hash = ?")
    .bind(value.workbookHash)
    .first<{ id: string }>();
  if (duplicate) {
    throw new DuplicateBulkImportError(
      "This workbook has already been imported.",
    );
  }
  const now = new Date().toISOString();
  const id = `bulk_${crypto.randomUUID()}`;
  const payloadHash = await sha256(JSON.stringify(value.rows));
  const record: BulkImportRecord = {
    id,
    originalFilename: value.filename,
    workbookHash: value.workbookHash,
    status: "candidate",
    uploadedBy: reviewerEmail,
    uploadedAt: now,
    rowCount: value.rows.length,
    entityCount: value.entityCount,
    plannedBatchCount: value.batches.length,
    warnings: value.warnings,
    batches: value.batches,
    version: 1,
  };
  await database.batch([
    database
      .prepare(
        `INSERT INTO bulk_imports (
           id, original_filename, workbook_hash, payload_hash, status,
           uploaded_by, uploaded_at, row_count, entity_count,
           planned_batch_count, warnings_json, batch_plan_json, version
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        record.id,
        record.originalFilename,
        record.workbookHash,
        payloadHash,
        record.status,
        record.uploadedBy,
        record.uploadedAt,
        record.rowCount,
        record.entityCount,
        record.plannedBatchCount,
        JSON.stringify(record.warnings),
        JSON.stringify(record.batches),
        record.version,
      ),
    ...value.rows.map((row, index) =>
      database
        .prepare(
          `INSERT INTO bulk_import_rows (
             id, import_id, row_number, row_key, record_type, status,
             payload_json, created_at
           ) VALUES (?, ?, ?, ?, ?, 'candidate', ?, ?)`,
        )
        .bind(
          `${record.id}_${String(index + 1).padStart(3, "0")}`,
          record.id,
          index + 4,
          row.row_key,
          row.record_type,
          JSON.stringify(row),
          now,
        ),
    ),
    database
      .prepare(
        `INSERT INTO review_audit_events (
           id, record_type, record_id, action, before_json, after_json,
           reason, reviewer_email, occurred_at
         ) VALUES (?, 'bulk_import', ?, 'candidate_imported', NULL, ?, ?, ?, ?)`,
      )
      .bind(
        `evt_${crypto.randomUUID()}`,
        record.id,
        JSON.stringify({
          rowCount: record.rowCount,
          entityCount: record.entityCount,
          plannedBatchCount: record.plannedBatchCount,
          workbookHash: record.workbookHash,
        }),
        "Reviewer uploaded a validated candidate workbook.",
        reviewerEmail,
        now,
      ),
  ]);
  return record;
}

function parseJsonArray(value: string) {
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === "string")
    : [];
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export class DuplicateBulkImportError extends Error {}
