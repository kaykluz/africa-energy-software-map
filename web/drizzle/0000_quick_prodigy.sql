CREATE TABLE `contribution_contacts` (
	`contribution_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`delete_after` text NOT NULL,
	FOREIGN KEY (`contribution_id`) REFERENCES `contributions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `contribution_rate_limits` (
	`key` text NOT NULL,
	`window_started_at` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contribution_rate_window_idx` ON `contribution_rate_limits` (`key`,`window_started_at`);--> statement-breakpoint
CREATE TABLE `contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_type` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`submitted_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`related_entity_id` text,
	`product_name` text,
	`organisation_name` text,
	`category` text,
	`country_iso2` text,
	`customer_disclosure` text,
	`customer_public` text,
	`started_year` text,
	`lifecycle` text,
	`field_name` text,
	`proposed_value` text,
	`evidence_url` text NOT NULL,
	`contributor_relationship` text,
	`authority` text,
	`notes` text,
	`sensitive_confirmed` integer NOT NULL,
	`status_token_hash` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contributions_status_submitted_idx` ON `contributions` (`status`,`submitted_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `contributions_status_token_idx` ON `contributions` (`status_token_hash`);