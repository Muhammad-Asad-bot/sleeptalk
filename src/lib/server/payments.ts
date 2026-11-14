import "server-only";
import { createHmac } from "node:crypto";
import { absoluteUrl } from "@/lib/utils";
import { safeEqual } from "./security";

/**
 * Payments run through Stripe Checkout only. Card details never touch this application: shoppers
 * pay on Stripe's hosted page and the order is marked paid only from a verified webhook event.
 * Requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET; webhook endpoint: /api/webhooks/stripe
 * Which methods appear on the hosted page (cards, Apple Pay, Google Pay, …) is set in the Stripe
 * Dashboard. Orders placed with a test-mode key (sk_test_…) are flagged as test orders.
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

export type ProviderId = "stripe";

export function activeProvider(): ProviderId {
  return "stripe";
}

/** True when the configured Stripe key is a test-mode key: no real money moves. */
export function stripeTestMode() {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}

function confirmationUrl(order: PaymentOrder) {
  return absoluteUrl(`/order-confirmation/${order.number}?t=${encodeURIComponent(order.accessToken)}`);
}

export function failureUrl(order: Pick<PaymentOrder, "number" | "accessToken">, reason = "cancelled") {
  return `/order-failed?order=${encodeURIComponent(order.number)}&t=${encodeURIComponent(order.accessToken)}&reason=${reason}`;
}

export async function createPaymentSession(order: PaymentOrder): Promise<PaymentSession> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
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
    expires_at: String(expiresAt),
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // Stripe rejects a reused key whose request body differs, and the body contains
      // expires_at, so the key must be unique per session request — not just per order.
      // Retries for the same order reuse the open session instead (see getOpenPaymentSession).
      "Idempotency-Key": `checkout-${order.id}-${expiresAt}`,
    },
    body,
  });
  const json = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !json.url || !json.id) throw new Error(`Stripe error: ${json.error?.message ?? res.status}`);
  return { redirectUrl: json.url, ref: json.id };
}

/**
 * Looks up an existing payment session for a retried checkout. Returns its state so the caller
 * can send the shopper back to the same open session instead of opening a second one (which
 * could let the same order be paid twice).
 */
export async function getPaymentSessionState(ref: string | null): Promise<{ status: "open"; url: string } | { status: "complete" | "expired" | "unknown" }> {
  if (!ref || !ref.startsWith("cs_") || !process.env.STRIPE_SECRET_KEY) return { status: "unknown" };
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${ref}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  });
  if (!res.ok) return { status: "unknown" };
  const json = (await res.json()) as { status?: string; url?: string | null };
  if (json.status === "open" && json.url) return { status: "open", url: json.url };
  if (json.status === "complete" || json.status === "expired") return { status: json.status };
  return { status: "unknown" };
}

export type SessionPayment = {
  ref: string;
  orderId: string | null;
  status: string | null;
  paymentStatus: string | null;
  amount?: number;
  currency?: string;
};

/**
 * Reads a Checkout Session straight from Stripe's API (authenticated with the secret key), so the
 * result is as trustworthy as a signed webhook. Used to confirm a payment when the webhook is slow
 * or missing.
 */
export async function getSessionPayment(ref: string | null): Promise<SessionPayment | null> {
  if (!ref || !ref.startsWith("cs_") || !process.env.STRIPE_SECRET_KEY) return null;
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${ref}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    id: string;
    status?: string | null;
    payment_status?: string | null;
    amount_total?: number | null;
    currency?: string | null;
    metadata?: { order_id?: string };
  };
  return {
    ref: json.id,
    orderId: json.metadata?.order_id ?? null,
    status: json.status ?? null,
    paymentStatus: json.payment_status ?? null,
    amount: json.amount_total ?? undefined,
    currency: json.currency ?? undefined,
  };
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
