DELETE FROM "set_components"
WHERE "set_product_id" IN (SELECT "id" FROM "products" WHERE "is_demo" = true)
   OR "component_product_id" IN (SELECT "id" FROM "products" WHERE "is_demo" = true);
--> statement-breakpoint
DELETE FROM "products" WHERE "is_demo" = true;
--> statement-breakpoint
UPDATE "settings"
SET "value" = jsonb_set(
  "value",
  '{messages,1}',
  to_jsonb('Preview store — product catalogue is being prepared. Orders are not fulfilled.'::text)
)
WHERE "key" = 'announcement'
  AND "value"->'messages'->>1 = 'Preview store — demo products and prices. Orders are not fulfilled.';
