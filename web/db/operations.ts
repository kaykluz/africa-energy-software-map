import { getD1Database } from "./index";

const intakePauseKey = "contribution_intake_paused";
const openContributionStatuses = [
  "received",
  "triaged",
  "researching",
  "needs_evidence",
  "reviewed",
];

export type OperationsStatus = {
  intakePaused: boolean;
  intakeVersion: number;
  intakeUpdatedAt: string | null;
  intakeUpdatedBy: string | null;
  lastMaintenance: MaintenanceRun | null;
  expiredContacts: number;
  openContributions: number;
  oldestOpenAt: string | null;
};

type MaintenanceRun = {
  id: string;
  status: string;
  finishedAt: string;
  expiredContactsDeleted: number;
  expiredRateLimitsDeleted: number;
  openContributions: number;
  oldestOpenAt: string | null;
};

export async function isContributionIntakePaused() {
  const database = await getD1Database();
  const setting = await database
    .prepare("SELECT value FROM system_settings WHERE key = ?")
    .bind(intakePauseKey)
    .first<{ value: string }>();
  return setting?.value === "true";
}

export async function getOperationsStatus(): Promise<OperationsStatus> {
  const database = await getD1Database();
  const now = new Date().toISOString();
  const placeholders = openContributionStatuses.map(() => "?").join(", ");
  const [setting, maintenance, expired, queue] = await Promise.all([
    database
      .prepare(
        `SELECT
           value,
           updated_by AS updatedBy,
           updated_at AS updatedAt,
           version
         FROM system_settings
         WHERE key = ?`,
      )
      .bind(intakePauseKey)
      .first<{
        value: string;
        updatedBy: string;
        updatedAt: string;
        version: number;
      }>(),
    database
      .prepare(
        `SELECT
           id,
           status,
           finished_at AS finishedAt,
           expired_contacts_deleted AS expiredContactsDeleted,
           expired_rate_limits_deleted AS expiredRateLimitsDeleted,
           open_contributions AS openContributions,
           oldest_open_at AS oldestOpenAt
         FROM maintenance_runs
         ORDER BY finished_at DESC
         LIMIT 1`,
      )
      .first<MaintenanceRun>(),
    database
      .prepare(
        "SELECT COUNT(*) AS count FROM contribution_contacts WHERE delete_after <= ?",
      )
      .bind(now)
      .first<{ count: number }>(),
    database
      .prepare(
        `SELECT
           COUNT(*) AS count,
           MIN(submitted_at) AS oldestOpenAt
         FROM contributions
         WHERE status IN (${placeholders})`,
      )
      .bind(...openContributionStatuses)
      .first<{ count: number; oldestOpenAt: string | null }>(),
  ]);
  return {
    intakePaused: setting?.value === "true",
    intakeVersion: setting?.version ?? 0,
    intakeUpdatedAt: setting?.updatedAt ?? null,
    intakeUpdatedBy: setting?.updatedBy ?? null,
    lastMaintenance: maintenance ?? null,
    expiredContacts: expired?.count ?? 0,
    openContributions: queue?.count ?? 0,
    oldestOpenAt: queue?.oldestOpenAt ?? null,
  };
}

export async function setContributionIntakePaused({
  paused,
  reason,
  reviewerEmail,
  expectedVersion,
}: {
  paused: boolean;
  reason: string;
  reviewerEmail: string;
  expectedVersion: number;
}) {
  const database = await getD1Database();
  const existing = await database
    .prepare(
      `SELECT value, updated_by AS updatedBy, updated_at AS updatedAt, version
       FROM system_settings
       WHERE key = ?`,
    )
    .bind(intakePauseKey)
    .first<{
      value: string;
      updatedBy: string;
      updatedAt: string;
      version: number;
    }>();
  const currentVersion = existing?.version ?? 0;
  if (currentVersion !== expectedVersion) {
    throw new OperationsConflictError(
      "Operations changed in another session. Refresh before trying again.",
    );
  }
  const now = new Date().toISOString();
  const next = {
    intakePaused: paused,
    intakeVersion: currentVersion + 1,
    intakeUpdatedAt: now,
    intakeUpdatedBy: reviewerEmail,
  };
  const nextValue = paused ? "true" : "false";
  const settingWrite = existing
    ? database
        .prepare(
          `UPDATE system_settings
           SET value = ?, updated_by = ?, updated_at = ?, version = ?
           WHERE key = ? AND version = ?`,
        )
        .bind(
          nextValue,
          reviewerEmail,
          now,
          next.intakeVersion,
          intakePauseKey,
          expectedVersion,
        )
    : database
        .prepare(
          `INSERT OR IGNORE INTO system_settings (
             key, value, updated_by, updated_at, version
           ) VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(
          intakePauseKey,
          nextValue,
          reviewerEmail,
          now,
          next.intakeVersion,
        );
  const [writeResult] = await database.batch([
    settingWrite,
    conditionalOperationsAuditStatement(database, {
      recordId: intakePauseKey,
      action: paused ? "intake_paused" : "intake_resumed",
      before: existing
        ? {
            intakePaused: existing.value === "true",
            intakeVersion: existing.version,
          }
        : null,
      after: next,
      reason,
      actor: reviewerEmail,
      occurredAt: now,
      expectedSetting: {
        key: intakePauseKey,
        value: nextValue,
        version: next.intakeVersion,
        updatedBy: reviewerEmail,
        updatedAt: now,
      },
    }),
  ]);
  if (writeResult.meta.changes !== 1) {
    throw new OperationsConflictError(
      "Operations changed in another session. Refresh before trying again.",
    );
  }
  return getOperationsStatus();
}

export async function runMaintenance(actor = "scheduled-automation") {
  const database = await getD1Database();
  const startedAt = new Date().toISOString();
  const rateLimitCutoff = daysBefore(startedAt, 3).slice(0, 10);
  const runHistoryCutoff = daysBefore(startedAt, 90);
  const placeholders = openContributionStatuses.map(() => "?").join(", ");
  const [expiredContacts, expiredRateLimits, queue] = await Promise.all([
    database
      .prepare(
        "SELECT COUNT(*) AS count FROM contribution_contacts WHERE delete_after <= ?",
      )
      .bind(startedAt)
      .first<{ count: number }>(),
    database
      .prepare(
        "SELECT COUNT(*) AS count FROM contribution_rate_limits WHERE window_started_at < ?",
      )
      .bind(rateLimitCutoff)
      .first<{ count: number }>(),
    database
      .prepare(
        `SELECT
           COUNT(*) AS count,
           MIN(submitted_at) AS oldestOpenAt
         FROM contributions
         WHERE status IN (${placeholders})`,
      )
      .bind(...openContributionStatuses)
      .first<{ count: number; oldestOpenAt: string | null }>(),
  ]);
  const finishedAt = new Date().toISOString();
  const run = {
    id: `maintenance_${crypto.randomUUID()}`,
    status: "completed",
    startedAt,
    finishedAt,
    expiredContactsDeleted: expiredContacts?.count ?? 0,
    expiredRateLimitsDeleted: expiredRateLimits?.count ?? 0,
    openContributions: queue?.count ?? 0,
    oldestOpenAt: queue?.oldestOpenAt ?? null,
  };
  await database.batch([
    database
      .prepare("DELETE FROM contribution_contacts WHERE delete_after <= ?")
      .bind(startedAt),
    database
      .prepare(
        "DELETE FROM contribution_rate_limits WHERE window_started_at < ?",
      )
      .bind(rateLimitCutoff),
    database
      .prepare("DELETE FROM maintenance_runs WHERE finished_at < ?")
      .bind(runHistoryCutoff),
    database
      .prepare(
        `INSERT INTO maintenance_runs (
           id, status, started_at, finished_at, expired_contacts_deleted,
           expired_rate_limits_deleted, open_contributions, oldest_open_at, notes
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        run.id,
        run.status,
        run.startedAt,
        run.finishedAt,
        run.expiredContactsDeleted,
        run.expiredRateLimitsDeleted,
        run.openContributions,
        run.oldestOpenAt,
        "Automated retention and queue-health pass.",
      ),
    operationsAuditStatement(database, {
      recordId: run.id,
      action: "maintenance_completed",
      before: null,
      after: run,
      reason: "Scheduled retention and queue-health pass.",
      actor,
      occurredAt: finishedAt,
    }),
  ]);
  return run;
}

function operationsAuditStatement(
  database: D1Database,
  {
    recordId,
    action,
    before,
    after,
    reason,
    actor,
    occurredAt,
  }: {
    recordId: string;
    action: string;
    before: unknown;
    after: unknown;
    reason: string;
    actor: string;
    occurredAt: string;
  },
) {
  return database
    .prepare(
      `INSERT INTO review_audit_events (
         id, record_type, record_id, action, before_json, after_json,
         reason, reviewer_email, occurred_at
       ) VALUES (?, 'operations', ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      `evt_${crypto.randomUUID()}`,
      recordId,
      action,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
      reason,
      actor,
      occurredAt,
    );
}

function conditionalOperationsAuditStatement(
  database: D1Database,
  {
    recordId,
    action,
    before,
    after,
    reason,
    actor,
    occurredAt,
    expectedSetting,
  }: {
    recordId: string;
    action: string;
    before: unknown;
    after: unknown;
    reason: string;
    actor: string;
    occurredAt: string;
    expectedSetting: {
      key: string;
      value: string;
      version: number;
      updatedBy: string;
      updatedAt: string;
    };
  },
) {
  return database
    .prepare(
      `INSERT INTO review_audit_events (
         id, record_type, record_id, action, before_json, after_json,
         reason, reviewer_email, occurred_at
       )
       SELECT ?, 'operations', ?, ?, ?, ?, ?, ?, ?
       WHERE EXISTS (
         SELECT 1
         FROM system_settings
         WHERE key = ? AND value = ? AND version = ?
           AND updated_by = ? AND updated_at = ?
       )`,
    )
    .bind(
      `evt_${crypto.randomUUID()}`,
      recordId,
      action,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
      reason,
      actor,
      occurredAt,
      expectedSetting.key,
      expectedSetting.value,
      expectedSetting.version,
      expectedSetting.updatedBy,
      expectedSetting.updatedAt,
    );
}

function daysBefore(value: string, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

export class OperationsConflictError extends Error {}
