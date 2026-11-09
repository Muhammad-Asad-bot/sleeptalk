import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import { newsletterSubscribers, orders, users } from "@/db/schema";
import { adminInput, AField, Badge, EmptyRow, FilterBar, PageHeader, Pagination, Stat, Table, tdClass, thClass } from "@/components/admin/ui";
import { requireStaff } from "@/lib/server/auth";
import { pageParam } from "@/lib/server/admin";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Customers" };
const PER_PAGE = 30;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaff("/admin/customers");
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const db = await getDb();
  const where: SQL[] = [eq(users.role, "customer")];
  if (sp.q?.trim()) {
    const q = `%${sp.q.trim()}%`;
    where.push(or(ilike(users.email, q), ilike(users.firstName, q), ilike(users.lastName, q))!);
  }
  const cond = and(...where);
  const [total, rows, subs, guestOrders] = await Promise.all([
    db.$count(users, cond),
    db
      .select({
        u: users,
        orderCount: sql<number>`(select count(*) from orders o where o.user_id = "users"."id" and o.status = 'paid')`.mapWith(Number),
        spent: sql<string>`(select string_agg(t.m || ':' || t.s, ',') from (select o.market::text as m, sum(o.total) as s from orders o where o.user_id = "users"."id" and o.status = 'paid' group by o.market) t)`,
      })
      .from(users)
      .where(cond)
      .orderBy(desc(users.createdAt))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.$count(newsletterSubscribers, sql`${newsletterSubscribers.unsubscribedAt} is null`),
    db.$count(orders, sql`${orders.userId} is null and ${orders.status} = 'paid'`),
  ]);
  return (
    <>
      <PageHeader title="Customers" description="Registered customer accounts. Guest orders appear under Orders." />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Registered customers" value={total} />
        <Stat label="Newsletter subscribers" value={subs} />
        <Stat label="Paid guest orders" value={guestOrders} />
      </div>
      <FilterBar>
        <AField label="Search" className="w-72"><input name="q" defaultValue={sp.q} placeholder="Name or email" className={adminInput} /></AField>
      </FilterBar>
      <Table>
        <thead><tr><th className={thClass}>Customer</th><th className={thClass}>Joined</th><th className={thClass}>Paid orders</th><th className={thClass}>Spent</th><th className={thClass}>Marketing</th><th className={thClass}>Status</th></tr></thead>
        <tbody>
          {rows.length ? rows.map(({ u, orderCount, spent }) => (
            <tr key={u.id} className="hover:bg-paper">
              <td className={tdClass}><Link href={`/admin/customers/${u.id}`} className="font-medium hover:underline">{u.firstName} {u.lastName}</Link><span className="block text-xs text-stone">{u.email}</span></td>
              <td className={`${tdClass} text-ash`}>{formatDate(u.createdAt)}</td>
              <td className={`${tdClass} tabular-nums`}>{orderCount}</td>
              <td className={`${tdClass} text-xs tabular-nums`}>{spent ? spent.split(",").map((s) => { const [m, v] = s.split(":"); return `${m === "UK" ? "£" : "$"}${(Number(v) / 100).toFixed(2)}`; }).join(" · ") : "—"}</td>
              <td className={tdClass}>{u.marketingOptIn ? <Badge color="green">Opted in</Badge> : <span className="text-xs text-stone">No</span>}</td>
              <td className={tdClass}>{u.disabled ? <Badge color="red">Disabled</Badge> : <Badge color="green">Active</Badge>}{u.isDemo ? <span className="ml-1"><Badge color="amber">Demo</Badge></span> : null}</td>
            </tr>
          )) : <EmptyRow colSpan={6}>No customers yet.</EmptyRow>}
        </tbody>
      </Table>
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} params={{ q: sp.q }} />
    </>
  );
}
