CREATE TABLE `control_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_key` text NOT NULL,
	`payload` text NOT NULL,
	`reported_at` integer NOT NULL
);
