import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const contributions = sqliteTable(
  "contributions",
  {
    id: text("id").primaryKey(),
    submissionType: text("submission_type").notNull(),
    status: text("status").notNull().default("received"),
    submittedAt: text("submitted_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    relatedEntityId: text("related_entity_id"),
    productName: text("product_name"),
    organisationName: text("organisation_name"),
    category: text("category"),
    countryIso2: text("country_iso2"),
    customerDisclosure: text("customer_disclosure"),
    customerPublic: text("customer_public"),
    startedYear: text("started_year"),
    lifecycle: text("lifecycle"),
    fieldName: text("field_name"),
    proposedValue: text("proposed_value"),
    evidenceUrl: text("evidence_url").notNull(),
    contributorRelationship: text("contributor_relationship"),
    authority: text("authority"),
    notes: text("notes"),
    sensitiveConfirmed: integer("sensitive_confirmed", {
      mode: "boolean",
    }).notNull(),
    statusTokenHash: text("status_token_hash").notNull(),
  },
  (table) => [
    index("contributions_status_submitted_idx").on(
      table.status,
      table.submittedAt,
    ),
    uniqueIndex("contributions_status_token_idx").on(table.statusTokenHash),
  ],
);

export const contributionContacts = sqliteTable(
  "contribution_contacts",
  {
    contributionId: text("contribution_id")
      .primaryKey()
      .references(() => contributions.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    deleteAfter: text("delete_after").notNull(),
  },
);

export const contributionRateLimits = sqliteTable(
  "contribution_rate_limits",
  {
    key: text("key").notNull(),
    windowStartedAt: text("window_started_at").notNull(),
    count: integer("count").notNull().default(1),
  },
  (table) => [
    uniqueIndex("contribution_rate_window_idx").on(
      table.key,
      table.windowStartedAt,
    ),
  ],
);

export const assertionReviews = sqliteTable(
  "assertion_reviews",
  {
    assertionId: text("assertion_id").primaryKey(),
    batchId: text("batch_id").notNull(),
    decision: text("decision").notNull(),
    proposedValue: text("proposed_value"),
    proposedEvidenceStatus: text("proposed_evidence_status"),
    notes: text("notes"),
    sourceChecked: integer("source_checked", { mode: "boolean" })
      .notNull()
      .default(false),
    safetyChecked: integer("safety_checked", { mode: "boolean" })
      .notNull()
      .default(false),
    reviewerEmail: text("reviewer_email").notNull(),
    reviewedAt: text("reviewed_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    index("assertion_reviews_batch_decision_idx").on(
      table.batchId,
      table.decision,
    ),
  ],
);

export const sourceReviews = sqliteTable(
  "source_reviews",
  {
    sourceId: text("source_id").primaryKey(),
    rightsStatus: text("rights_status").notNull(),
    sourceLicense: text("source_license"),
    independenceClass: text("independence_class"),
    notes: text("notes"),
    reviewerEmail: text("reviewer_email").notNull(),
    reviewedAt: text("reviewed_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    version: integer("version").notNull().default(1),
  },
  (table) => [index("source_reviews_rights_status_idx").on(table.rightsStatus)],
);

export const reviewAuditEvents = sqliteTable(
  "review_audit_events",
  {
    id: text("id").primaryKey(),
    recordType: text("record_type").notNull(),
    recordId: text("record_id").notNull(),
    action: text("action").notNull(),
    beforeJson: text("before_json"),
    afterJson: text("after_json"),
    reason: text("reason"),
    reviewerEmail: text("reviewer_email").notNull(),
    occurredAt: text("occurred_at").notNull(),
  },
  (table) => [
    index("review_audit_record_idx").on(table.recordType, table.recordId),
    index("review_audit_occurred_idx").on(table.occurredAt),
  ],
);

export const systemSettings = sqliteTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: text("updated_at").notNull(),
  version: integer("version").notNull().default(1),
});

export const maintenanceRuns = sqliteTable(
  "maintenance_runs",
  {
    id: text("id").primaryKey(),
    status: text("status").notNull(),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at").notNull(),
    expiredContactsDeleted: integer("expired_contacts_deleted")
      .notNull()
      .default(0),
    expiredRateLimitsDeleted: integer("expired_rate_limits_deleted")
      .notNull()
      .default(0),
    openContributions: integer("open_contributions").notNull().default(0),
    oldestOpenAt: text("oldest_open_at"),
    notes: text("notes"),
  },
  (table) => [index("maintenance_runs_finished_idx").on(table.finishedAt)],
);

export const bulkImports = sqliteTable(
  "bulk_imports",
  {
    id: text("id").primaryKey(),
    originalFilename: text("original_filename").notNull(),
    workbookHash: text("workbook_hash").notNull(),
    payloadHash: text("payload_hash").notNull(),
    status: text("status").notNull().default("candidate"),
    uploadedBy: text("uploaded_by").notNull(),
    uploadedAt: text("uploaded_at").notNull(),
    rowCount: integer("row_count").notNull(),
    entityCount: integer("entity_count").notNull(),
    plannedBatchCount: integer("planned_batch_count").notNull(),
    warningsJson: text("warnings_json").notNull(),
    batchPlanJson: text("batch_plan_json").notNull(),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    uniqueIndex("bulk_imports_workbook_hash_idx").on(table.workbookHash),
    index("bulk_imports_uploaded_idx").on(table.uploadedAt),
  ],
);

export const bulkImportRows = sqliteTable(
  "bulk_import_rows",
  {
    id: text("id").primaryKey(),
    importId: text("import_id")
      .notNull()
      .references(() => bulkImports.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    rowKey: text("row_key").notNull(),
    recordType: text("record_type").notNull(),
    status: text("status").notNull().default("candidate"),
    payloadJson: text("payload_json").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("bulk_import_rows_key_idx").on(table.importId, table.rowKey),
    index("bulk_import_rows_import_idx").on(table.importId, table.rowNumber),
  ],
);
