ALTER TABLE "order_items" ADD COLUMN "is_preorder" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "preorder_message" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "preorder" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "preorder_message" text DEFAULT 'Ships as soon as possible' NOT NULL;