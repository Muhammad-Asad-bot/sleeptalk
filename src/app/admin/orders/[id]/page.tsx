import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { orders, users } from "@/db/schema";
import { addOrderNoteAction, cancelOrderAction, refundOrderAction, updateFulfilmentAction } from "@/app/admin/_actions/orders";
import { AddressBlock } from "@/components/account/order-detail";
import { SmartImage } from "@/components/ui/smart-image";
import { abtn, adminInput, adminSelect, adminTextarea, AField, Badge, Card, Flash, FULFILMENT_STATUS, ORDER_STATUS, PageHeader } from "@/components/admin/ui";
import { formatMoney } from "@/lib/markets";
import { requireStaff } from "@/lib/server/auth";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Order" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function AdminOrderPage({ params, searchParams }: Props) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  await requireStaff(`/admin/orders/${id}`);
  const db = await getDb();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, id), with: { items: true } });
  if (!order) notFound();
  const customer = order.userId ? (await db.select().from(users).where(eq(users.id, order.userId)).limit(1))[0] : null;
  const m = order.market;
  const money = (v: number) => formatMoney(v, m, { forceDecimals: true });

  return (
    <>
      <PageHeader
        back={{ href: "/admin/orders", label: "Orders" }}
        title={`Order ${order.number}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            Placed {formatDateTime(order.createdAt)} · {order.market} · {order.currency}
            <Badge color={ORDER_STATUS[order.status].color}>{ORDER_STATUS[order.status].label}</Badge>
            {order.status === "paid" ? <Badge color={FULFILMENT_STATUS[order.fulfillmentStatus].color}>{FULFILMENT_STATUS[order.fulfillmentStatus].label}</Badge> : null}
            {order.isTest ? <Badge>Test order</Badge> : null}
          </span>
        }
      />
      <Flash ok={flash.ok} error={flash.error} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title={`Items (${order.items.reduce((n, i) => n + i.quantity, 0)})`}>
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 py-3">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-cream">
                    <SmartImage src={item.image || null} alt="" fill sizes="64px" className="object-cover" showDemoTag={false} />
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">
                      {item.productId ? <Link href={`/admin/products/${item.productId}`} className="hover:underline">{item.title}</Link> : item.title}
                    </p>
                    <p className="text-xs text-ash">{item.variantLabel}</p>
                    <p className="text-xs text-stone">SKU {item.sku}</p>
                    {item.components.length ? (
                      <ul className="mt-1 text-xs text-stone">
                        {item.components.map((c) => <li key={c.variantId}>{c.label}: {c.title} — {c.color} / {c.size} ({c.sku})</li>)}
                      </ul>
                    ) : null}
                  </div>
                  <div className="text-right text-sm tabular-nums">
                    <p>{item.quantity} × {money(item.unitPrice)}</p>
                    <p className="font-semibold">{money(item.lineTotal)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{money(order.subtotal)}</dd></div>
              {order.discountTotal ? <div className="flex justify-between text-success"><dt>Discount {order.discountCode ? `(${order.discountCode})` : ""}</dt><dd className="tabular-nums">−{money(order.discountTotal)}</dd></div> : null}
              <div className="flex justify-between"><dt>Shipping — {order.shippingMethod.name}</dt><dd className="tabular-nums">{money(order.shippingTotal)}</dd></div>
              <div className="flex justify-between"><dt>Tax</dt><dd className="tabular-nums">{money(order.taxTotal)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{money(order.total)}</dd></div>
            </dl>
          </Card>

          <Card title="Fulfilment">
            {order.status === "paid" ? (
              <form action={updateFulfilmentAction} className="grid gap-4 md:grid-cols-3">
                <input type="hidden" name="id" value={order.id} />
                <AField label="Status">
                  <select name="fulfillmentStatus" defaultValue={order.fulfillmentStatus} className={adminSelect}>
                    {Object.entries(FULFILMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </AField>
                <AField label="Carrier">
                  <input name="carrier" defaultValue={order.carrier} placeholder="e.g. Royal Mail, Canada Post" className={adminInput} />
                </AField>
                <AField label="Tracking number">
                  <input name="trackingNumber" defaultValue={order.trackingNumber} className={adminInput} />
                </AField>
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input type="checkbox" name="notify" defaultChecked className="size-4 accent-ink" />
                  Email the customer when marked Shipped or Delivered
                </label>
                <div className="md:text-right">
                  <button type="submit" className={abtn("primary")}>Save fulfilment</button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-ash">Fulfilment is available once the order is paid.</p>
            )}
          </Card>

          <Card title="Internal notes">
            {order.internalNotes ? (
              <pre className="mb-4 max-h-64 overflow-auto whitespace-pre-wrap bg-paper p-3 font-sans text-xs leading-relaxed text-charcoal">{order.internalNotes}</pre>
            ) : (
              <p className="mb-4 text-sm text-ash">No notes yet. Notes are never shown to the customer.</p>
            )}
            <form action={addOrderNoteAction} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={order.id} />
              <textarea name="note" required maxLength={2000} placeholder="Add a note for the team…" className={adminTextarea} />
              <div><button type="submit" className={abtn("secondary")}>Add note</button></div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Customer">
            <p className="text-sm font-medium">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
            <p className="text-sm"><a href={`mailto:${order.email}`} className="underline">{order.email}</a></p>
            {order.phone ? <p className="text-sm text-ash">{order.phone}</p> : null}
            <p className="mt-2 text-xs text-stone">
              {customer ? <Link href={`/admin/customers/${customer.id}`} className="underline">Registered customer</Link> : "Guest checkout"}
            </p>
          </Card>
          <Card title="Shipping address">
            <div className="text-sm"><AddressBlock address={order.shippingAddress} /></div>
            <p className="mt-3 text-xs text-ash">{order.shippingMethod.name}</p>
          </Card>
          <Card title="Billing address">
            <div className="text-sm"><AddressBlock address={order.billingAddress} /></div>
          </Card>
          <Card title="Payment">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-ash">Provider</dt><dd>{order.paymentProvider}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ash">Reference</dt><dd className="truncate text-xs">{order.paymentRef ?? "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ash">Paid</dt><dd>{order.paidAt ? formatDateTime(order.paidAt) : "—"}</dd></div>
            </dl>
            {order.status === "pending_payment" ? (
              <form action={cancelOrderAction} className="mt-4 border-t border-line pt-4">
                <input type="hidden" name="id" value={order.id} />
                <p className="mb-2 text-xs text-ash">Cancel this unpaid order and return its reserved stock.</p>
                <button type="submit" className={abtn("danger", "sm")}>Cancel order</button>
              </form>
            ) : null}
            {order.status === "paid" ? (
              <form action={refundOrderAction} className="mt-4 space-y-2 border-t border-line pt-4">
                <input type="hidden" name="id" value={order.id} />
                <p className="text-xs text-ash">Refunds go through the payment provider ({order.paymentProvider}). Type REFUND to confirm.</p>
                <input name="confirm" placeholder="REFUND" className={adminInput} autoComplete="off" />
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="restock" className="size-4 accent-ink" /> Return items to stock
                </label>
                <button type="submit" className={abtn("danger", "sm")}>Refund {money(order.total)}</button>
              </form>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  );
}
