import { getD1Database } from "./index";
import type { ReviewAssertion } from "@/lib/review-data";
import type { Source } from "@/lib/registry-data";
import {
  bulkImportFields,
  splitPipe,
  validateBulkImport,
  type BulkImportRow,
} from "@/lib/bulk-import";
import { normalizeSourceUrl } from "@/lib/source-url";

export const bulkRowDecisions = [
  "accept",
  "amend",
  "reject",
  "needs_evidence",
] as const;

export const bulkAmendableFields = [
  "organisation_name",
  "existing_organisation_id",
  "organisation_website",
  "organisation_description",
  "country_of_origin",
  "headquarters_country",
  "origin_classification",
  "organisation_lifecycle_status",
  "primary_organisation_role_id",
  "additional_organisation_role_ids",
  "organisation_sector_ids",
  "organisation_segment_ids",
  "organisation_alias",
  "organisation_alias_type",
  "related_organisation_id",
  "organisation_relationship_type",
  "organisation_software_relationship_type",
  "valid_from",
  "valid_to",
  "product_name",
  "existing_product_id",
  "product_website",
  "open_source_url",
  "product_description",
  "primary_category_id",
  "sector_id",
  "product_lifecycle_status",
  "access_model",
  "deployment_country_iso2",
  "customer_name",
  "customer_disclosure",
  "deployment_lifecycle_status",
  "started_year",
  "source_title",
  "source_publisher",
  "source_publication_date",
  "source_independence_class",
  "source_license",
  "evidence_status",
  "source_locator",
  "notes",
] as const;

export type BulkRowDecision = (typeof bulkRowDecisions)[number];
export type BulkAmendableField = (typeof bulkAmendableFields)[number];
export type BulkRowReviewRecord = {
  rowId: string;
  decision: BulkRowDecision;
  amendments: Partial<Record<BulkAmendableField, string>>;
  normalizedSourceUrl: string;
  sourceOpened: boolean;
  sourceDirect: boolean;
  sourceSupports: boolean;
  safetyChecked: boolean;
  notes: string | null;
  reviewerEmail: string;
  reviewedAt: string;
  updatedAt: string;
  version: number;
};
export type PromotedReviewAssertion = ReviewAssertion & {
  rowId: string;
  batchId: string;
  createdAt: string;
};

export async function saveBulkRowReview({
  rowId,
  decision,
  amendments,
  sourceUrl,
  sourceOpened,
  sourceDirect,
  sourceSupports,
  safetyChecked,
  notes,
  reviewerEmail,
  expectedVersion,
}: {
  rowId: string;
  decision: BulkRowDecision;
  amendments: Partial<Record<BulkAmendableField, string>>;
  sourceUrl: string;
  sourceOpened: boolean;
  sourceDirect: boolean;
  sourceSupports: boolean;
  safetyChecked: boolean;
  notes: string;
  reviewerEmail: string;
  expectedVersion: number;
}) {
  const database = await getD1Database();
  const rowRecord = await database
    .prepare(
      `SELECT
         rows.id,
         rows.import_id AS importId,
         rows.row_key AS rowKey,
         rows.payload_json AS payloadJson,
         imports.batch_plan_json AS batchPlanJson
       FROM bulk_import_rows rows
       JOIN bulk_imports imports ON imports.id = rows.import_id
       WHERE rows.id = ?`,
    )
    .bind(rowId)
    .first<{
      id: string;
      importId: string;
      rowKey: string;
      payloadJson: string;
      batchPlanJson: string;
    }>();
  if (!rowRecord) throw new BulkRowNotFoundError("Candidate row not found.");
  const existing = await findBulkRowReview(database, rowId);
  enforceVersion(existing?.version ?? 0, expectedVersion);
  const original = JSON.parse(rowRecord.payloadJson) as BulkImportRow;
  const normalizedSourceUrl = normalizeSourceUrl(sourceUrl || original.source_url);
  if (decision === "accept" && Object.keys(amendments).length) {
    throw new BulkRowValidationError([
      "Choose Amend when changing candidate fields.",
    ]);
  }
  const effectiveAmendments = decision === "amend" ? amendments : {};
  const effective = {
    ...original,
    ...effectiveAmendments,
    source_url: normalizedSourceUrl,
  };
  const validation = validateBulkImport({
    filename: "reviewed-candidate.xlsx",
    workbookHash: "0".repeat(64),
    headers: [...bulkImportFields],
    rows: [effective],
  });
  if (!validation.ok) {
    throw new BulkRowValidationError(validation.errors);
  }
  const reviewedRow = validation.value.rows[0];
  const normalizedOriginalUrl = normalizeSourceUrl(original.source_url);
  const changed =
    normalizedSourceUrl !== normalizedOriginalUrl ||
    bulkAmendableFields.some(
      (field) =>
        Object.hasOwn(amendments, field) && amendments[field] !== original[field],
    );
  if (decision === "amend" && !changed) {
    throw new BulkRowValidationError([
      "Change at least one record field before saving an amendment.",
    ]);
  }
  if (decision !== "accept" && decision !== "amend" && !notes.trim()) {
    throw new BulkRowValidationError([
      "Add a short review note for this decision.",
    ]);
  }
  if (
    ["accept", "amend"].includes(decision) &&
    (!sourceOpened || !sourceDirect || !sourceSupports || !safetyChecked)
  ) {
    throw new BulkRowValidationError([
      "Confirm the source, direct-link, support and safety checks before approval.",
    ]);
  }
  const now = new Date().toISOString();
  const review: BulkRowReviewRecord = {
    rowId,
    decision,
    amendments: effectiveAmendments,
    normalizedSourceUrl,
    sourceOpened,
    sourceDirect,
    sourceSupports,
    safetyChecked,
    notes: notes.trim() || null,
    reviewerEmail,
    reviewedAt: existing?.reviewedAt ?? now,
    updatedAt: now,
    version: (existing?.version ?? 0) + 1,
  };
  const batchNumber = batchForRow(rowRecord.batchPlanJson, rowRecord.rowKey);
  const assertions = ["accept", "amend"].includes(decision)
    ? await buildPromotedAssertions({
        rowId,
        importId: rowRecord.importId,
        rowKey: rowRecord.rowKey,
        batchNumber,
        row: reviewedRow,
        reviewerEmail,
        createdAt: now,
        reviewNotes: notes,
      })
    : [];
  const statements = [
    database
      .prepare(
        `INSERT INTO bulk_row_reviews (
           row_id, decision, amended_payload_json, normalized_source_url,
           source_opened, source_direct, source_supports, safety_checked,
           notes, reviewer_email, reviewed_at, updated_at, version
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(row_id) DO UPDATE SET
           decision = excluded.decision,
           amended_payload_json = excluded.amended_payload_json,
           normalized_source_url = excluded.normalized_source_url,
           source_opened = excluded.source_opened,
           source_direct = excluded.source_direct,
           source_supports = excluded.source_supports,
           safety_checked = excluded.safety_checked,
           notes = excluded.notes,
           reviewer_email = excluded.reviewer_email,
           updated_at = excluded.updated_at,
           version = excluded.version`,
      )
      .bind(
        rowId,
        review.decision,
        decision === "amend" ? JSON.stringify(review.amendments) : null,
        review.normalizedSourceUrl,
        review.sourceOpened ? 1 : 0,
        review.sourceDirect ? 1 : 0,
        review.sourceSupports ? 1 : 0,
        review.safetyChecked ? 1 : 0,
        review.notes,
        review.reviewerEmail,
        review.reviewedAt,
        review.updatedAt,
        review.version,
      ),
    database
      .prepare("UPDATE bulk_import_rows SET status = ? WHERE id = ?")
      .bind(decision, rowId),
    database
      .prepare(
        `DELETE FROM assertion_reviews
         WHERE assertion_id IN (
           SELECT id FROM promoted_assertions WHERE row_id = ?
         )`,
      )
      .bind(rowId),
    database
      .prepare(
        `DELETE FROM source_reviews
         WHERE source_id IN (
           SELECT source_id FROM promoted_assertions WHERE row_id = ?
         )
         AND source_id NOT IN (
           SELECT source_id FROM promoted_assertions WHERE row_id <> ?
         )`,
      )
      .bind(rowId, rowId),
    database
      .prepare("DELETE FROM promoted_assertions WHERE row_id = ?")
      .bind(rowId),
    ...assertions.map((assertion) => promotedAssertionStatement(database, assertion)),
    database
      .prepare(
        `UPDATE bulk_imports
         SET status = CASE
           WHEN EXISTS (
             SELECT 1 FROM bulk_import_rows
             WHERE import_id = ? AND status = 'candidate'
           ) THEN CASE
             WHEN EXISTS (
               SELECT 1 FROM bulk_import_rows
               WHERE import_id = ? AND status <> 'candidate'
             ) THEN 'in_review'
             ELSE 'candidate'
           END
           WHEN EXISTS (
             SELECT 1 FROM bulk_import_rows
             WHERE import_id = ? AND status = 'needs_evidence'
           ) THEN 'blocked'
           ELSE 'reviewed'
         END,
         version = version + 1
         WHERE id = ?`,
      )
      .bind(
        rowRecord.importId,
        rowRecord.importId,
        rowRecord.importId,
        rowRecord.importId,
      ),
    auditStatement(database, {
      recordType: "bulk_import_row",
      recordId: rowId,
      action: existing ? "candidate_review_updated" : "candidate_review_created",
      before: existing,
      after: review,
      reason: notes,
      reviewerEmail,
      occurredAt: now,
    }),
  ];
  if (assertions.length) {
    statements.push(
      auditStatement(database, {
        recordType: "promoted_assertion",
        recordId: rowId,
        action: "candidate_promoted",
        before: null,
        after: { assertionCount: assertions.length, batchNumber },
        reason: notes,
        reviewerEmail,
        occurredAt: now,
      }),
    );
  } else if (
    existing &&
    ["accept", "amend"].includes(existing.decision)
  ) {
    statements.push(
      auditStatement(database, {
        recordType: "promoted_assertion",
        recordId: rowId,
        action: "candidate_promotion_removed",
        before: { decision: existing.decision },
        after: { decision },
        reason: notes,
        reviewerEmail,
        occurredAt: now,
      }),
    );
  }
  await database.batch(statements);
  const importRecord = await database
    .prepare("SELECT status, version FROM bulk_imports WHERE id = ?")
    .bind(rowRecord.importId)
    .first<{ status: string; version: number }>();
  return {
    review,
    status: decision,
    promotedAssertionCount: assertions.length,
    importStatus: importRecord?.status ?? "in_review",
    importVersion: importRecord?.version ?? 1,
  };
}

export async function listPromotedAssertions(): Promise<
  PromotedReviewAssertion[]
> {
  const database = await getD1Database();
  const result = await database
    .prepare(
      `SELECT
         id,
         row_id AS rowId,
         batch_id AS batchId,
         subject_type AS subjectType,
         subject_id AS subjectId,
         subject_label AS subjectLabel,
         subject_context AS subjectContext,
         subject_href AS subjectHref,
         predicate,
         value,
         source_id AS sourceId,
         source_title AS sourceTitle,
         source_publisher AS sourcePublisher,
         source_url AS sourceUrl,
         source_license AS sourceLicense,
         source_independence AS sourceIndependence,
         locator,
         evidence_status AS evidenceStatus,
         notes,
         created_at AS createdAt
       FROM promoted_assertions
       ORDER BY created_at ASC, id ASC`,
    )
    .all<{
      id: string;
      rowId: string;
      batchId: string;
      subjectType: string;
      subjectId: string;
      subjectLabel: string;
      subjectContext: string;
      subjectHref: string;
      predicate: string;
      value: string;
      sourceId: string;
      sourceTitle: string;
      sourcePublisher: string;
      sourceUrl: string;
      sourceLicense: string;
      sourceIndependence: string;
      locator: string;
      evidenceStatus: ReviewAssertion["evidenceStatus"];
      notes: string;
      createdAt: string;
    }>();
  return result.results.map((item) => ({
    id: item.id,
    rowId: item.rowId,
    batchId: item.batchId,
    createdAt: item.createdAt,
    subjectType: item.subjectType,
    subjectId: item.subjectId,
    subjectLabel: item.subjectLabel,
    subjectContext: item.subjectContext,
    subjectHref: item.subjectHref,
    predicate: item.predicate,
    predicateLabel: sentenceLabel(item.predicate),
    value: item.value,
    sourceId: item.sourceId,
    sourceTitle: item.sourceTitle,
    sourcePublisher: item.sourcePublisher,
    sourceUrl: item.sourceUrl,
    sourceLicense: item.sourceLicense,
    sourceIndependence: sentenceLabel(item.sourceIndependence),
    locator: item.locator,
    evidenceStatus: item.evidenceStatus,
    notes: item.notes,
    reviewedBy: "",
    reviewedAt: "",
    validFrom: "",
    validTo: "",
    assist: {
      priority: 40,
      recommendedAction: "editorial_review",
      signals: ["human_reviewed_bulk_candidate"],
      automationCanDecide: false,
    },
  }));
}

export async function listPromotedSources(): Promise<Source[]> {
  const database = await getD1Database();
  const result = await database
    .prepare(
      `SELECT
         source_id AS id,
         MIN(source_title) AS title,
         MIN(source_publisher) AS publisher,
         MIN(source_url) AS url,
         MIN(source_license) AS sourceLicense,
         MIN(source_independence) AS independenceClass,
         MIN(notes) AS notes,
         MIN(created_at) AS retrieved
       FROM promoted_assertions
       GROUP BY source_id
       ORDER BY MIN(created_at) ASC, source_id ASC`,
    )
    .all<{
      id: string;
      title: string;
      publisher: string;
      url: string;
      sourceLicense: string;
      independenceClass: string;
      notes: string;
      retrieved: string;
    }>();
  return result.results.map((record) => ({
    ...record,
    sourceType: "web",
    independence: sentenceLabel(record.independenceClass),
    automationPermitted: false,
  }));
}

export async function promotedSourceExists(sourceId: string) {
  const database = await getD1Database();
  return database
    .prepare("SELECT source_id FROM promoted_assertions WHERE source_id = ?")
    .bind(sourceId)
    .first<{ sourceId: string }>()
    .then(Boolean);
}

export async function promotedAssertionBatchId(assertionId: string) {
  const database = await getD1Database();
  return database
    .prepare("SELECT batch_id AS batchId FROM promoted_assertions WHERE id = ?")
    .bind(assertionId)
    .first<{ batchId: string }>()
    .then((record) => record?.batchId ?? null);
}

async function findBulkRowReview(database: D1Database, rowId: string) {
  return database
    .prepare(
      `SELECT
         row_id AS rowId,
         decision,
         amended_payload_json AS amendedPayloadJson,
         normalized_source_url AS normalizedSourceUrl,
         source_opened AS sourceOpened,
         source_direct AS sourceDirect,
         source_supports AS sourceSupports,
         safety_checked AS safetyChecked,
         notes,
         reviewer_email AS reviewerEmail,
         reviewed_at AS reviewedAt,
         updated_at AS updatedAt,
         version
       FROM bulk_row_reviews
       WHERE row_id = ?`,
    )
    .bind(rowId)
    .first<{
      rowId: string;
      decision: BulkRowDecision;
      amendedPayloadJson: string | null;
      normalizedSourceUrl: string;
      sourceOpened: number | boolean;
      sourceDirect: number | boolean;
      sourceSupports: number | boolean;
      safetyChecked: number | boolean;
      notes: string | null;
      reviewerEmail: string;
      reviewedAt: string;
      updatedAt: string;
      version: number;
    }>()
    .then((record) =>
      record
        ? {
            rowId: record.rowId,
            decision: record.decision,
            amendments: record.amendedPayloadJson
              ? (JSON.parse(record.amendedPayloadJson) as Partial<
                  Record<BulkAmendableField, string>
                >)
              : {},
            normalizedSourceUrl: record.normalizedSourceUrl,
            sourceOpened: Boolean(record.sourceOpened),
            sourceDirect: Boolean(record.sourceDirect),
            sourceSupports: Boolean(record.sourceSupports),
            safetyChecked: Boolean(record.safetyChecked),
            notes: record.notes,
            reviewerEmail: record.reviewerEmail,
            reviewedAt: record.reviewedAt,
            updatedAt: record.updatedAt,
            version: record.version,
          }
        : null,
    );
}

async function buildPromotedAssertions({
  rowId,
  importId,
  rowKey,
  batchNumber,
  row,
  reviewerEmail,
  createdAt,
  reviewNotes,
}: {
  rowId: string;
  importId: string;
  rowKey: string;
  batchNumber: number;
  row: BulkImportRow;
  reviewerEmail: string;
  createdAt: string;
  reviewNotes: string;
}) {
  const organisationId =
    row.existing_organisation_id ||
    (row.organisation_name
      ? `cand_org_${await shortHash(`${row.organisation_name}\n${row.organisation_website}`)}`
      : "");
  const productId =
    row.existing_product_id ||
    (row.product_name
      ? `cand_prod_${await shortHash(`${organisationId}\n${row.product_name}`)}`
      : "");
  const deploymentId = `cand_dep_${await shortHash(`${importId}\n${rowKey}`)}`;
  const sourceId = `cand_src_${await shortHash(row.source_url)}`;
  const batchId = `${importId}/batch-${String(batchNumber).padStart(2, "0")}`;
  const common = {
    rowId,
    importId,
    batchId,
    sourceId,
    sourceTitle: row.source_title,
    sourcePublisher: row.source_publisher,
    sourceUrl: row.source_url,
    sourceLicense: row.source_license || "unknown",
    sourceIndependence: row.source_independence_class,
    locator: row.source_locator,
    evidenceStatus: row.evidence_status,
    notes: [
      `Promoted from reviewed bulk row ${rowKey}.`,
      row.notes,
      reviewNotes.trim(),
    ]
      .filter(Boolean)
      .join(" "),
    createdBy: reviewerEmail,
    createdAt,
  };
  const candidates: Array<{
    subjectType: string;
    subjectId: string;
    subjectLabel: string;
    subjectContext: string;
    subjectHref: string;
    predicate: string;
    value: string;
  }> = [];
  const add = (
    subjectType: string,
    subjectId: string,
    subjectLabel: string,
    subjectContext: string,
    subjectHref: string,
    predicate: string,
    value: string,
  ) => {
    if (value.trim()) {
      candidates.push({
        subjectType,
        subjectId,
        subjectLabel,
        subjectContext,
        subjectHref,
        predicate,
        value: value.trim(),
      });
    }
  };
  const organisationContext = "Organisation candidate";
  const organisationHref = row.existing_organisation_id
    ? `/organisations/${row.existing_organisation_id}`
    : "/companies";
  if (
    ["organisation", "product", "deployment"].includes(row.record_type) &&
    !row.existing_organisation_id
  ) {
    add("organisation", organisationId, row.organisation_name, organisationContext, organisationHref, "name", row.organisation_name);
    add("organisation", organisationId, row.organisation_name, organisationContext, organisationHref, "website", row.organisation_website);
    add("organisation", organisationId, row.organisation_name, organisationContext, organisationHref, "description", row.organisation_description);
    add("organisation", organisationId, row.organisation_name, organisationContext, organisationHref, "country_of_origin", row.country_of_origin);
    add("organisation", organisationId, row.organisation_name, organisationContext, organisationHref, "headquarters_country", row.headquarters_country);
    add("organisation", organisationId, row.organisation_name, organisationContext, organisationHref, "origin_classification", row.origin_classification);
    add("organisation", organisationId, row.organisation_name, organisationContext, organisationHref, "lifecycle_status", row.organisation_lifecycle_status);
  }
  if (
    ["product", "deployment"].includes(row.record_type) &&
    !row.existing_product_id
  ) {
    add("product", productId, row.product_name, row.organisation_name, "/directory", "name", row.product_name);
    add("product", productId, row.product_name, row.organisation_name, "/directory", "organisation_id", organisationId);
    add("product", productId, row.product_name, row.organisation_name, "/directory", "website", row.product_website);
    add("product", productId, row.product_name, row.organisation_name, "/directory", "open_source_url", row.open_source_url);
    add("product", productId, row.product_name, row.organisation_name, "/directory", "description", row.product_description);
    add("product", productId, row.product_name, row.organisation_name, "/directory", "primary_category_id", row.primary_category_id);
    add("product", productId, row.product_name, row.organisation_name, "/directory", "sector_id", row.sector_id);
    add("product", productId, row.product_name, row.organisation_name, "/directory", "lifecycle_status", row.product_lifecycle_status);
    add("product", productId, row.product_name, row.organisation_name, "/directory", "access_model", row.access_model);
  }
  const roles = Array.from(
    new Set([
      row.primary_organisation_role_id,
      ...splitPipe(row.additional_organisation_role_ids),
    ].filter(Boolean)),
  );
  for (const roleId of roles) {
    const relationshipId = `orgrole_${await shortHash(`${organisationId}\n${roleId}`)}`;
    const label = `${row.organisation_name || organisationId} · ${roleId}`;
    add("organisation_role", relationshipId, label, "Organisation role", organisationHref, "organisation_id", organisationId);
    add("organisation_role", relationshipId, label, "Organisation role", organisationHref, "role_id", roleId);
    add("organisation_role", relationshipId, label, "Organisation role", organisationHref, "is_primary", roleId === row.primary_organisation_role_id ? "true" : "false");
    add("organisation_role", relationshipId, label, "Organisation role", organisationHref, "valid_from", row.valid_from);
    add("organisation_role", relationshipId, label, "Organisation role", organisationHref, "valid_to", row.valid_to);
  }
  for (const sectorId of splitPipe(row.organisation_sector_ids)) {
    const relationshipId = `orgsector_${await shortHash(`${organisationId}\n${sectorId}`)}`;
    const label = `${row.organisation_name || organisationId} · ${sectorId}`;
    add("organisation_sector", relationshipId, label, "Organisation sector", organisationHref, "organisation_id", organisationId);
    add("organisation_sector", relationshipId, label, "Organisation sector", organisationHref, "sector_id", sectorId);
    add("organisation_sector", relationshipId, label, "Organisation sector", organisationHref, "valid_from", row.valid_from);
    add("organisation_sector", relationshipId, label, "Organisation sector", organisationHref, "valid_to", row.valid_to);
  }
  for (const segmentId of splitPipe(row.organisation_segment_ids)) {
    const relationshipId = `orgsegment_${await shortHash(`${organisationId}\n${segmentId}`)}`;
    const label = `${row.organisation_name || organisationId} · ${segmentId}`;
    add("organisation_segment", relationshipId, label, "Organisation segment", organisationHref, "organisation_id", organisationId);
    add("organisation_segment", relationshipId, label, "Organisation segment", organisationHref, "segment_id", segmentId);
    add("organisation_segment", relationshipId, label, "Organisation segment", organisationHref, "valid_from", row.valid_from);
    add("organisation_segment", relationshipId, label, "Organisation segment", organisationHref, "valid_to", row.valid_to);
  }
  if (row.record_type === "organisation_alias") {
    const aliasId = `orgalias_${await shortHash(`${organisationId}\n${row.organisation_alias}\n${row.organisation_alias_type}`)}`;
    add("organisation_alias", aliasId, row.organisation_alias, organisationId, organisationHref, "organisation_id", organisationId);
    add("organisation_alias", aliasId, row.organisation_alias, organisationId, organisationHref, "alias", row.organisation_alias);
    add("organisation_alias", aliasId, row.organisation_alias, organisationId, organisationHref, "alias_type", row.organisation_alias_type);
    add("organisation_alias", aliasId, row.organisation_alias, organisationId, organisationHref, "valid_from", row.valid_from);
    add("organisation_alias", aliasId, row.organisation_alias, organisationId, organisationHref, "valid_to", row.valid_to);
  }
  if (row.record_type === "organisation_relationship") {
    const relationshipId = `orgrel_${await shortHash(`${organisationId}\n${row.related_organisation_id}\n${row.organisation_relationship_type}`)}`;
    const label = `${row.organisation_name || organisationId} · ${row.organisation_relationship_type}`;
    add("organisation_relationship", relationshipId, label, row.related_organisation_id, organisationHref, "organisation_id", organisationId);
    add("organisation_relationship", relationshipId, label, row.related_organisation_id, organisationHref, "related_organisation_id", row.related_organisation_id);
    add("organisation_relationship", relationshipId, label, row.related_organisation_id, organisationHref, "relationship_type", row.organisation_relationship_type);
    add("organisation_relationship", relationshipId, label, row.related_organisation_id, organisationHref, "valid_from", row.valid_from);
    add("organisation_relationship", relationshipId, label, row.related_organisation_id, organisationHref, "valid_to", row.valid_to);
  }
  if (row.record_type === "organisation_software_relationship") {
    const relationshipId = `orgsoft_${await shortHash(`${organisationId}\n${productId}\n${row.organisation_software_relationship_type}`)}`;
    const label = `${row.organisation_name || organisationId} · ${row.organisation_software_relationship_type}`;
    add("organisation_software_relationship", relationshipId, label, productId, organisationHref, "organisation_id", organisationId);
    add("organisation_software_relationship", relationshipId, label, productId, organisationHref, "product_id", productId);
    add("organisation_software_relationship", relationshipId, label, productId, organisationHref, "relationship_type", row.organisation_software_relationship_type);
    add("organisation_software_relationship", relationshipId, label, productId, organisationHref, "valid_from", row.valid_from);
    add("organisation_software_relationship", relationshipId, label, productId, organisationHref, "valid_to", row.valid_to);
  }
  if (row.record_type === "deployment") {
    const deploymentContext = `${row.deployment_country_iso2} · ${row.customer_name || "Undisclosed customer"}`;
    add("deployment", deploymentId, row.product_name, deploymentContext, "/deployments", "product_id", productId);
    add("deployment", deploymentId, row.product_name, deploymentContext, "/deployments", "country_iso2", row.deployment_country_iso2);
    add("deployment", deploymentId, row.product_name, deploymentContext, "/deployments", "customer_name", row.customer_name);
    add("deployment", deploymentId, row.product_name, deploymentContext, "/deployments", "customer_disclosure", row.customer_disclosure);
    add("deployment", deploymentId, row.product_name, deploymentContext, "/deployments", "lifecycle_status", row.deployment_lifecycle_status);
    add("deployment", deploymentId, row.product_name, deploymentContext, "/deployments", "started_year", row.started_year);
  }
  return Promise.all(
    candidates.map(async (candidate) => ({
      id: `asrt_bulk_${await shortHash(`${rowId}\n${candidate.subjectType}\n${candidate.subjectId}\n${candidate.predicate}`)}`,
      ...candidate,
      ...common,
    })),
  );
}

function promotedAssertionStatement(
  database: D1Database,
  assertion: Awaited<ReturnType<typeof buildPromotedAssertions>>[number],
) {
  return database
    .prepare(
      `INSERT INTO promoted_assertions (
         id, row_id, import_id, batch_id, subject_type, subject_id,
         subject_label, subject_context, subject_href, predicate, value,
         source_id, source_title, source_publisher, source_url,
         source_license, source_independence, locator, evidence_status,
         notes, created_by, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      assertion.id,
      assertion.rowId,
      assertion.importId,
      assertion.batchId,
      assertion.subjectType,
      assertion.subjectId,
      assertion.subjectLabel,
      assertion.subjectContext,
      assertion.subjectHref,
      assertion.predicate,
      assertion.value,
      assertion.sourceId,
      assertion.sourceTitle,
      assertion.sourcePublisher,
      assertion.sourceUrl,
      assertion.sourceLicense,
      assertion.sourceIndependence,
      assertion.locator,
      assertion.evidenceStatus,
      assertion.notes,
      assertion.createdBy,
      assertion.createdAt,
    );
}

function auditStatement(
  database: D1Database,
  event: {
    recordType: string;
    recordId: string;
    action: string;
    before: unknown;
    after: unknown;
    reason: string;
    reviewerEmail: string;
    occurredAt: string;
  },
) {
  return database
    .prepare(
      `INSERT INTO review_audit_events (
         id, record_type, record_id, action, before_json, after_json,
         reason, reviewer_email, occurred_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      `evt_${crypto.randomUUID()}`,
      event.recordType,
      event.recordId,
      event.action,
      event.before ? JSON.stringify(event.before) : null,
      event.after ? JSON.stringify(event.after) : null,
      event.reason || null,
      event.reviewerEmail,
      event.occurredAt,
    );
}

function batchForRow(batchPlanJson: string, rowKey: string) {
  const batches = JSON.parse(batchPlanJson) as Array<{
    number: number;
    rowKeys: string[];
  }>;
  return batches.find((batch) => batch.rowKeys.includes(rowKey))?.number ?? 1;
}

function enforceVersion(current: number, expected: number) {
  if (current !== expected) {
    throw new BulkRowConflictError(
      "This candidate changed in another session. Reload before saving again.",
    );
  }
}

function sentenceLabel(value: string) {
  const label = value.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

async function shortHash(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  )
    .join("")
    .slice(0, 16);
}

export class BulkRowConflictError extends Error {}
export class BulkRowNotFoundError extends Error {}
export class BulkRowValidationError extends Error {
  constructor(public readonly details: string[]) {
    super("The candidate needs attention before this decision can be saved.");
  }
}
