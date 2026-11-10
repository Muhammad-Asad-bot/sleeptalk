import { NextResponse } from "next/server";
import { markBankDebitSubmitted, markOrderFailed, markOrderPaid } from "@/lib/server/orders";
import { verifyStripeSignature } from "@/lib/server/payments";

/**
 * Stripe webhook. Orders are marked paid ONLY here (verified signature), never from the
 * browser redirect. Configure in Stripe: checkout.session.completed,
 * checkout.session.async_payment_succeeded, checkout.session.async_payment_failed,
 * checkout.session.expired.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  const raw = await request.text();
  if (!verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  const event = JSON.parse(raw) as {
    type: string;
    data: { object: { id: string; payment_status?: string; amount_total?: number; currency?: string; metadata?: { order_id?: string } } };
  };
  const session = event.data.object;
  const orderId = session.metadata?.order_id;
  if (!orderId) return NextResponse.json({ received: true });

  switch (event.type) {
    case "checkout.session.completed":
      if (session.payment_status === "paid") {
        await markOrderPaid(orderId, { ref: session.id, amount: session.amount_total, currency: session.currency });
      } else if (session.payment_status === "unpaid") {
        // Delayed method (Canadian bank debit): submitted, clears in a few days via async_payment_*.
        await markBankDebitSubmitted(orderId, session.id);
      }
      break;
    case "checkout.session.async_payment_succeeded":
      await markOrderPaid(orderId, { ref: session.id, amount: session.amount_total, currency: session.currency });
      break;
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      await markOrderFailed(orderId, event.type);
      break;
  }
  return NextResponse.json({ received: true });
}
