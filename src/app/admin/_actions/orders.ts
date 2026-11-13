"use server";

import { revalidatePath } from "next/cache";
import { refreshStorefront } from "@/lib/server/store-cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { fulfillmentStatusEnum, orders } from "@/db/schema";
import { requireStaff } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { back, bool, str } from "@/lib/server/admin";
import { sendEmail } from "@/lib/server/email";
import { markOrderFailed, refundOrder } from "@/lib/server/orders";
import { absoluteUrl } from "@/lib/utils";

type Fulfilment = (typeof fulfillmentStatusEnum.enumValues)[number];

export async function updateFulfilmentAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const path = `/admin/orders/${id}`;
  const status = str(formData, "fulfillmentStatus", 20) as Fulfilment;
  if (!fulfillmentStatusEnum.enumValues.includes(status)) back(path, { error: "Choose a valid fulfilment status." });
  const trackingNumber = str(formData, "trackingNumber", 100);
  const carrier = str(formData, "carrier", 60);
  const notify = bool(formData, "notify");

  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) back("/admin/orders", { error: "Order not found." });
  if (order.status !== "paid") back(path, { error: "Only paid orders can be fulfilled." });

  const deliveredAt = status === "delivered" && order.fulfillmentStatus !== "delivered" ? new Date() : order.deliveredAt;
  await db.update(orders).set({ fulfillmentStatus: status, deliveredAt, trackingNumber, carrier }).where(eq(orders.id, id));
  await audit(user, "order.fulfilment_updated", "order", id, {
    number: order.number,
    from: order.fulfillmentStatus,
    to: status,
    trackingNumber,
    carrier,
  });

  if (notify && (status === "shipped" || status === "delivered") && status !== order.fulfillmentStatus) {
    const tracking = trackingNumber ? `\nTracking: ${carrier ? `${carrier} ` : ""}${trackingNumber}` : "";
    await sendEmail({
      to: order.email,
      subject: status === "shipped" ? `Your SLEEP TALK order ${order.number} is on its way` : `Your SLEEP TALK order ${order.number} has been delivered`,
      text: `${status === "shipped" ? "Good news — your order has shipped." : "Your order has been marked as delivered."}${tracking}\n\nView your order: ${absoluteUrl(`/order-confirmation/${order.number}?t=${order.accessToken}&view=track`)}\n`,
    }).catch(() => null);
  }
  revalidatePath(path);
  back(path, { ok: notify && status === "shipped" ? "Fulfilment updated and customer notified." : "Fulfilment updated." });
}

export async function addOrderNoteAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const note = str(formData, "note", 2000);
  const path = `/admin/orders/${id}`;
  if (!note) back(path, { error: "Write a note first." });
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) back("/admin/orders", { error: "Order not found." });
  const stamped = `[${new Date().toISOString()}] ${user.email}: ${note}`;
  await db.update(orders).set({ internalNotes: `${order.internalNotes}\n${stamped}`.trim() }).where(eq(orders.id, id));
  await audit(user, "order.note_added", "order", id, { number: order.number });
  revalidatePath(path);
  back(path, { ok: "Note added." });
}

/** Cancel an unpaid order and release its reserved stock. */
export async function cancelOrderAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const path = `/admin/orders/${id}`;
  const db = await getDb();
  const [current] = await db.select({ bank: orders.bankDebitSubmittedAt }).from(orders).where(eq(orders.id, id)).limit(1);
  if (current?.bank) back(path, { error: "A bank payment is already on its way for this order. Wait for Stripe to confirm or fail it." });
  const done = await markOrderFailed(id, `cancelled by ${user.email}`, "cancelled");
  if (!done) back(path, { error: "Only orders awaiting payment can be cancelled here." });
  await audit(user, "order.cancelled", "order", id, {});
  revalidatePath(path);
  refreshStorefront();
  back(path, { ok: "Order cancelled and stock released." });
}

/** Refund through the payment integration (never a manual status flip). */
export async function refundOrderAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const path = `/admin/orders/${id}`;
  if (str(formData, "confirm", 10) !== "REFUND") back(path, { error: 'Type REFUND to confirm the refund.' });
  const restock = bool(formData, "restock");
  const result = await refundOrder(id, restock);
  if (!result.ok) back(path, { error: result.error ?? "Refund failed." });
  await audit(user, "order.refunded", "order", id, { restock });
  revalidatePath(path);
  refreshStorefront();
  back(path, { ok: restock ? "Refunded and items returned to stock." : "Refunded." });
}
