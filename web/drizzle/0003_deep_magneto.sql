CREATE TABLE `bulk_import_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`import_id` text NOT NULL,
	`row_number` integer NOT NULL,
	`row_key` text NOT NULL,
	`record_type` text NOT NULL,
	`status` text DEFAULT 'candidate' NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`import_id`) REFERENCES `bulk_imports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bulk_import_rows_key_idx` ON `bulk_import_rows` (`import_id`,`row_key`);--> statement-breakpoint
CREATE INDEX `bulk_import_rows_import_idx` ON `bulk_import_rows` (`import_id`,`row_number`);--> statement-breakpoint
CREATE TABLE `bulk_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`original_filename` text NOT NULL,
	`workbook_hash` text NOT NULL,
	`payload_hash` text NOT NULL,
	`status` text DEFAULT 'candidate' NOT NULL,
	`uploaded_by` text NOT NULL,
	`uploaded_at` text NOT NULL,
	`row_count` integer NOT NULL,
	`entity_count` integer NOT NULL,
	`planned_batch_count` integer NOT NULL,
	`warnings_json` text NOT NULL,
	`batch_plan_json` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bulk_imports_workbook_hash_idx` ON `bulk_imports` (`workbook_hash`);--> statement-breakpoint
CREATE INDEX `bulk_imports_uploaded_idx` ON `bulk_imports` (`uploaded_at`);