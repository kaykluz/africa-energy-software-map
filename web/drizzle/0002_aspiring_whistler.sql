CREATE TABLE `maintenance_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text NOT NULL,
	`expired_contacts_deleted` integer DEFAULT 0 NOT NULL,
	`expired_rate_limits_deleted` integer DEFAULT 0 NOT NULL,
	`open_contributions` integer DEFAULT 0 NOT NULL,
	`oldest_open_at` text,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `maintenance_runs_finished_idx` ON `maintenance_runs` (`finished_at`);--> statement-breakpoint
CREATE TABLE `system_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
