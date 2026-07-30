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
