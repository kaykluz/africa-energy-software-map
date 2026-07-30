import { getD1Database } from "./index";
import { reviewBatchId } from "@/lib/review-data";

export type AssertionReviewRecord = {
  assertionId: string;
  batchId: string;
  decision: "accept" | "amend" | "reject" | "needs_evidence";
  proposedValue: string | null;
  proposedEvidenceStatus: string | null;
  notes: string | null;
  sourceChecked: number | boolean;
  safetyChecked: number | boolean;
  reviewerEmail: string;
  reviewedAt: string;
  updatedAt: string;
  version: number;
};

export type SourceReviewRecord = {
  sourceId: string;
  rightsStatus: "resolved" | "needs_research" | "exclude";
  sourceLicense: string | null;
  independenceClass: string | null;
  notes: string | null;
  reviewerEmail: string;
  reviewedAt: string;
  updatedAt: string;
  version: number;
};

export type ModerationContribution = {
  id: string;
  submissionType: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
  relatedEntityId: string | null;
  productName: string | null;
  organisationName: string | null;
  category: string | null;
  countryIso2: string | null;
  customerDisclosure: string | null;
  customerPublic: string | null;
  startedYear: string | null;
  lifecycle: string | null;
  fieldName: string | null;
  proposedValue: string | null;
  evidenceUrl: string;
  contributorRelationship: string | null;
  authority: string | null;
  notes: string | null;
  sensitiveConfirmed: number | boolean;
};

export type AuditEvent = {
  id: string;
  recordType: string;
  recordId: string;
  action: string;
  beforeJson: string | null;
  afterJson: string | null;
  reason: string | null;
  reviewerEmail: string;
  occurredAt: string;
};

export async function loadReviewWorkspace() {
  const database = await getD1Database();
  const now = new Date().toISOString();
  await database
    .prepare("DELETE FROM contribution_contacts WHERE delete_after <= ?")
    .bind(now)
    .run();
  const [assertionResult, sourceResult, contributionResult] =
    await Promise.all([
      database
        .prepare(
          `SELECT
            assertion_id AS assertionId,
            batch_id AS batchId,
            decision,
            proposed_value AS proposedValue,
            proposed_evidence_status AS proposedEvidenceStatus,
            notes,
            source_checked AS sourceChecked,
            safety_checked AS safetyChecked,
            reviewer_email AS reviewerEmail,
            reviewed_at AS reviewedAt,
            updated_at AS updatedAt,
            version
           FROM assertion_reviews
           WHERE batch_id = ?
           ORDER BY updated_at DESC`,
        )
        .bind(reviewBatchId)
        .all<AssertionReviewRecord>(),
      database
        .prepare(
          `SELECT
            source_id AS sourceId,
            rights_status AS rightsStatus,
            source_license AS sourceLicense,
            independence_class AS independenceClass,
            notes,
            reviewer_email AS reviewerEmail,
            reviewed_at AS reviewedAt,
            updated_at AS updatedAt,
            version
           FROM source_reviews
           ORDER BY updated_at DESC`,
        )
        .all<SourceReviewRecord>(),
      database
        .prepare(
          `SELECT
            id,
            submission_type AS submissionType,
            status,
            submitted_at AS submittedAt,
            updated_at AS updatedAt,
            related_entity_id AS relatedEntityId,
            product_name AS productName,
            organisation_name AS organisationName,
            category,
            country_iso2 AS countryIso2,
            customer_disclosure AS customerDisclosure,
            customer_public AS customerPublic,
            started_year AS startedYear,
            lifecycle,
            field_name AS fieldName,
            proposed_value AS proposedValue,
            evidence_url AS evidenceUrl,
            contributor_relationship AS contributorRelationship,
            authority,
            notes,
            sensitive_confirmed AS sensitiveConfirmed
           FROM contributions
           ORDER BY submitted_at DESC
           LIMIT 200`,
        )
        .all<ModerationContribution>(),
    ]);

  return {
    assertionReviews: normaliseAssertionReviews(assertionResult.results),
    sourceReviews: sourceResult.results,
    contributions: contributionResult.results.map((record) => ({
      ...record,
      sensitiveConfirmed: Boolean(record.sensitiveConfirmed),
    })),
  };
}

export async function saveAssertionReview({
  assertionId,
  decision,
  proposedValue,
  proposedEvidenceStatus,
  notes,
  sourceChecked,
  safetyChecked,
  reviewerEmail,
  expectedVersion,
}: {
  assertionId: string;
  decision: AssertionReviewRecord["decision"];
  proposedValue: string;
  proposedEvidenceStatus: string;
  notes: string;
  sourceChecked: boolean;
  safetyChecked: boolean;
  reviewerEmail: string;
  expectedVersion: number;
}) {
  const database = await getD1Database();
  const existing = await findAssertionReview(database, assertionId);
  enforceVersion(existing?.version ?? 0, expectedVersion);
  const now = new Date().toISOString();
  const nextVersion = (existing?.version ?? 0) + 1;
  const next = {
    assertionId,
    batchId: reviewBatchId,
    decision,
    proposedValue: proposedValue || null,
    proposedEvidenceStatus: proposedEvidenceStatus || null,
    notes: notes || null,
    sourceChecked,
    safetyChecked,
    reviewerEmail,
    reviewedAt: existing?.reviewedAt ?? now,
    updatedAt: now,
    version: nextVersion,
  };
  await database.batch([
    database
      .prepare(
        `INSERT INTO assertion_reviews (
          assertion_id, batch_id, decision, proposed_value,
          proposed_evidence_status, notes, source_checked, safety_checked,
          reviewer_email, reviewed_at, updated_at, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(assertion_id) DO UPDATE SET
          batch_id = excluded.batch_id,
          decision = excluded.decision,
          proposed_value = excluded.proposed_value,
          proposed_evidence_status = excluded.proposed_evidence_status,
          notes = excluded.notes,
          source_checked = excluded.source_checked,
          safety_checked = excluded.safety_checked,
          reviewer_email = excluded.reviewer_email,
          updated_at = excluded.updated_at,
          version = excluded.version`,
      )
      .bind(
        next.assertionId,
        next.batchId,
        next.decision,
        next.proposedValue,
        next.proposedEvidenceStatus,
        next.notes,
        next.sourceChecked ? 1 : 0,
        next.safetyChecked ? 1 : 0,
        next.reviewerEmail,
        next.reviewedAt,
        next.updatedAt,
        next.version,
      ),
    auditStatement(database, {
      recordType: "assertion",
      recordId: assertionId,
      action: existing ? "review_updated" : "review_created",
      before: existing,
      after: next,
      reason: notes,
      reviewerEmail,
      occurredAt: now,
    }),
  ]);
  return next;
}

export async function clearAssertionReview({
  assertionId,
  reviewerEmail,
  expectedVersion,
}: {
  assertionId: string;
  reviewerEmail: string;
  expectedVersion: number;
}) {
  const database = await getD1Database();
  const existing = await findAssertionReview(database, assertionId);
  if (!existing) return null;
  enforceVersion(existing.version, expectedVersion);
  const now = new Date().toISOString();
  await database.batch([
    database
      .prepare("DELETE FROM assertion_reviews WHERE assertion_id = ?")
      .bind(assertionId),
    auditStatement(database, {
      recordType: "assertion",
      recordId: assertionId,
      action: "review_cleared",
      before: existing,
      after: null,
      reason: "",
      reviewerEmail,
      occurredAt: now,
    }),
  ]);
  return null;
}

export async function saveSourceReview({
  sourceId,
  rightsStatus,
  sourceLicense,
  independenceClass,
  notes,
  reviewerEmail,
  expectedVersion,
}: {
  sourceId: string;
  rightsStatus: SourceReviewRecord["rightsStatus"];
  sourceLicense: string;
  independenceClass: string;
  notes: string;
  reviewerEmail: string;
  expectedVersion: number;
}) {
  const database = await getD1Database();
  const existing = await findSourceReview(database, sourceId);
  enforceVersion(existing?.version ?? 0, expectedVersion);
  const now = new Date().toISOString();
  const next = {
    sourceId,
    rightsStatus,
    sourceLicense: sourceLicense || null,
    independenceClass: independenceClass || null,
    notes: notes || null,
    reviewerEmail,
    reviewedAt: existing?.reviewedAt ?? now,
    updatedAt: now,
    version: (existing?.version ?? 0) + 1,
  };
  await database.batch([
    database
      .prepare(
        `INSERT INTO source_reviews (
          source_id, rights_status, source_license, independence_class,
          notes, reviewer_email, reviewed_at, updated_at, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_id) DO UPDATE SET
          rights_status = excluded.rights_status,
          source_license = excluded.source_license,
          independence_class = excluded.independence_class,
          notes = excluded.notes,
          reviewer_email = excluded.reviewer_email,
          updated_at = excluded.updated_at,
          version = excluded.version`,
      )
      .bind(
        next.sourceId,
        next.rightsStatus,
        next.sourceLicense,
        next.independenceClass,
        next.notes,
        next.reviewerEmail,
        next.reviewedAt,
        next.updatedAt,
        next.version,
      ),
    auditStatement(database, {
      recordType: "source",
      recordId: sourceId,
      action: existing ? "source_review_updated" : "source_review_created",
      before: existing,
      after: next,
      reason: notes,
      reviewerEmail,
      occurredAt: now,
    }),
  ]);
  return next;
}

export async function updateContributionStatus({
  contributionId,
  status,
  reason,
  reviewerEmail,
}: {
  contributionId: string;
  status: string;
  reason: string;
  reviewerEmail: string;
}) {
  const database = await getD1Database();
  const existing = await database
    .prepare(
      `SELECT id, status, updated_at AS updatedAt
       FROM contributions WHERE id = ?`,
    )
    .bind(contributionId)
    .first<{ id: string; status: string; updatedAt: string }>();
  if (!existing) throw new ReviewNotFoundError("Contribution not found.");
  if (!validContributionTransition(existing.status, status)) {
    throw new ReviewConflictError(
      `A contribution cannot move from ${existing.status} to ${status}.`,
    );
  }
  const now = new Date().toISOString();
  const next = { ...existing, status, updatedAt: now };
  await database.batch([
    database
      .prepare(
        "UPDATE contributions SET status = ?, updated_at = ? WHERE id = ?",
      )
      .bind(status, now, contributionId),
    auditStatement(database, {
      recordType: "contribution",
      recordId: contributionId,
      action: "status_changed",
      before: existing,
      after: next,
      reason,
      reviewerEmail,
      occurredAt: now,
    }),
  ]);
  return next;
}

export async function revealContributionContact({
  contributionId,
  reviewerEmail,
}: {
  contributionId: string;
  reviewerEmail: string;
}) {
  const database = await getD1Database();
  const now = new Date().toISOString();
  const record = await database
    .prepare(
      `SELECT
         contributions.id AS contributionId,
         contribution_contacts.email,
         contribution_contacts.delete_after AS deleteAfter
       FROM contributions
       LEFT JOIN contribution_contacts
         ON contribution_contacts.contribution_id = contributions.id
         AND contribution_contacts.delete_after > ?
       WHERE contributions.id = ?`,
    )
    .bind(now, contributionId)
    .first<{
      contributionId: string;
      email: string | null;
      deleteAfter: string | null;
    }>();
  if (!record) throw new ReviewNotFoundError("Contribution not found.");
  const contact =
    record.email && record.deleteAfter
      ? { email: record.email, deleteAfter: record.deleteAfter }
      : null;
  await auditStatement(database, {
    recordType: "contribution",
    recordId: contributionId,
    action: "private_contact_viewed",
    before: null,
    after: null,
    reason: contact ? "Contact available" : "No retained contact",
    reviewerEmail,
    occurredAt: now,
  }).run();
  return contact ?? null;
}

export async function exportReviewPackage(reviewerEmail: string) {
  const database = await getD1Database();
  const workspace = await loadReviewWorkspace();
  const audit = await database
    .prepare(
      `SELECT
        id,
        record_type AS recordType,
        record_id AS recordId,
        action,
        before_json AS beforeJson,
        after_json AS afterJson,
        reason,
        reviewer_email AS reviewerEmail,
        occurred_at AS occurredAt
       FROM review_audit_events
       WHERE record_type IN ('assertion', 'source')
       ORDER BY occurred_at ASC`,
    )
    .all<AuditEvent>();
  return {
    schemaVersion: "1.0.0",
    batchId: reviewBatchId,
    generatedAt: new Date().toISOString(),
    generatedBy: reviewerEmail,
    status: {
      assertionDecisions: workspace.assertionReviews.length,
      sourceDecisions: workspace.sourceReviews.length,
      containsPublicDataChanges: false,
      publicationAuthorised: false,
    },
    assertionReviews: workspace.assertionReviews,
    sourceReviews: workspace.sourceReviews,
    audit: audit.results,
  };
}

async function findAssertionReview(
  database: D1Database,
  assertionId: string,
) {
  return database
    .prepare(
      `SELECT
        assertion_id AS assertionId,
        batch_id AS batchId,
        decision,
        proposed_value AS proposedValue,
        proposed_evidence_status AS proposedEvidenceStatus,
        notes,
        source_checked AS sourceChecked,
        safety_checked AS safetyChecked,
        reviewer_email AS reviewerEmail,
        reviewed_at AS reviewedAt,
        updated_at AS updatedAt,
        version
       FROM assertion_reviews
       WHERE assertion_id = ?`,
    )
    .bind(assertionId)
    .first<AssertionReviewRecord>()
    .then((record) => (record ? normaliseAssertionReview(record) : null));
}

async function findSourceReview(database: D1Database, sourceId: string) {
  return database
    .prepare(
      `SELECT
        source_id AS sourceId,
        rights_status AS rightsStatus,
        source_license AS sourceLicense,
        independence_class AS independenceClass,
        notes,
        reviewer_email AS reviewerEmail,
        reviewed_at AS reviewedAt,
        updated_at AS updatedAt,
        version
       FROM source_reviews
       WHERE source_id = ?`,
    )
    .bind(sourceId)
    .first<SourceReviewRecord>();
}

function auditStatement(
  database: D1Database,
  {
    recordType,
    recordId,
    action,
    before,
    after,
    reason,
    reviewerEmail,
    occurredAt,
  }: {
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
      recordType,
      recordId,
      action,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
      reason || null,
      reviewerEmail,
      occurredAt,
    );
}

function normaliseAssertionReviews(records: AssertionReviewRecord[]) {
  return records.map(normaliseAssertionReview);
}

function normaliseAssertionReview(record: AssertionReviewRecord) {
  return {
    ...record,
    sourceChecked: Boolean(record.sourceChecked),
    safetyChecked: Boolean(record.safetyChecked),
  };
}

function enforceVersion(current: number, expected: number) {
  if (current !== expected) {
    throw new ReviewConflictError(
      "This review changed in another session. Reload before saving again.",
    );
  }
}

function validContributionTransition(current: string, next: string) {
  if (current === next) return true;
  const transitions: Record<string, string[]> = {
    received: ["triaged", "rejected", "duplicate", "withdrawn"],
    triaged: [
      "researching",
      "needs_evidence",
      "reviewed",
      "rejected",
      "duplicate",
      "withdrawn",
    ],
    researching: [
      "needs_evidence",
      "reviewed",
      "rejected",
      "duplicate",
      "withdrawn",
    ],
    needs_evidence: [
      "researching",
      "reviewed",
      "rejected",
      "duplicate",
      "withdrawn",
    ],
    reviewed: [
      "accepted",
      "needs_evidence",
      "researching",
      "rejected",
      "withdrawn",
    ],
    accepted: ["researching", "withdrawn"],
    rejected: ["researching"],
    duplicate: ["researching"],
    withdrawn: ["researching"],
  };
  return transitions[current]?.includes(next) ?? false;
}

export class ReviewConflictError extends Error {}
export class ReviewNotFoundError extends Error {}
