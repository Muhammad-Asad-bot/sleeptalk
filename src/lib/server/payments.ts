import "server-only";
import { createHmac } from "node:crypto";
import { absoluteUrl } from "@/lib/utils";
import { safeEqual } from "./security";

/**
 * Payment provider adapters. Card details never touch this application: shoppers pay on the
 * provider's hosted page and the order is marked paid only from a verified server-side event.
 *
 *  - "test": built-in simulator for development. Disabled when NODE_ENV=production unless
 *    ALLOW_TEST_PAYMENTS=true (staging only).
 *  - "stripe": Stripe Checkout (supports UK and Canadian merchants). Requires STRIPE_SECRET_KEY
 *    and STRIPE_WEBHOOK_SECRET; webhook endpoint: /api/webhooks/stripe
 *    CAD orders can also be paid from a Canadian bank account (pre-authorized debit / ACSS).
 *    Bank debits clear in 3–5 business days: the order stays "awaiting payment" with
 *    bankDebitSubmittedAt set until checkout.session.async_payment_succeeded/failed arrives.
 */

export type PaymentOrder = {
  id: string;
  number: string;
  email: string;
  currency: string;
  total: number;
  accessToken: string;
  itemCount: number;
};

export type PaymentSession = { redirectUrl: string; ref: string };

export type ProviderId = "test" | "stripe";

export function activeProvider(): ProviderId {
  return process.env.PAYMENT_PROVIDER === "stripe" ? "stripe" : "test";
}

export function testPaymentsAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_TEST_PAYMENTS === "true";
}

function confirmationUrl(order: PaymentOrder) {
  return absoluteUrl(`/order-confirmation/${order.number}?t=${encodeURIComponent(order.accessToken)}`);
}

export function failureUrl(order: Pick<PaymentOrder, "number" | "accessToken">, reason = "cancelled") {
  return `/order-failed?order=${encodeURIComponent(order.number)}&t=${encodeURIComponent(order.accessToken)}&reason=${reason}`;
}

export async function createPaymentSession(order: PaymentOrder): Promise<PaymentSession> {
  const provider = activeProvider();
  if (provider === "test") {
    if (!testPaymentsAllowed()) throw new Error("Test payments are disabled in production.");
    return {
      redirectUrl: `/checkout/test-payment?order=${encodeURIComponent(order.number)}&t=${encodeURIComponent(order.accessToken)}`,
      ref: `test_${order.number}`,
    };
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  const body = new URLSearchParams({
    mode: "payment",
    customer_email: order.email,
    client_reference_id: order.id,
    success_url: confirmationUrl(order),
    cancel_url: absoluteUrl(failureUrl(order, "cancelled")),
    "metadata[order_id]": order.id,
    "metadata[order_number]": order.number,
    "payment_intent_data[metadata][order_id]": order.id,
    // Totals (incl. discount and shipping) are computed server-side; charge them as one line.
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": order.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(order.total),
    "line_items[0][price_data][product_data][name]": `SLEEP TALK order ${order.number} (${order.itemCount} item${order.itemCount === 1 ? "" : "s"})`,
    expires_at: String(Math.floor(Date.now() / 1000) + 60 * 60),
  });
  if (order.currency.toUpperCase() === "CAD") {
    // Card (incl. Apple Pay / Google Pay) plus Canadian bank account. One-off purchases by consumers.
    body.append("payment_method_types[]", "card");
    body.append("payment_method_types[]", "acss_debit");
    body.set("payment_method_options[acss_debit][mandate_options][payment_schedule]", "sporadic");
    body.set("payment_method_options[acss_debit][mandate_options][transaction_type]", "personal");
  }
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `checkout-${order.id}`,
    },
    body,
  });
  const json = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !json.url || !json.id) throw new Error(`Stripe error: ${json.error?.message ?? res.status}`);
  return { redirectUrl: json.url, ref: json.id };
}

/** Expires an open Stripe Checkout Session so it can no longer be paid. */
export async function cancelPaymentSession(ref: string | null) {
  if (!ref || !ref.startsWith("cs_") || !process.env.STRIPE_SECRET_KEY) return true;
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${ref}/expire`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  });
  if (res.ok) return true;
  // Already expired is fine; already completed means the payment went through.
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  return !/complete/i.test(json.error?.message ?? "");
}

/** Verifies a Stripe webhook signature (v1 scheme) with a 5 minute tolerance. */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, toleranceSec = 300) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k, v.join("=")];
    }),
  );
  const timestamp = Number(parts.t);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const signatures = header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  return signatures.some((sig) => safeEqual(sig, expected));
}
