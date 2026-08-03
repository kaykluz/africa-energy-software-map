CREATE TABLE `organisation_catalogue_reviews` (
	`candidate_id` text PRIMARY KEY NOT NULL,
	`decision` text NOT NULL,
	`amendments_json` text,
	`normalized_source_url` text NOT NULL,
	`source_opened` integer DEFAULT false NOT NULL,
	`identity_confirmed` integer DEFAULT false NOT NULL,
	`classifications_confirmed` integer DEFAULT false NOT NULL,
	`safety_checked` integer DEFAULT false NOT NULL,
	`notes` text,
	`reviewer_email` text NOT NULL,
	`reviewed_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `organisation_catalogue_reviews_decision_idx` ON `organisation_catalogue_reviews` (`decision`);--> statement-breakpoint
CREATE INDEX `organisation_catalogue_reviews_updated_idx` ON `organisation_catalogue_reviews` (`updated_at`);