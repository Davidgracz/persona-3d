CREATE TABLE `figurine_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`finish` text NOT NULL,
	`size` text NOT NULL,
	`copies` integer DEFAULT 1 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`photo_metadata` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
