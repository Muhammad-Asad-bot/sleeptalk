import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { orderItems, orders, reviews } from "@/db/schema";
import { isWithinReviewWindow } from "@/lib/review-window";

export type ReviewEligibility = "eligible" | "already-reviewed" | "not-eligible";

export async function getReviewEligibility(userId: string, productId: string, now = new Date()): Promise<ReviewEligibility> {
  const db = await getDb();
  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.userId, userId)))
    .limit(1);
  if (existing) return "already-reviewed";

  const deliveries = await db
    .select({ deliveredAt: orders.deliveredAt })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.userId, userId),
        eq(orders.status, "paid"),
        eq(orders.fulfillmentStatus, "delivered"),
        eq(orderItems.productId, productId),
      ),
    );
  return deliveries.some(({ deliveredAt }) => isWithinReviewWindow(deliveredAt, now)) ? "eligible" : "not-eligible";
}
