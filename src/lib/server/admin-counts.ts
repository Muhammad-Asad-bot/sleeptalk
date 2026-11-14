import "server-only";
import { and, eq, lte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { contactMessages, orders, products, reviews, variants } from "@/db/schema";

/** "Needs attention" counters shown next to admin menu items, keyed by the item's href. */
export async function getAdminCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  const [toFulfil, openMessages, pendingReviews, lowStock] = await Promise.all([
    db.$count(orders, and(eq(orders.status, "paid"), eq(orders.fulfillmentStatus, "unfulfilled"))),
    db.$count(contactMessages, eq(contactMessages.handled, false)),
    db.$count(reviews, eq(reviews.status, "pending")),
    db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(and(eq(variants.active, true), eq(variants.allowBackorder, false), lte(variants.stock, variants.lowStockThreshold), eq(products.status, "active")))
      .then((r) => r[0]?.n ?? 0),
  ]);
  return { "/admin/orders": toFulfil, "/admin/messages": openMessages, "/admin/reviews": pendingReviews, "/admin/inventory": lowStock };
}
