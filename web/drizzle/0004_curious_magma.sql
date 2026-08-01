CREATE TABLE `bulk_row_reviews` (
	`row_id` text PRIMARY KEY NOT NULL,
	`decision` text NOT NULL,
	`amended_payload_json` text,
	`normalized_source_url` text NOT NULL,
	`source_opened` integer DEFAULT false NOT NULL,
	`source_direct` integer DEFAULT false NOT NULL,
	`source_supports` integer DEFAULT false NOT NULL,
	`safety_checked` integer DEFAULT false NOT NULL,
	`notes` text,
	`reviewer_email` text NOT NULL,
	`reviewed_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`row_id`) REFERENCES `bulk_import_rows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bulk_row_reviews_decision_idx` ON `bulk_row_reviews` (`decision`);--> statement-breakpoint
CREATE TABLE `promoted_assertions` (
	`id` text PRIMARY KEY NOT NULL,
	`row_id` text NOT NULL,
	`import_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`subject_label` text NOT NULL,
	`subject_context` text NOT NULL,
	`subject_href` text NOT NULL,
	`predicate` text NOT NULL,
	`value` text NOT NULL,
	`source_id` text NOT NULL,
	`source_title` text NOT NULL,
	`source_publisher` text NOT NULL,
	`source_url` text NOT NULL,
	`source_license` text NOT NULL,
	`source_independence` text NOT NULL,
	`locator` text NOT NULL,
	`evidence_status` text NOT NULL,
	`notes` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`row_id`) REFERENCES `bulk_import_rows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`import_id`) REFERENCES `bulk_imports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `promoted_assertions_row_idx` ON `promoted_assertions` (`row_id`);--> statement-breakpoint
CREATE INDEX `promoted_assertions_batch_idx` ON `promoted_assertions` (`batch_id`);--> statement-breakpoint
CREATE INDEX `promoted_assertions_subject_idx` ON `promoted_assertions` (`subject_type`,`subject_id`);