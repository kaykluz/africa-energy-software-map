import { getD1Database } from "./index";
import { organisationCatalogueById } from "@/lib/organisation-catalogue";
import { normalizeSourceUrl } from "@/lib/source-url";

export const organisationCatalogueDecisions = [
  "accept",
  "amend",
  "reject",
  "needs_evidence",
  "duplicate",
] as const;

export const organisationCatalogueAmendableFields = [
  "name",
  "aliases",
  "parent",
  "organisationType",
  "primaryRole",
  "roles",
  "segments",
  "headquartersCity",
  "headquartersCountry",
  "countriesActive",
  "lifecycle",
  "website",
  "description",
  "sourceUrl",
  "confidence",
  "coverageNotes",
] as const;

export type OrganisationCatalogueDecision =
  (typeof organisationCatalogueDecisions)[number];
export type OrganisationCatalogueAmendableField =
  (typeof organisationCatalogueAmendableFields)[number];

export type OrganisationCatalogueReviewRecord = {
  candidateId: string;
  decision: OrganisationCatalogueDecision;
  amendments: Partial<Record<OrganisationCatalogueAmendableField, string>>;
  normalizedSourceUrl: string;
  sourceOpened: boolean | number;
  identityConfirmed: boolean | number;
  classificationsConfirmed: boolean | number;
  safetyChecked: boolean | number;
  notes: string | null;
  reviewerEmail: string;
  reviewedAt: string;
  updatedAt: string;
  version: number;
};

export async function listOrganisationCatalogueReviews() {
  const database = await getD1Database();
  const result = await database
    .prepare(
      `SELECT
         candidate_id AS candidateId,
         decision,
         amendments_json AS amendmentsJson,
         normalized_source_url AS normalizedSourceUrl,
         source_opened AS sourceOpened,
         identity_confirmed AS identityConfirmed,
         classifications_confirmed AS classificationsConfirmed,
         safety_checked AS safetyChecked,
         notes,
         reviewer_email AS reviewerEmail,
         reviewed_at AS reviewedAt,
         updated_at AS updatedAt,
         version
       FROM organisation_catalogue_reviews
       ORDER BY updated_at DESC`,
    )
    .all<Omit<OrganisationCatalogueReviewRecord, "amendments"> & { amendmentsJson: string | null }>();
  return result.results.map(normaliseReview);
}

export async function saveOrganisationCatalogueReview({
  candidateId,
  decision,
  amendments,
  sourceUrl,
  sourceOpened,
  identityConfirmed,
  classificationsConfirmed,
  safetyChecked,
  notes,
  reviewerEmail,
  expectedVersion,
}: {
  candidateId: string;
  decision: OrganisationCatalogueDecision;
  amendments: Partial<Record<OrganisationCatalogueAmendableField, string>>;
  sourceUrl: string;
  sourceOpened: boolean;
  identityConfirmed: boolean;
  classificationsConfirmed: boolean;
  safetyChecked: boolean;
  notes: string;
  reviewerEmail: string;
  expectedVersion: number;
}) {
  const candidate = organisationCatalogueById.get(candidateId);
  if (!candidate) throw new OrganisationCatalogueNotFoundError("Organisation candidate not found.");
  const database = await getD1Database();
  const existing = await findReview(database, candidateId);
  if ((existing?.version ?? 0) !== expectedVersion) {
    throw new OrganisationCatalogueConflictError(
      "This organisation review changed in another session. Reload before saving.",
    );
  }
  if (decision === "amend" && !Object.keys(amendments).length) {
    throw new OrganisationCatalogueValidationError("Record at least one corrected field.");
  }
  if (["reject", "needs_evidence", "duplicate"].includes(decision) && !notes) {
    throw new OrganisationCatalogueValidationError("Add a short reason for this decision.");
  }
  if (
    ["accept", "amend"].includes(decision) &&
    (!sourceOpened || !identityConfirmed || !classificationsConfirmed || !safetyChecked)
  ) {
    throw new OrganisationCatalogueValidationError(
      "Confirm the source, identity, classifications and publication-safety checks.",
    );
  }
  const normalizedSourceUrl = normalizeSourceUrl(sourceUrl || candidate.sourceUrl || candidate.website);
  if (!normalizedSourceUrl) {
    throw new OrganisationCatalogueValidationError("A direct source URL is required.");
  }
  const now = new Date().toISOString();
  const next: OrganisationCatalogueReviewRecord = {
    candidateId,
    decision,
    amendments,
    normalizedSourceUrl,
    sourceOpened,
    identityConfirmed,
    classificationsConfirmed,
    safetyChecked,
    notes: notes || null,
    reviewerEmail,
    reviewedAt: existing?.reviewedAt ?? now,
    updatedAt: now,
    version: (existing?.version ?? 0) + 1,
  };
  await database.batch([
    database
      .prepare(
        `INSERT INTO organisation_catalogue_reviews (
           candidate_id, decision, amendments_json, normalized_source_url,
           source_opened, identity_confirmed, classifications_confirmed,
           safety_checked, notes, reviewer_email, reviewed_at, updated_at, version
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(candidate_id) DO UPDATE SET
           decision = excluded.decision,
           amendments_json = excluded.amendments_json,
           normalized_source_url = excluded.normalized_source_url,
           source_opened = excluded.source_opened,
           identity_confirmed = excluded.identity_confirmed,
           classifications_confirmed = excluded.classifications_confirmed,
           safety_checked = excluded.safety_checked,
           notes = excluded.notes,
           reviewer_email = excluded.reviewer_email,
           updated_at = excluded.updated_at,
           version = excluded.version`,
      )
      .bind(
        next.candidateId,
        next.decision,
        JSON.stringify(next.amendments),
        next.normalizedSourceUrl,
        Number(next.sourceOpened),
        Number(next.identityConfirmed),
        Number(next.classificationsConfirmed),
        Number(next.safetyChecked),
        next.notes,
        next.reviewerEmail,
        next.reviewedAt,
        next.updatedAt,
        next.version,
      ),
    database
      .prepare(
        `INSERT INTO review_audit_events (
           id, record_type, record_id, action, before_json, after_json,
           reason, reviewer_email, occurred_at
         ) VALUES (?, 'organisation_catalogue', ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        `evt_${crypto.randomUUID()}`,
        candidateId,
        `catalogue_${decision}`,
        existing ? JSON.stringify(existing) : null,
        JSON.stringify(next),
        notes || `Organisation catalogue candidate marked ${decision}.`,
        reviewerEmail,
        now,
      ),
  ]);
  return normaliseReview({ ...next, amendmentsJson: JSON.stringify(next.amendments) });
}

async function findReview(database: D1Database, candidateId: string) {
  const record = await database
    .prepare(
      `SELECT
         candidate_id AS candidateId, decision, amendments_json AS amendmentsJson,
         normalized_source_url AS normalizedSourceUrl, source_opened AS sourceOpened,
         identity_confirmed AS identityConfirmed,
         classifications_confirmed AS classificationsConfirmed,
         safety_checked AS safetyChecked, notes, reviewer_email AS reviewerEmail,
         reviewed_at AS reviewedAt, updated_at AS updatedAt, version
       FROM organisation_catalogue_reviews WHERE candidate_id = ?`,
    )
    .bind(candidateId)
    .first<Omit<OrganisationCatalogueReviewRecord, "amendments"> & { amendmentsJson: string | null }>();
  return record ? normaliseReview(record) : null;
}

function normaliseReview(
  record: Omit<OrganisationCatalogueReviewRecord, "amendments"> & { amendmentsJson: string | null },
): OrganisationCatalogueReviewRecord {
  return {
    ...record,
    amendments: record.amendmentsJson
      ? (JSON.parse(record.amendmentsJson) as OrganisationCatalogueReviewRecord["amendments"])
      : {},
    sourceOpened: Boolean(record.sourceOpened),
    identityConfirmed: Boolean(record.identityConfirmed),
    classificationsConfirmed: Boolean(record.classificationsConfirmed),
    safetyChecked: Boolean(record.safetyChecked),
  };
}

export class OrganisationCatalogueNotFoundError extends Error {}
export class OrganisationCatalogueConflictError extends Error {}
export class OrganisationCatalogueValidationError extends Error {}
