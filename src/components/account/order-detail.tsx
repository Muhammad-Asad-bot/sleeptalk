import Link from "next/link";
import type { AddressFields, orderItems, orders } from "@/db/schema";
import { SmartImage } from "@/components/ui/smart-image";
import { formatMoney } from "@/lib/markets";
import type { OrderReviewPrompt, OrderReviewPrompts } from "@/lib/server/review-eligibility";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

type Order = typeof orders.$inferSelect & { items: (typeof orderItems.$inferSelect)[] };

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  payment_failed: "Payment failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};
/** Customer-facing payment status; a submitted bank debit shows as processing rather than awaiting payment. */
export function paymentLabel(o: { status: string; bankDebitSubmittedAt?: Date | null }) {
  return o.status === "pending_payment" && o.bankDebitSubmittedAt ? "Bank payment processing" : ORDER_STATUS_LABEL[o.status];
}

export const FULFILMENT_LABEL: Record<string, string> = {
  unfulfilled: "Preparing",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  returned: "Returned",
};

export function AddressBlock({ address }: { address: AddressFields }) {
  return (
    <address className="not-italic leading-relaxed">
      {address.firstName} {address.lastName}
      <br />
      {address.line1}
      {address.line2 ? (
        <>
          <br />
          {address.line2}
        </>
      ) : null}
      <br />
      {address.city}
      {address.region ? `, ${address.region}` : ""} {address.postcode}
      <br />
      {address.country === "GB" ? "United Kingdom" : "Canada"}
    </address>
  );
}

const STAGES = ["paid", "processing", "shipped", "delivered"] as const;

export function OrderProgress({ order }: { order: Order }) {
  if (order.status !== "paid") return null;
  const current = order.fulfillmentStatus === "unfulfilled" ? 0 : STAGES.indexOf(order.fulfillmentStatus as (typeof STAGES)[number]);
  return (
    <ol className="grid grid-cols-4 gap-2 text-[0.6875rem]" aria-label="Order progress">
      {["Confirmed", "Processing", "Shipped", "Delivered"].map((label, i) => (
        <li key={label} aria-current={i === current ? "step" : undefined}>
          <span className={cn("block h-1", i <= current ? "bg-ink" : "bg-line")} />
          <span className={cn("mt-2 block uppercase tracking-[0.1em]", i <= current ? "text-ink" : "text-stone")}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

/** Store policy: refunds are never automatic — the customer contacts us and staff refund from admin. */
function RefundNote({ order }: { order: Order }) {
  if (order.status === "refunded") {
    return (
      <p className="border border-line bg-paper p-4 text-sm">
        This order has been refunded to your original payment method. Depending on your bank, it can take a few working days to appear.
      </p>
    );
  }
  if (order.status !== "paid") return null;
  return (
    <div className="border border-line bg-paper p-4 text-sm">
      <p className="font-medium">Need a refund?</p>
      <p className="mt-1 text-ash">
        Refunds aren&apos;t automatic. Get in touch with your order number and our team will review your request and reply by email.
      </p>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        <Link href={`/contact?topic=refund&order=${encodeURIComponent(order.number)}`} className="font-medium underline underline-offset-4">
          Request a refund
        </Link>
        <Link href="/returns" className="text-ash underline underline-offset-4">
          Returns &amp; refunds policy
        </Link>
      </p>
    </div>
  );
}

/** Invitation to review, shown once the order is delivered (see getOrderReviewPrompts). */
function ReviewInvite({ reviews }: { reviews: OrderReviewPrompts }) {
  const open = Object.values(reviews.byProduct).some((p) => p.state !== "already-reviewed");
  return (
    <div className="border border-ink bg-paper p-4 text-sm">
      <p className="font-medium">{open ? "How was your order?" : "Thanks for your feedback"}</p>
      <p className="mt-1 text-ash">
        {open
          ? <>Tell others what you think of your pieces. Reviews are open until <strong className="text-ink">{formatDate(reviews.closesAt)}</strong> and appear on the product page once our team has checked them.</>
          : "You've reviewed everything in this order. Your reviews appear on the product page once our team has checked them."}
      </p>
    </div>
  );
}

function ReviewLink({ prompt }: { prompt: OrderReviewPrompt }) {
  if (prompt.state === "already-reviewed") return <p className="mt-2 text-xs text-success">✓ You&apos;ve reviewed this</p>;
  const href = prompt.state === "eligible" ? `/products/${prompt.slug}#reviews` : `/login?next=${encodeURIComponent(`/products/${prompt.slug}`)}`;
  return (
    <Link href={href} className="mt-2 inline-block text-xs font-medium underline underline-offset-4">
      {prompt.state === "eligible" ? "Write a review" : "Sign in to write a review"}
    </Link>
  );
}

export function OrderDetail({ order, reviews = null }: { order: Order; reviews?: OrderReviewPrompts | null }) {
  const m = order.market;
  const prompted = new Set<string>();
  return (
    <div className="space-y-8">
      <OrderProgress order={order} />
      {reviews ? <ReviewInvite reviews={reviews} /> : null}
      {order.trackingNumber ? (
        <p className="bg-paper p-4 text-sm">
          Tracking: <strong>{order.carrier ? `${order.carrier} ` : ""}{order.trackingNumber}</strong>
        </p>
      ) : null}
      <ul className="divide-y divide-line border-y border-line">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-4 py-4">
            <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-product">
              <SmartImage src={item.image || null} alt="" fill sizes="80px" className="object-contain object-center block" showDemoTag={false} />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-ash">{item.variantLabel}</p>
              {item.isPreorder ? (
                <p className="mt-1 text-xs text-ink">
                  Pre-order — {item.preorderMessage}. {order.status === "paid" ? "Payment was taken at checkout." : "Payment is due at checkout."}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-stone">Qty {item.quantity} × {formatMoney(item.unitPrice, m)}</p>
              {(() => {
                // One review per product: only the first line of a product gets the link.
                const prompt = item.productId ? reviews?.byProduct[item.productId] : undefined;
                if (!prompt || prompted.has(item.productId!)) return null;
                prompted.add(item.productId!);
                return <ReviewLink prompt={prompt} />;
              })()}
            </div>
            <p className="text-sm tabular-nums">{formatMoney(item.lineTotal, m)}</p>
          </li>
        ))}
      </ul>
      <div className="grid gap-8 sm:grid-cols-2">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(order.subtotal, m)}</dd></div>
          {order.discountTotal ? <div className="flex justify-between text-success"><dt>Discount {order.discountCode ? `(${order.discountCode})` : ""}</dt><dd>−{formatMoney(order.discountTotal, m)}</dd></div> : null}
          <div className="flex justify-between"><dt>Shipping — {order.shippingMethod.name}</dt><dd>{order.shippingTotal ? formatMoney(order.shippingTotal, m) : "Free"}</dd></div>
          {order.taxTotal ? <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(order.taxTotal, m)}</dd></div> : null}
          <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total</dt><dd>{formatMoney(order.total, m)} {order.currency}</dd></div>
        </dl>
        <div className="grid gap-6 text-sm sm:grid-cols-2">
          <div>
            <p className="label mb-2 text-stone">Shipping to</p>
            <AddressBlock address={order.shippingAddress} />
          </div>
          <div>
            <p className="label mb-2 text-stone">Payment</p>
            <p>{paymentLabel(order)}</p>
            {order.paidAt ? <p className="text-xs text-stone">{formatDateTime(order.paidAt)}</p> : null}
            {order.isTest ? <p className="mt-1 text-xs text-warning">Test order — no payment taken</p> : null}
          </div>
        </div>
      </div>
      <RefundNote order={order} />
    </div>
  );
}
