import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import { orders } from "@/db/schema";
import {
  adminInput,
  adminSelect,
  AField,
  Badge,
  EmptyRow,
  FilterBar,
  FULFILMENT_STATUS,
  ORDER_STATUS,
  PageHeader,
  Pagination,
  Table,
  tdClass,
  thClass,
} from "@/components/admin/ui";
import { formatMoney, MARKETS, type MarketCode } from "@/lib/markets";
import { requireStaff } from "@/lib/server/auth";
import { pageParam } from "@/lib/server/admin";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

type SP = { q?: string; status?: string; fulfillment?: string; market?: string; page?: string };
const PER_PAGE = 25;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff("/admin/orders");
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const db = await getDb();

  const where: SQL[] = [];
  if (sp.q?.trim()) {
    const q = `%${sp.q.trim()}%`;
    where.push(or(ilike(orders.number, q), ilike(orders.email, q))!);
  }
  if (sp.status && sp.status in ORDER_STATUS) where.push(eq(orders.status, sp.status as never));
  if (sp.fulfillment && sp.fulfillment in FULFILMENT_STATUS) where.push(eq(orders.fulfillmentStatus, sp.fulfillment as never));
  if (sp.market && sp.market in MARKETS) where.push(eq(orders.market, sp.market as MarketCode));
  const cond = where.length ? and(...where) : undefined;

  const [total, rows] = await Promise.all([
    db.$count(orders, cond),
    db
      .select({
        o: orders,
        items: sql<number>`(select coalesce(sum(oi.quantity),0) from order_items oi where oi.order_id = "orders"."id")`.mapWith(Number),
      })
      .from(orders)
      .where(cond)
      .orderBy(desc(orders.createdAt))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
  ]);

  return (
    <>
      <PageHeader title="Orders" description={`${total} order${total === 1 ? "" : "s"} match the current filters.`} />
      <FilterBar>
        <AField label="Search" className="w-64">
          <input name="q" defaultValue={sp.q} placeholder="Order number or email" className={adminInput} />
        </AField>
        <AField label="Payment">
          <select name="status" defaultValue={sp.status ?? ""} className={adminSelect}>
            <option value="">All</option>
            {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </AField>
        <AField label="Fulfilment">
          <select name="fulfillment" defaultValue={sp.fulfillment ?? ""} className={adminSelect}>
            <option value="">All</option>
            {Object.entries(FULFILMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </AField>
        <AField label="Market">
          <select name="market" defaultValue={sp.market ?? ""} className={adminSelect}>
            <option value="">All</option>
            {Object.values(MARKETS).map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
          </select>
        </AField>
      </FilterBar>

      <Table>
        <thead>
          <tr>
            <th className={thClass}>Order</th>
            <th className={thClass}>Placed</th>
            <th className={thClass}>Customer</th>
            <th className={thClass}>Market</th>
            <th className={thClass}>Items</th>
            <th className={thClass}>Payment</th>
            <th className={thClass}>Fulfilment</th>
            <th className={`${thClass} text-right`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map(({ o, items }) => (
              <tr key={o.id} className="hover:bg-paper">
                <td className={tdClass}>
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold underline-offset-4 hover:underline">{o.number}</Link>
                  {o.isTest ? <span className="ml-2"><Badge>Test</Badge></span> : null}
                </td>
                <td className={`${tdClass} whitespace-nowrap text-ash`}>{formatDateTime(o.createdAt)}</td>
                <td className={`${tdClass} max-w-[220px] truncate`}>
                  {o.shippingAddress.firstName} {o.shippingAddress.lastName}
                  <span className="block truncate text-xs text-stone">{o.email}</span>
                </td>
                <td className={tdClass}>{o.market}</td>
                <td className={`${tdClass} tabular-nums`}>{items}</td>
                <td className={tdClass}><Badge color={ORDER_STATUS[o.status].color}>{ORDER_STATUS[o.status].label}</Badge></td>
                <td className={tdClass}>
                  {o.status === "paid" || o.status === "refunded" ? (
                    <Badge color={FULFILMENT_STATUS[o.fulfillmentStatus].color}>{FULFILMENT_STATUS[o.fulfillmentStatus].label}</Badge>
                  ) : (
                    <span className="text-stone">—</span>
                  )}
                </td>
                <td className={`${tdClass} text-right font-medium tabular-nums`}>{formatMoney(o.total, o.market, { forceDecimals: true })}</td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={8}>No orders match these filters.</EmptyRow>
          )}
        </tbody>
      </Table>
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} params={{ ...sp }} />
    </>
  );
}
