"use server";

import { revalidatePath } from "next/cache";
import { refreshStorefront } from "@/lib/server/store-cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { contactMessages, products, reviews, sessions, users } from "@/db/schema";
import { requireStaff } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { back, bool, int, str } from "@/lib/server/admin";

/* ───────── Reviews ───────── */

function sanitizeReviewText(text: string) {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/[<>]/g, "");
}

export async function moderateReviewAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const status = str(formData, "status", 20);
  const ret = str(formData, "_return", 200) || "/admin/reviews";
  if (!["approved", "rejected", "hidden", "pending"].includes(status)) back(ret, { error: "Invalid status." });
  const db = await getDb();
  await db.update(reviews).set({ status: status as "approved", reported: status === "approved" ? false : undefined, adminNote: str(formData, "adminNote", 500) }).where(eq(reviews.id, id));
  await audit(user, `review.${status}`, "review", id, {});
  revalidatePath("/admin/reviews");
  refreshStorefront();
  back(ret.startsWith("/admin") ? ret : "/admin/reviews", { ok: `Review ${status}.` });
}

export async function createAdminReviewAction(formData: FormData) {
  const user = await requireStaff();
  const productId = str(formData, "productId", 64);
  const authorName = sanitizeReviewText(str(formData, "authorName", 60));
  const rating = int(formData, "rating");
  const title = sanitizeReviewText(str(formData, "title", 120));
  const body = sanitizeReviewText(str(formData, "body", 3000));
  const path = "/admin/reviews";
  if (!productId) back(path, { error: "Choose a product." });
  if (!authorName) back(path, { error: "Enter a reviewer name." });
  if (rating == null || Number.isNaN(rating) || rating < 1 || rating > 5) back(path, { error: "Choose a rating from 1 to 5." });
  if (body.length < 20) back(path, { error: "Review text must be at least 20 characters." });
  const db = await getDb();
  const [product] = await db.select({ id: products.id, title: products.title }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product) back(path, { error: "Product not found." });
  const [review] = await db.insert(reviews).values({
    productId: product.id,
    userId: null,
    authorName,
    rating,
    title,
    body,
    status: "pending",
    verifiedPurchase: false,
  }).returning({ id: reviews.id });
  await audit(user, "review.created", "review", review.id, { productId: product.id, adminCreated: true });
  revalidatePath(path);
  back(path, { ok: `Review added for ${product.title}; approve it to show it on the store.` });
}

/* ───────── Customers ───────── */

export async function setCustomerDisabledAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const disabled = bool(formData, "disabled");
  const db = await getDb();
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) back("/admin/customers", { error: "Customer not found." });
  if (target.role !== "customer") back(`/admin/customers/${id}`, { error: "Staff accounts are managed in Users & roles." });
  await db.update(users).set({ disabled }).where(eq(users.id, id));
  if (disabled) await db.delete(sessions).where(eq(sessions.userId, id));
  await audit(user, disabled ? "customer.disabled" : "customer.enabled", "user", id, { email: target.email });
  revalidatePath(`/admin/customers/${id}`);
  back(`/admin/customers/${id}`, { ok: disabled ? "Account disabled and signed out." : "Account re-enabled." });
}

/* ───────── Messages ───────── */

export async function toggleMessageHandledAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const db = await getDb();
  const [m] = await db.select().from(contactMessages).where(eq(contactMessages.id, id)).limit(1);
  if (!m) back("/admin/messages", { error: "Message not found." });
  await db.update(contactMessages).set({ handled: !m.handled }).where(eq(contactMessages.id, id));
  await audit(user, m.handled ? "message.reopened" : "message.handled", "message", id, {});
  revalidatePath("/admin/messages");
  back("/admin/messages", { ok: m.handled ? "Marked as open." : "Marked as handled." });
}
