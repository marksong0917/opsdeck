CREATE TABLE `program_state` (
	`program_id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`evidence` text NOT NULL DEFAULT '',
	`verified_at` integer
);
--> statement-breakpoint
CREATE TABLE `program_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`program_id` text NOT NULL,
	`action` text NOT NULL,
	`status` text NOT NULL DEFAULT 'pending',
	`requested_at` integer NOT NULL,
	`closed_at` integer
);
--> statement-breakpoint
CREATE TABLE `program_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`program_id` text NOT NULL,
	`kind` text NOT NULL,
	`action` text NOT NULL,
	`text` text NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `program_prefs` (
	`id` integer PRIMARY KEY NOT NULL,
	`proxy_autostart` integer NOT NULL DEFAULT 1
);
