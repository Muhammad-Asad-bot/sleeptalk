import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { orderItems, orders, products, reviews } from "@/db/schema";
import { REVIEW_WINDOW_MS, isWithinReviewWindow } from "@/lib/review-window";

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

export type OrderReviewPrompt = { slug: string; state: "eligible" | "already-reviewed" | "sign-in" };
export type OrderReviewPrompts = { closesAt: Date; byProduct: Record<string, OrderReviewPrompt> };

/**
 * Review invitations for a delivered order, keyed by product id. Only the account that placed the
 * order can review (guest checkouts can't), only while the 7-day review window is open, and only
 * for products that are still on sale. A signed-out viewer of the owner's order is asked to sign in.
 */
export async function getOrderReviewPrompts(
  order: {
    userId: string | null;
    status: string;
    fulfillmentStatus: string;
    deliveredAt: Date | null;
    items: { productId: string | null }[];
  },
  viewerId: string | null,
  now = new Date(),
): Promise<OrderReviewPrompts | null> {
  if (order.status !== "paid" || order.fulfillmentStatus !== "delivered" || !order.userId) return null;
  if (!isWithinReviewWindow(order.deliveredAt, now)) return null;
  if (viewerId && viewerId !== order.userId) return null;

  const productIds = [...new Set(order.items.map((i) => i.productId).filter((id): id is string => !!id))];
  if (!productIds.length) return null;
  const db = await getDb();
  const live = await db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .where(and(inArray(products.id, productIds), eq(products.status, "active")));

  const byProduct: Record<string, OrderReviewPrompt> = {};
  for (const p of live) {
    const state = viewerId ? await getReviewEligibility(viewerId, p.id, now) : "sign-in";
    if (state !== "not-eligible") byProduct[p.id] = { slug: p.slug, state };
  }
  if (!Object.keys(byProduct).length) return null;
  return { closesAt: new Date(order.deliveredAt!.getTime() + REVIEW_WINDOW_MS), byProduct };
}
