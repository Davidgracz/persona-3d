CREATE TABLE `generation_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`public_token` text NOT NULL,
	`email` text NOT NULL,
	`style` text NOT NULL,
	`price_cents` integer DEFAULT 4900 NOT NULL,
	`currency` text DEFAULT 'pln' NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`generation_status` text DEFAULT 'awaiting_payment' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`stripe_session_id` text,
	`stripe_payment_intent_id` text,
	`meshy_prototype_task_id` text,
	`meshy_model_task_id` text,
	`meshy_convert_task_id` text,
	`glb_key` text,
	`stl_key` text,
	`thumbnail_key` text,
	`photo_metadata` text NOT NULL,
	`error_message` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`paid_at` text,
	`completed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `generation_orders_public_token_unique` ON `generation_orders` (`public_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `generation_orders_stripe_session_unique` ON `generation_orders` (`stripe_session_id`);