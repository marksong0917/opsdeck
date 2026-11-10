ALTER TABLE `items` ADD COLUMN `verdict` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `board_meta` ADD COLUMN `last_verdict_item_id` integer;
--> statement-breakpoint
ALTER TABLE `board_meta` ADD COLUMN `last_verdict` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `board_meta` ADD COLUMN `last_verdict_at` integer;
