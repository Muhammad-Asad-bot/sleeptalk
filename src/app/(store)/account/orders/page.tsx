import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { orders } from "@/db/schema";
import { AccountShell } from "@/components/account/account-shell";
import { FULFILMENT_LABEL, ORDER_STATUS_LABEL } from "@/components/account/order-detail";
import { formatMoney } from "@/lib/markets";
import { requireUser } from "@/lib/server/auth";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Your orders", robots: { index: false } };

export default async function AccountOrdersPage() {
  const user = await requireUser("/account/orders");
  const db = await getDb();
  const rows = await db.query.orders.findMany({
    where: eq(orders.userId, user.id),
    orderBy: desc(orders.createdAt),
    with: { items: true },
  });
  return (
    <AccountShell active="/account/orders" title="Orders" name={user.firstName || "there"}>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-ink text-[0.6875rem] uppercase tracking-[0.12em] text-stone">
              <tr>
                <th className="py-3 font-semibold">Order</th>
                <th className="py-3 font-semibold">Date</th>
                <th className="py-3 font-semibold">Items</th>
                <th className="py-3 font-semibold">Status</th>
                <th className="py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((o) => (
                <tr key={o.id}>
                  <td className="py-4"><Link href={`/account/orders/${o.number}`} className="font-medium underline-offset-4 hover:underline">{o.number}</Link></td>
                  <td className="py-4 text-ash">{formatDate(o.createdAt)}</td>
                  <td className="py-4 text-ash">{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                  <td className="py-4">{o.status === "paid" ? FULFILMENT_LABEL[o.fulfillmentStatus] : ORDER_STATUS_LABEL[o.status]}</td>
                  <td className="py-4 text-right font-medium">{formatMoney(o.total, o.market)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-ash">No orders yet. <Link href="/shop" className="underline">Start shopping</Link>.</p>
      )}
    </AccountShell>
  );
}
