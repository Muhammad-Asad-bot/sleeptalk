import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { addresses, orders } from "@/db/schema";
import { AccountShell } from "@/components/account/account-shell";
import { FULFILMENT_LABEL, ORDER_STATUS_LABEL } from "@/components/account/order-detail";
import { FormMessage } from "@/components/ui/fields";
import { buttonClass } from "@/components/ui/button";
import { formatMoney } from "@/lib/markets";
import { requireUser } from "@/lib/server/auth";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

type Props = { searchParams: Promise<{ reset?: string; denied?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const user = await requireUser("/account");
  const { reset, denied } = await searchParams;
  const db = await getDb();
  const [recent, saved] = await Promise.all([
    db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)).limit(3),
    db.select().from(addresses).where(eq(addresses.userId, user.id)),
  ]);
  const defaultAddress = saved.find((a) => a.isDefault) ?? saved[0];
  return (
    <AccountShell active="/account" title="Account" name={user.firstName || "there"}>
      {reset ? <div className="mb-6"><FormMessage tone="success">Your password has been updated.</FormMessage></div> : null}
      {denied ? <div className="mb-6"><FormMessage>That area is for SLEEP TALK staff only.</FormMessage></div> : null}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="border border-line bg-paper p-6 md:col-span-2" aria-labelledby="recent-orders">
          <div className="flex items-center justify-between">
            <h2 id="recent-orders" className="text-xs font-semibold uppercase tracking-[0.12em]">Recent orders</h2>
            <Link href="/account/orders" className="text-xs underline underline-offset-4">View all</Link>
          </div>
          {recent.length ? (
            <ul className="mt-4 divide-y divide-line">
              {recent.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <Link href={`/account/orders/${o.number}`} className="font-medium underline-offset-4 hover:underline">{o.number}</Link>
                  <span className="text-ash">{formatDate(o.createdAt)}</span>
                  <span>{o.status === "paid" ? FULFILMENT_LABEL[o.fulfillmentStatus] : ORDER_STATUS_LABEL[o.status]}</span>
                  <span className="font-medium">{formatMoney(o.total, o.market)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 text-sm text-ash">
              <p>You haven&apos;t placed any orders yet.</p>
              <Link href="/shop" className={buttonClass("primary", "md", "mt-4")}>Start shopping</Link>
            </div>
          )}
        </section>
        <section className="border border-line p-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em]">Profile</h2>
          <p className="mt-4 text-sm">{user.firstName} {user.lastName}</p>
          <p className="text-sm text-ash">{user.email}</p>
          <Link href="/account/settings" className="mt-4 inline-block text-xs underline underline-offset-4">Edit profile & password</Link>
        </section>
        <section className="border border-line p-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em]">Default address</h2>
          {defaultAddress ? (
            <p className="mt-4 text-sm leading-relaxed text-ash">
              {defaultAddress.firstName} {defaultAddress.lastName}<br />{defaultAddress.line1}<br />{defaultAddress.city} {defaultAddress.postcode}
            </p>
          ) : (
            <p className="mt-4 text-sm text-ash">No saved address yet.</p>
          )}
          <Link href="/account/addresses" className="mt-4 inline-block text-xs underline underline-offset-4">Manage addresses</Link>
        </section>
      </div>
    </AccountShell>
  );
}
