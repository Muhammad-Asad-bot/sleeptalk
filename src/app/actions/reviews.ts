"use server";

import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { orderItems, orders, products, reviews } from "@/db/schema";
import { getCurrentUser } from "@/lib/server/auth";
import { limitByIp } from "@/lib/server/security";
import type { FormState } from "./store";

const reviewSchema = z.object({
  productId: z.string().min(1).max(64),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  title: z.string().trim().max(120).optional().default(""),
  body: z.string().trim().min(20, "Please write at least 20 characters").max(3000),
  authorName: z.string().trim().min(1, "Enter a display name").max(60),
});

/** Strips control characters and angle brackets; content is also rendered as plain text. */
function sanitize(text: string) {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/[<>]/g, "");
}

export async function submitReviewAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in to write a review." };
  const limited = await limitByIp("review", 5, 60 * 60_000);
  if (!limited.ok) return { ok: false, message: "You've submitted several reviews recently. Please try later." };
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, errors };
  }
  const db = await getDb();
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, parsed.data.productId)).limit(1);
  if (!product) return { ok: false, message: "Product not found." };

  const existing = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.productId, product.id), eq(reviews.userId, user.id)))
    .limit(1);
  if (existing.length) return { ok: false, message: "You've already reviewed this product." };

  // Verified purchase only when an order record proves it.
  const bought = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.userId, user.id), inArray(orders.status, ["paid"]), eq(orderItems.productId, product.id)))
    .limit(1);

  await db.insert(reviews).values({
    productId: product.id,
    userId: user.id,
    authorName: sanitize(parsed.data.authorName),
    rating: parsed.data.rating,
    title: sanitize(parsed.data.title),
    body: sanitize(parsed.data.body),
    status: "pending",
    verifiedPurchase: bought.length > 0,
  });
  return { ok: true, message: "Thanks! Your review has been submitted and will appear once it's approved." };
}

export async function reportReviewAction(reviewId: string) {
  const limited = await limitByIp("report-review", 20, 60 * 60_000);
  if (!limited.ok) return;
  const db = await getDb();
  await db.update(reviews).set({ reported: true }).where(eq(reviews.id, reviewId));
}
