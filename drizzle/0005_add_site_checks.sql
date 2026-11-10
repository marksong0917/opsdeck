CREATE TABLE `site_checks` (
	`key` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`http_status` integer,
	`detail` text NOT NULL,
	`checked_at` integer NOT NULL
);
