import { getD1Database } from "./index";
import type { ContributionInput } from "@/lib/contribution-intake";

export type StoredContribution = {
  id: string;
  submissionType: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
};

export async function reserveRateLimit(
  key: string,
  window: string,
  limit: number,
) {
  const row = await (await getD1Database())
    .prepare(
      `INSERT INTO contribution_rate_limits (key, window_started_at, count)
       VALUES (?, ?, 1)
       ON CONFLICT(key, window_started_at)
       DO UPDATE SET count = count + 1
       WHERE count < ?
       RETURNING count`,
    )
    .bind(key, window, limit)
    .first<{ count: number }>();
  return Boolean(row);
}

export async function storeContribution({
  contribution,
  id,
  tokenHash,
  rateWindow,
  now,
}: {
  contribution: ContributionInput;
  id: string;
  tokenHash: string;
  rateWindow: string;
  now: string;
}) {
  const database = await getD1Database();
  const isDeployment = contribution.type === "deployment";
  const isProduct = contribution.type === "product";
  const isCorrection = contribution.type === "correction";
  const isClaim = contribution.type === "claim";
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `INSERT INTO contributions (
          id, submission_type, status, submitted_at, updated_at,
          related_entity_id, product_name, organisation_name, category,
          country_iso2, customer_disclosure, customer_public, started_year,
          lifecycle, field_name, proposed_value, evidence_url,
          contributor_relationship, authority, notes, sensitive_confirmed,
          status_token_hash
        ) VALUES (?, ?, 'received', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        contribution.type,
        now,
        now,
        isDeployment || isCorrection ? contribution.product : null,
        isProduct ? contribution.product : null,
        isProduct || isClaim ? contribution.organisation : null,
        isProduct ? contribution.category : null,
        isDeployment ? contribution.country : null,
        isDeployment ? contribution.customerDisclosure : null,
        isDeployment ? contribution.customer : null,
        isDeployment ? contribution.year || null : null,
        isDeployment ? contribution.lifecycle : null,
        isCorrection ? contribution.field : null,
        isCorrection ? contribution.proposedValue : null,
        contribution.source,
        contribution.relationship,
        isClaim ? contribution.authority : null,
        contribution.notes,
        isDeployment && contribution.sensitiveConfirmed ? 1 : 0,
        tokenHash,
      ),
    database
      .prepare(
        "DELETE FROM contribution_rate_limits WHERE window_started_at < ?",
      )
      .bind(retentionWindow(rateWindow, -3)),
    database
      .prepare("DELETE FROM contribution_contacts WHERE delete_after <= ?")
      .bind(now),
  ];

  if (contribution.email) {
    statements.push(
      database
        .prepare(
          "INSERT INTO contribution_contacts (contribution_id, email, delete_after) VALUES (?, ?, ?)",
        )
        .bind(id, contribution.email, contactDeletionDate(now)),
    );
  }
  await database.batch(statements);
}

export async function findContributionByReceipt(
  id: string,
  statusTokenHash: string,
): Promise<StoredContribution | null> {
  const database = await getD1Database();
  await database
    .prepare("DELETE FROM contribution_contacts WHERE delete_after <= ?")
    .bind(new Date().toISOString())
    .run();
  const row = await database
    .prepare(
      `SELECT
        id,
        submission_type AS submissionType,
        status,
        submitted_at AS submittedAt,
        updated_at AS updatedAt
       FROM contributions
       WHERE id = ? AND status_token_hash = ?`,
    )
    .bind(id, statusTokenHash)
    .first<StoredContribution>();
  return row ?? null;
}

function contactDeletionDate(now: string) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + 180);
  return date.toISOString();
}

function retentionWindow(window: string, days: number) {
  const date = new Date(`${window}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
