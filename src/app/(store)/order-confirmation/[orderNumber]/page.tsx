import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FULFILMENT_LABEL, OrderDetail } from "@/components/account/order-detail";
import { PaidOrderEffects, PendingRefresher, SubmittedOrderEffects } from "@/components/checkout/order-effects";
import { buttonClass } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/server/auth";
import { getOrderForViewer, reconcilePendingOrder } from "@/lib/server/orders";
import { getOrderReviewPrompts } from "@/lib/server/review-eligibility";

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false } };

type Props = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ t?: string; view?: string }>;
};

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const [{ orderNumber }, { t, view }] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  let order = await getOrderForViewer(orderNumber, t, user?.id ?? null);
  if (!order) notFound();
  // Webhook not in yet: check with Stripe directly so the shopper isn't left waiting.
  if (order.status === "pending_payment" && (await reconcilePendingOrder(order))) {
    order = (await getOrderForViewer(orderNumber, t, user?.id ?? null)) ?? order;
  }

  // Canadian bank debit submitted: confirmed by the bank in a few days, not seconds.
  if (order.status === "pending_payment" && order.bankDebitSubmittedAt) {
    return (
      <div className="container-site pt-10 md:pt-16">
        <SubmittedOrderEffects />
        <div className="mx-auto max-w-3xl">
          <p className="label text-stone">Order {order.number}</p>
          <h1 className="display mt-3 text-5xl md:text-7xl">Bank payment processing</h1>
          <p className="mt-4 max-w-lg text-sm text-ash">
            Thanks — we&apos;ve received your order. Payments from a bank account usually take <strong>3–5 business days</strong> to clear. We&apos;ll email <strong>{order.email}</strong> as soon as it&apos;s confirmed, and your order ships after that. You don&apos;t need to pay again.
          </p>
          <div className="mt-10">
            <OrderDetail order={order} />
          </div>
          <div className="mt-12">
            <Link href="/shop" className={buttonClass("primary", "lg")}>Continue shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  // Confirmation is only shown for a payment verified server-side.
  if (order.status === "pending_payment") {
    return (
      <div className="container-site py-24 text-center">
        <PendingRefresher />
        <p className="label text-stone">Order {order.number}</p>
        <h1 className="display mt-3 text-5xl">Confirming your payment…</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-ash">
          We&apos;re waiting for confirmation from the payment provider. This page updates automatically — please don&apos;t pay again.
        </p>
      </div>
    );
  }
  if (order.status === "payment_failed" || order.status === "cancelled") {
    return (
      <div className="container-site py-24 text-center">
        <h1 className="display text-5xl">Payment not completed</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-ash">Order {order.number} wasn&apos;t paid, so nothing has been charged. Your bag is saved.</p>
        <Link href="/cart" className={buttonClass("primary", "lg", "mt-8")}>Return to bag</Link>
      </div>
    );
  }

  const tracking = view === "track";
  const reviews = await getOrderReviewPrompts(order, user?.id ?? null);
  return (
    <div className="container-site pt-10 md:pt-16">
      {order.status === "paid" && !tracking ? (
        <PaidOrderEffects
          orderNumber={order.number}
          currency={order.currency}
          value={order.total / 100}
          items={order.items.map((i) => ({ id: i.productId ?? i.sku, name: i.title, variant: i.variantLabel, price: i.unitPrice / 100, quantity: i.quantity }))}
        />
      ) : null}
      <div className="mx-auto max-w-3xl">
        <p className="label text-stone">Order {order.number}</p>
        <h1 className="display mt-3 text-5xl md:text-7xl">
          {tracking ? `Order ${FULFILMENT_LABEL[order.fulfillmentStatus]?.toLowerCase() ?? "status"}` : order.status === "refunded" ? "Order refunded" : "Thank you"}
        </h1>
        {!tracking && order.status === "paid" ? (
          <p className="mt-4 max-w-lg text-sm text-ash">
            Your order is confirmed. A confirmation has been sent to <strong>{order.email}</strong>.
          </p>
        ) : null}
        <div className="mt-10">
          <OrderDetail order={order} reviews={reviews} />
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/shop" className={buttonClass("primary", "lg")}>Continue shopping</Link>
          {user ? <Link href="/account/orders" className={buttonClass("secondary", "lg")}>View your orders</Link> : <Link href="/register" className={buttonClass("secondary", "lg")}>Create an account</Link>}
        </div>
      </div>
    </div>
  );
}
