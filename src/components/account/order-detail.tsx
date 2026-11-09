import type { AddressFields, orderItems, orders } from "@/db/schema";
import { SmartImage } from "@/components/ui/smart-image";
import { formatMoney } from "@/lib/markets";
import { cn, formatDateTime } from "@/lib/utils";

type Order = typeof orders.$inferSelect & { items: (typeof orderItems.$inferSelect)[] };

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  payment_failed: "Payment failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};
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

export function OrderDetail({ order }: { order: Order }) {
  const m = order.market;
  return (
    <div className="space-y-8">
      <OrderProgress order={order} />
      {order.trackingNumber ? (
        <p className="bg-paper p-4 text-sm">
          Tracking: <strong>{order.carrier ? `${order.carrier} ` : ""}{order.trackingNumber}</strong>
        </p>
      ) : null}
      <ul className="divide-y divide-line border-y border-line">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-4 py-4">
            <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-cream">
              <SmartImage src={item.image || null} alt="" fill sizes="80px" className="object-cover" showDemoTag={false} />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-ash">{item.variantLabel}</p>
              <p className="mt-1 text-xs text-stone">Qty {item.quantity} × {formatMoney(item.unitPrice, m)}</p>
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
            <p>{ORDER_STATUS_LABEL[order.status]}</p>
            {order.paidAt ? <p className="text-xs text-stone">{formatDateTime(order.paidAt)}</p> : null}
            {order.isTest ? <p className="mt-1 text-xs text-warning">Test order — no payment taken</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
