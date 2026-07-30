CREATE TABLE `assertion_reviews` (
	`assertion_id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`decision` text NOT NULL,
	`proposed_value` text,
	`proposed_evidence_status` text,
	`notes` text,
	`source_checked` integer DEFAULT false NOT NULL,
	`safety_checked` integer DEFAULT false NOT NULL,
	`reviewer_email` text NOT NULL,
	`reviewed_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assertion_reviews_batch_decision_idx` ON `assertion_reviews` (`batch_id`,`decision`);--> statement-breakpoint
CREATE TABLE `review_audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`record_type` text NOT NULL,
	`record_id` text NOT NULL,
	`action` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`reason` text,
	`reviewer_email` text NOT NULL,
	`occurred_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `review_audit_record_idx` ON `review_audit_events` (`record_type`,`record_id`);--> statement-breakpoint
CREATE INDEX `review_audit_occurred_idx` ON `review_audit_events` (`occurred_at`);--> statement-breakpoint
CREATE TABLE `source_reviews` (
	`source_id` text PRIMARY KEY NOT NULL,
	`rights_status` text NOT NULL,
	`source_license` text,
	`independence_class` text,
	`notes` text,
	`reviewer_email` text NOT NULL,
	`reviewed_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `source_reviews_rights_status_idx` ON `source_reviews` (`rights_status`);