ALTER TABLE `board_meta` ADD `tina_status` text DEFAULT '待命，随时喊我' NOT NULL;
--> statement-breakpoint
ALTER TABLE `board_meta` ADD `done_today` text DEFAULT '[]' NOT NULL;
