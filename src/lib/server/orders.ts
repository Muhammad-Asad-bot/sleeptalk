import "server-only";
import { and, eq, gte, isNull, or, sql } from "drizzle-orm";
import { getDb, type Db } from "@/db/client";
import {
  discounts,
  orderItems,
  orders,
  products,
  stockMovements,
  variants,
  type AddressFields,
} from "@/db/schema";
import { formatMoney, MARKETS, type MarketCode } from "@/lib/markets";
import type { CartLineInput, CartQuote } from "@/lib/cart-types";
import { absoluteUrl } from "@/lib/utils";
import { resolveCart } from "./cart";
import { sendEmail } from "./email";
import { activeProvider, cancelPaymentSession, createPaymentSession, getPaymentSessionState } from "./payments";
import { randomToken, safeEqual } from "./security";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

class StockError extends Error {}

const NUMBER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function orderNumber() {
  const bytes = crypto.getRandomValues(new Uint8Array(7));
  return `ST-${[...bytes].map((b) => NUMBER_ALPHABET[b % NUMBER_ALPHABET.length]).join("")}`;
}

/** Variant demand for an order line: the variant itself, or one per set component. */
function itemDemand(item: { variantId: string | null; quantity: number; components: { variantId: string }[] }) {
  if (item.components?.length) return item.components.map((c) => ({ variantId: c.variantId, qty: item.quantity }));
  return item.variantId ? [{ variantId: item.variantId, qty: item.quantity }] : [];
}

function aggregate(demands: { variantId: string; qty: number }[]) {
  const map = new Map<string, number>();
  for (const d of demands) map.set(d.variantId, (map.get(d.variantId) ?? 0) + d.qty);
  return map;
}

async function adjustStock(tx: Tx, variantId: string, delta: number, reason: "order" | "order_released" | "order_reinstated", orderId: string, conditional: boolean) {
  const condition = conditional && delta < 0
    ? and(eq(variants.id, variantId), or(gte(variants.stock, -delta), eq(variants.allowBackorder, true)))
    : eq(variants.id, variantId);
  const updated = await tx
    .update(variants)
    .set({ stock: sql`${variants.stock} + ${delta}` })
    .where(condition)
    .returning({ stock: variants.stock });
  if (!updated.length) throw new StockError(variantId);
  await tx.insert(stockMovements).values({ variantId, delta, stockAfter: updated[0].stock, reason, orderId });
}

export type PlaceOrderInput = {
  checkoutToken: string;
  email: string;
  phone: string;
  shippingAddress: AddressFields;
  billingAddress: AddressFields;
  shippingRateId: string;
  discountCode: string | null;
  lines: CartLineInput[];
  market: MarketCode;
  userId: string | null;
};

export type PlaceOrderResult =
  | { ok: true; redirectUrl: string; orderNumber: string }
  | { ok: false; error: string; quote?: CartQuote; resetToken?: boolean };

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const db = await getDb();

  // Idempotency: a resubmitted checkout attempt returns the same order instead of a duplicate.
  const [existing] = await db.select().from(orders).where(eq(orders.checkoutToken, input.checkoutToken)).limit(1);
  if (existing) {
    if (existing.status === "paid") {
      return { ok: true, orderNumber: existing.number, redirectUrl: `/order-confirmation/${existing.number}?t=${existing.accessToken}` };
    }
    if (existing.status === "pending_payment" && existing.bankDebitSubmittedAt) {
      // A bank payment is already on its way — never open a second payment session.
      return { ok: true, orderNumber: existing.number, redirectUrl: `/order-confirmation/${existing.number}?t=${existing.accessToken}` };
    }
    if (existing.status === "pending_payment") {
      const confirmation = `/order-confirmation/${existing.number}?t=${existing.accessToken}`;
      try {
        // Same checkout attempt again (back button, double click): reuse the open session so
        // the order can never be paid twice.
        const previous = await getPaymentSessionState(existing.paymentRef);
        if (previous.status === "open") return { ok: true, orderNumber: existing.number, redirectUrl: previous.url };
        if (previous.status === "complete") return { ok: true, orderNumber: existing.number, redirectUrl: confirmation };
        if (previous.status === "unknown" && !(await cancelPaymentSession(existing.paymentRef))) {
          return { ok: true, orderNumber: existing.number, redirectUrl: confirmation };
        }
        const itemCount = (await db.select().from(orderItems).where(eq(orderItems.orderId, existing.id))).reduce((n, i) => n + i.quantity, 0);
        const session = await createPaymentSession({ ...existing, itemCount });
        await db.update(orders).set({ paymentRef: session.ref }).where(eq(orders.id, existing.id));
        return { ok: true, orderNumber: existing.number, redirectUrl: session.redirectUrl };
      } catch (error) {
        console.error("[checkout] resuming payment failed", error);
        return { ok: false, error: "We couldn't restart the payment. Please try again in a moment." };
      }
    }
    return { ok: false, error: "That checkout attempt has ended. Please review your bag and try again.", resetToken: true };
  }

  const quote = await resolveCart({
    lines: input.lines,
    market: input.market,
    discountCode: input.discountCode,
    shippingRateId: input.shippingRateId,
  });
  if (!quote.lines.length || quote.itemCount === 0) return { ok: false, error: "Your bag is empty.", quote };
  if (quote.hasIssues) return { ok: false, error: "Some items in your bag have changed. Please review them before paying.", quote };
  if (quote.discount?.error) return { ok: false, error: quote.discount.error, quote };
  const shipping = quote.shippingOptions.find((o) => o.id === quote.selectedShippingId);
  if (!shipping || shipping.id !== input.shippingRateId) return { ok: false, error: "Please choose a delivery method.", quote };

  const discountId = quote.discount && quote.discount.amount > 0
    ? (await db.select({ id: discounts.id }).from(discounts).where(eq(discounts.code, quote.discount.code)).limit(1))[0]?.id ?? null
    : null;

  const accessToken = randomToken(24);
  const number = orderNumber();
  let orderId: string;
  try {
    orderId = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          number,
          userId: input.userId,
          email: input.email,
          phone: input.phone,
          market: input.market,
          currency: MARKETS[input.market].currency,
          subtotal: quote.subtotal,
          discountTotal: quote.discount?.amount ?? 0,
          shippingTotal: quote.shippingTotal ?? 0,
          taxTotal: quote.taxTotal,
          total: quote.total,
          discountCode: quote.discount?.amount ? quote.discount.code : null,
          discountId,
          shippingAddress: input.shippingAddress,
          billingAddress: input.billingAddress,
          shippingMethod: { id: shipping.id, name: shipping.name, price: shipping.price, description: shipping.description },
          checkoutToken: input.checkoutToken,
          accessToken,
          paymentProvider: activeProvider(),
          isTest: activeProvider() === "test",
        })
        .returning({ id: orders.id });

      await tx.insert(orderItems).values(
        quote.lines.map((l) => ({
          orderId: order.id,
          productId: l.productId,
          variantId: l.variantId,
          title: l.title,
          variantLabel: l.variantLabel,
          sku: l.sku,
          image: l.image ?? "",
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          lineTotal: l.lineTotal,
          components: l.components,
        })),
      );

      // Reserve stock atomically; any shortfall rolls back the whole order (no overselling).
      const demand = aggregate(
        quote.lines.flatMap((l) => itemDemand({ variantId: l.isSet ? null : l.variantId, quantity: l.quantity, components: l.components })),
      );
      for (const [variantId, qty] of demand) {
        await adjustStock(tx, variantId, -qty, "order", order.id, true);
      }
      return order.id;
    });
  } catch (error) {
    if (error instanceof StockError) {
      const fresh = await resolveCart({ lines: input.lines, market: input.market, discountCode: input.discountCode, shippingRateId: input.shippingRateId });
      return { ok: false, error: "Sorry — an item just sold out. Your bag has been updated.", quote: fresh };
    }
    throw error;
  }

  try {
    const session = await createPaymentSession({
      id: orderId,
      number,
      email: input.email,
      currency: MARKETS[input.market].currency,
      total: quote.total,
      accessToken,
      itemCount: quote.itemCount,
    });
    await db.update(orders).set({ paymentRef: session.ref }).where(eq(orders.id, orderId));
    return { ok: true, orderNumber: number, redirectUrl: session.redirectUrl };
  } catch (error) {
    console.error("[checkout] payment session failed", error);
    await markOrderFailed(orderId, "payment_session_error");
    return { ok: false, error: "We couldn't start the payment. Your bag is saved — please try again.", resetToken: true };
  }
}

/** Marks an order paid from a VERIFIED provider event. Idempotent. */
export async function markOrderPaid(orderId: string, evidence: { ref?: string | null; amount?: number; currency?: string }) {
  const db = await getDb();
  const outcome = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order) return { ok: false as const, reason: "not_found" };
    if (order.status === "paid") return { ok: true as const, already: true, order };
    if (
      (evidence.amount != null && evidence.amount !== order.total) ||
      (evidence.currency && evidence.currency.toUpperCase() !== order.currency)
    ) {
      await tx
        .update(orders)
        .set({ internalNotes: `${order.internalNotes}\n[${new Date().toISOString()}] Payment amount/currency mismatch: ${evidence.amount} ${evidence.currency}`.trim() })
        .where(eq(orders.id, order.id));
      return { ok: false as const, reason: "amount_mismatch" };
    }
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    let notes = order.internalNotes;
    if (order.stockReleased) {
      // Paid after the reservation was released (e.g. late payment) — re-deduct and flag.
      for (const [variantId, qty] of aggregate(items.flatMap(itemDemand))) {
        await adjustStock(tx, variantId, -qty, "order_reinstated", order.id, false);
      }
      notes = `${notes}\n[${new Date().toISOString()}] Paid after stock was released — check stock levels.`.trim();
    }
    await tx
      .update(orders)
      .set({ status: "paid", paidAt: new Date(), stockReleased: false, paymentRef: evidence.ref ?? order.paymentRef, internalNotes: notes })
      .where(eq(orders.id, order.id));
    const perProduct = new Map<string, number>();
    for (const i of items) if (i.productId) perProduct.set(i.productId, (perProduct.get(i.productId) ?? 0) + i.quantity);
    for (const [pid, qty] of perProduct) {
      await tx.update(products).set({ salesCount: sql`${products.salesCount} + ${qty}` }).where(eq(products.id, pid));
    }
    if (order.discountId) {
      await tx.update(discounts).set({ usageCount: sql`${discounts.usageCount} + 1` }).where(eq(discounts.id, order.discountId));
    }
    return { ok: true as const, already: false, order: { ...order, status: "paid" as const }, items };
  });

  if (outcome.ok && !outcome.already && "items" in outcome && outcome.items) {
    const o = outcome.order;
    const market = o.market;
    const lines = outcome.items.map((i) => `- ${i.title} (${i.variantLabel}) × ${i.quantity} — ${formatMoney(i.lineTotal, market)}`).join("\n");
    await sendEmail({
      to: o.email,
      subject: `SLEEP TALK — order ${o.number} confirmed`,
      text: `Thanks for your order.\n\nOrder ${o.number}\n${lines}\n\nSubtotal: ${formatMoney(o.subtotal, market)}\nDiscount: -${formatMoney(o.discountTotal, market)}\nShipping: ${formatMoney(o.shippingTotal, market)}\nTotal: ${formatMoney(o.total, market)}\n\nView your order: ${absoluteUrl(`/order-confirmation/${o.number}?t=${o.accessToken}`)}\n${o.isTest ? "\n[TEST ORDER — no payment was taken and nothing will be shipped]\n" : ""}`,
    }).catch((e) => console.error("[email] confirmation failed", e));
  }
  return outcome;
}

/**
 * A Canadian bank debit was submitted on Stripe (VERIFIED webhook) but has not cleared yet.
 * The order stays awaiting payment with its stock reserved; the customer is told it takes a few days.
 */
export async function markBankDebitSubmitted(orderId: string, ref: string | null) {
  const db = await getDb();
  const note = `\n[${new Date().toISOString()}] Bank debit (pre-authorized debit) submitted — waiting for it to clear. Do not ship yet.`;
  const [order] = await db
    .update(orders)
    .set({
      bankDebitSubmittedAt: new Date(),
      paymentRef: ref ?? sql`${orders.paymentRef}`,
      internalNotes: sql`ltrim(${orders.internalNotes} || ${note})`,
    })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending_payment"), isNull(orders.bankDebitSubmittedAt)))
    .returning();
  if (!order) return false; // already recorded, or no longer pending
  await sendEmail({
    to: order.email,
    subject: `SLEEP TALK — order ${order.number} received, bank payment processing`,
    text: `Thanks for your order.\n\nYou paid for order ${order.number} (${formatMoney(order.total, order.market)}) from your bank account. Bank payments usually take 3–5 business days to clear. We'll email you as soon as it's confirmed, and your order ships after that.\n\nView your order: ${absoluteUrl(`/order-confirmation/${order.number}?t=${order.accessToken}`)}\n`,
  }).catch((e) => console.error("[email] bank debit notice failed", e));
  return true;
}

/** Marks a pending order failed/cancelled and releases its reserved stock. Idempotent. */
export async function markOrderFailed(orderId: string, reason: string, status: "payment_failed" | "cancelled" = "payment_failed") {
  const db = await getDb();
  const failed = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order || order.status !== "pending_payment") return null;
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    if (!order.stockReleased) {
      for (const [variantId, qty] of aggregate(items.flatMap(itemDemand))) {
        await adjustStock(tx, variantId, qty, "order_released", order.id, false);
      }
    }
    await tx
      .update(orders)
      .set({
        status,
        stockReleased: true,
        internalNotes: `${order.internalNotes}\n[${new Date().toISOString()}] ${status}: ${reason}`.trim(),
      })
      .where(eq(orders.id, order.id));
    return order;
  });
  if (!failed) return false;
  if (failed.bankDebitSubmittedAt && status === "payment_failed") {
    // The customer left checkout days ago believing they'd paid — tell them it bounced.
    await sendEmail({
      to: failed.email,
      subject: `SLEEP TALK — payment for order ${failed.number} didn't go through`,
      text: `Your bank payment for order ${failed.number} (${formatMoney(failed.total, failed.market)}) was not completed by your bank, so the order has been cancelled and you have not been charged.\n\nIf you'd still like the items, please place the order again: ${absoluteUrl("/cart")}\n`,
    }).catch((e) => console.error("[email] bank debit failure notice failed", e));
  }
  return true;
}

/** Shopper returned from the provider without paying: expire the session, then release stock. */
export async function cancelPendingOrder(number: string, token: string) {
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.number, number)).limit(1);
  if (!order || !safeEqual(order.accessToken, token) || order.status !== "pending_payment") return order ?? null;
  const cancelled = await cancelPaymentSession(order.paymentRef);
  if (cancelled) await markOrderFailed(order.id, "shopper cancelled payment", "payment_failed");
  const [fresh] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
  return fresh ?? null;
}

/** Refund through the payment integration. Optionally return stock. */
export async function refundOrder(orderId: string, restock: boolean) {
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.status !== "paid") return { ok: false, error: "Only paid orders can be refunded." };

  if (order.paymentProvider === "stripe") {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || !order.paymentRef) return { ok: false, error: "Stripe is not configured for refunds." };
    const sessionRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${order.paymentRef}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const session = (await sessionRes.json()) as { payment_intent?: string };
    if (!session.payment_intent) return { ok: false, error: "Could not find the Stripe payment for this order." };
    const refund = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `refund-${order.id}` },
      body: new URLSearchParams({ payment_intent: session.payment_intent }),
    });
    if (!refund.ok) return { ok: false, error: "Stripe declined the refund. Check the Stripe dashboard." };
  } else if (!order.isTest) {
    return { ok: false, error: "This order's payment provider does not support refunds from admin." };
  }

  await db.transaction(async (tx) => {
    if (restock) {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      for (const [variantId, qty] of aggregate(items.flatMap(itemDemand))) {
        await adjustStock(tx, variantId, qty, "order_released", order.id, false);
      }
    }
    await tx
      .update(orders)
      .set({ status: "refunded", internalNotes: `${order.internalNotes}\n[${new Date().toISOString()}] Refunded${restock ? " and restocked" : ""}.`.trim() })
      .where(eq(orders.id, order.id));
  });
  return { ok: true };
}

export async function getOrderWithItems(number: string) {
  const db = await getDb();
  const order = await db.query.orders.findFirst({ where: eq(orders.number, number), with: { items: true } });
  return order ?? null;
}

/** Guest-safe order lookup: requires the order's access token, or ownership by the signed-in user. */
export async function getOrderForViewer(number: string, token: string | null | undefined, userId: string | null) {
  const order = await getOrderWithItems(number);
  if (!order) return null;
  const tokenOk = !!token && safeEqual(order.accessToken, token);
  const ownerOk = !!userId && order.userId === userId;
  return tokenOk || ownerOk ? order : null;
}
