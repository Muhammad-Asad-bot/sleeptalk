ALTER TABLE "orders" ADD COLUMN "delivered_at" timestamp with time zone;
UPDATE "orders" AS o
SET "delivered_at" = (
  SELECT max(a."created_at")
  FROM "audit_logs" AS a
  WHERE a."entity_type" = 'order'
    AND a."entity_id" = o."id"
    AND a."action" = 'order.fulfilment_updated'
    AND a."details" ->> 'to' = 'delivered'
)
WHERE o."fulfillment_status" = 'delivered'
  AND EXISTS (
    SELECT 1
    FROM "audit_logs" AS a
    WHERE a."entity_type" = 'order'
      AND a."entity_id" = o."id"
      AND a."action" = 'order.fulfilment_updated'
      AND a."details" ->> 'to' = 'delivered'
  );