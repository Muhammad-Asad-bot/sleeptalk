import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { addresses, orders, users, wishlistItems } from "@/db/schema";
import { setCustomerDisabledAction } from "@/app/admin/_actions/sales";
import { abtn, Badge, Card, EmptyRow, Flash, FULFILMENT_STATUS, paymentStatus, PageHeader, Table, tdClass, thClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { formatMoney } from "@/lib/markets";
import { requireStaff } from "@/lib/server/auth";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Customer" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function CustomerPage({ params, searchParams }: Props) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  await requireStaff(`/admin/customers/${id}`);
  const db = await getDb();
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u) notFound();
  const [ords, addrs, wish] = await Promise.all([
    db.select().from(orders).where(eq(orders.userId, id)).orderBy(desc(orders.createdAt)),
    db.select().from(addresses).where(eq(addresses.userId, id)),
    db.$count(wishlistItems, eq(wishlistItems.userId, id)),
  ]);
  return (
    <>
      <PageHeader
        back={{ href: "/admin/customers", label: "Customers" }}
        title={`${u.firstName} ${u.lastName}`.trim() || u.email}
        description={<span className="flex items-center gap-2">{u.email} {u.disabled ? <Badge color="red">Disabled</Badge> : <Badge color="green">Active</Badge>} <Badge>{u.role}</Badge></span>}
        actions={
          u.role === "customer" ? (
            <form action={setCustomerDisabledAction}>
              <input type="hidden" name="id" value={u.id} />
              <input type="hidden" name="disabled" value={u.disabled ? "" : "on"} />
              <SubmitButton className={abtn(u.disabled ? "secondary" : "danger")} confirm={u.disabled ? undefined : "Disable this account? The customer will no longer be able to sign in."}>{u.disabled ? "Re-enable account" : "Disable account"}</SubmitButton>
            </form>
          ) : null
        }
      />
      <Flash ok={flash.ok} error={flash.error} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card title={`Orders (${ords.length})`}>
            <Table>
              <thead><tr><th className={thClass}>Order</th><th className={thClass}>Date</th><th className={thClass}>Payment</th><th className={thClass}>Fulfilment</th><th className={`${thClass} text-right`}>Total</th></tr></thead>
              <tbody>
                {ords.length ? ords.map((o) => (
                  <tr key={o.id}>
                    <td className={tdClass}><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.number}</Link></td>
                    <td className={`${tdClass} text-ash`}>{formatDateTime(o.createdAt)}</td>
                    <td className={tdClass}><Badge color={paymentStatus(o).color}>{paymentStatus(o).label}</Badge></td>
                    <td className={tdClass}>{o.status === "paid" ? <Badge color={FULFILMENT_STATUS[o.fulfillmentStatus].color}>{FULFILMENT_STATUS[o.fulfillmentStatus].label}</Badge> : "—"}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(o.total, o.market, { forceDecimals: true })}</td>
                  </tr>
                )) : <EmptyRow colSpan={5}>No orders yet.</EmptyRow>}
              </tbody>
            </Table>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Profile">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ash">Joined</dt><dd>{formatDate(u.createdAt)}</dd></div>
              <div className="flex justify-between"><dt className="text-ash">Last sign-in</dt><dd>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-ash">Marketing emails</dt><dd>{u.marketingOptIn ? "Opted in" : "No"}</dd></div>
              <div className="flex justify-between"><dt className="text-ash">Wishlist items</dt><dd>{wish}</dd></div>
            </dl>
          </Card>
          <Card title="Saved addresses">
            {addrs.length ? (
              <ul className="space-y-3 text-sm">
                {addrs.map((a) => (
                  <li key={a.id} className="leading-relaxed">
                    {a.isDefault ? <Badge color="green">Default</Badge> : null}
                    <p>{a.firstName} {a.lastName}, {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.postcode}, {a.country}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ash">None saved.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
