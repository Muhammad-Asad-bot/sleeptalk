import Link from "next/link";
import { variantLabel } from "@/lib/fits";
import { CheckCircle2, ChevronRight, ExternalLink, Plus } from "lucide-react";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { contactMessages, orders, products, reviews, users, variants } from "@/db/schema";
import { abtn, Badge, Card, FULFILMENT_STATUS, paymentStatus, PageHeader, Stat, Table, EmptyRow, tdClass, thClass } from "@/components/admin/ui";
import { formatMoney, MARKETS, type MarketCode } from "@/lib/markets";
import { requireStaff } from "@/lib/server/auth";
import { getMarketConfigs } from "@/lib/server/settings";
import { formatDateTime } from "@/lib/utils";

type Props = { searchParams: Promise<{ denied?: string }> };

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

export default async function AdminDashboard({ searchParams }: Props) {
  const user = await requireStaff("/admin");
  const { denied } = await searchParams;
  const db = await getDb();
  const marketConfigs = await getMarketConfigs();
  const since30 = daysAgo(30);

  const [revenueRows, paid30, awaitingFulfilment, pendingPayment, customers, lowStock, recent, best, demoCount, openMessages, pendingReviews, reportedReviews, stockCounts] = await Promise.all([
    db
      .select({ market: orders.market, total: sql<number>`coalesce(sum(${orders.total}),0)`.mapWith(Number), count: sql<number>`count(*)`.mapWith(Number) })
      .from(orders)
      .where(and(eq(orders.status, "paid"), gte(orders.paidAt, since30)))
      .groupBy(orders.market),
    db.$count(orders, and(eq(orders.status, "paid"), gte(orders.paidAt, since30))),
    db.$count(orders, and(eq(orders.status, "paid"), eq(orders.fulfillmentStatus, "unfulfilled"))),
    db.$count(orders, eq(orders.status, "pending_payment")),
    db.$count(users, and(eq(users.role, "customer"), gte(users.createdAt, since30))),
    db
      .select({ id: variants.id, sku: variants.sku, color: variants.color, size: variants.size, fit: variants.fit, stock: variants.stock, threshold: variants.lowStockThreshold, title: products.title, productId: products.id })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(and(eq(variants.active, true), eq(variants.allowBackorder, false), lte(variants.stock, variants.lowStockThreshold), eq(products.status, "active")))
      .orderBy(variants.stock)
      .limit(10),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8),
    db.select({ id: products.id, title: products.title, sales: products.salesCount }).from(products).where(eq(products.status, "active")).orderBy(desc(products.salesCount)).limit(5),
    db.$count(products, eq(products.isDemo, true)),
    db.$count(contactMessages, eq(contactMessages.handled, false)),
    db.$count(reviews, eq(reviews.status, "pending")),
    db.$count(reviews, eq(reviews.reported, true)),
    db
      .select({
        low: sql<number>`count(*)`.mapWith(Number),
        out: sql<number>`count(*) filter (where ${variants.stock} <= 0)`.mapWith(Number),
      })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(and(eq(variants.active, true), eq(variants.allowBackorder, false), lte(variants.stock, variants.lowStockThreshold), eq(products.status, "active")))
      .then((r) => r[0] ?? { low: 0, out: 0 }),
  ]);

  const revenue = (m: MarketCode) => revenueRows.find((r) => r.market === m);
  // Revenue cards for the markets the store sells in (plus any market that still has recent sales).
  const activeMarkets = (Object.keys(MARKETS) as MarketCode[]).filter((m) => marketConfigs.some((c) => c.code === m && c.active) || revenue(m));

  // Plain-language to-do list; only items with something to do are shown.
  const tasks = [
    { n: awaitingFulfilment, href: "/admin/orders?status=paid&fulfillment=unfulfilled", text: (n: number) => `${n} paid order${n === 1 ? "" : "s"} to pack and ship` },
    { n: openMessages, href: "/admin/messages", text: (n: number) => `${n} customer message${n === 1 ? "" : "s"} waiting for a reply` },
    { n: pendingReviews, href: "/admin/reviews", text: (n: number) => `${n} review${n === 1 ? "" : "s"} to approve or reject` },
    { n: reportedReviews, href: "/admin/reviews?status=all&reported=1", text: (n: number) => `${n} review${n === 1 ? " has" : "s have"} been reported` },
    { n: stockCounts.out, href: "/admin/inventory?filter=out", text: (n: number) => `${n} variant${n === 1 ? " is" : "s are"} sold out` },
    { n: stockCounts.low - stockCounts.out, href: "/admin/inventory?filter=low", text: (n: number) => `${n} variant${n === 1 ? " is" : "s are"} running low` },
    { n: pendingPayment, href: "/admin/orders?status=pending_payment", text: (n: number) => `${n} order${n === 1 ? " is" : "s are"} awaiting payment` },
  ].filter((t) => t.n > 0);

  return (
    <>
      <PageHeader
        title={`Welcome back${user.firstName ? `, ${user.firstName}` : ""}`}
        description="Last 30 days at a glance. Figures come from live order records."
        actions={
          <>
            <Link href="/admin/products/new" className={abtn("primary")}><Plus className="size-3.5" /> Add product</Link>
            <Link href="/" target="_blank" className={abtn("ghost")}><ExternalLink className="size-3.5" /> View store</Link>
          </>
        }
      />
      {denied ? <p className="mb-5 border border-sale/40 bg-sale/5 px-4 py-3 text-sm text-sale">Only the store owner can open that page.</p> : null}
      {demoCount > 0 ? (
        <p className="mb-5 border border-warning/40 bg-warning/5 px-4 py-3 text-xs text-warning">
          Demo data: {demoCount} demo products are in the catalogue. Sales figures include test orders made with the simulated payment provider.
        </p>
      ) : null}

      <Card title="Needs your attention" className="mb-6">
        {tasks.length ? (
          <ul className="divide-y divide-line">
            {tasks.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="group flex items-center gap-3 py-2.5 text-sm hover:text-ink">
                  <span className="grid size-7 shrink-0 place-items-center bg-warning/10 text-xs font-bold tabular-nums text-warning">{t.n > 99 ? "99+" : t.n}</span>
                  <span className="flex-1">{t.text(t.n)}</span>
                  <ChevronRight className="size-4 text-stone transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" /> You&apos;re all caught up — nothing needs action right now.</p>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {activeMarkets.map((m) => (
          <Stat key={m} label={`Revenue · ${MARKETS[m].label}`} value={formatMoney(revenue(m)?.total ?? 0, m, { forceDecimals: true })} hint={`${revenue(m)?.count ?? 0} paid orders · 30 days`} />
        ))}
        <Stat label="To fulfil" value={awaitingFulfilment} hint="Paid, not yet processed" tone={awaitingFulfilment ? "warn" : undefined} />
        <Stat label="Awaiting payment" value={pendingPayment} hint={`${paid30} paid · ${customers} new customers (30d)`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card title="Recent orders" actions={<Link href="/admin/orders" className="text-xs underline">View all</Link>}>
            <Table>
              <thead>
                <tr>
                  <th className={thClass}>Order</th>
                  <th className={thClass}>Date</th>
                  <th className={thClass}>Customer</th>
                  <th className={thClass}>Payment</th>
                  <th className={thClass}>Fulfilment</th>
                  <th className={`${thClass} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {recent.length ? (
                  recent.map((o) => (
                    <tr key={o.id} className="hover:bg-paper">
                      <td className={tdClass}>
                        <Link href={`/admin/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline">{o.number}</Link>
                        {o.isTest ? <span className="ml-2"><Badge>Test</Badge></span> : null}
                      </td>
                      <td className={`${tdClass} text-ash`}>{formatDateTime(o.createdAt)}</td>
                      <td className={`${tdClass} max-w-[200px] truncate`}>{o.email}</td>
                      <td className={tdClass}><Badge color={paymentStatus(o).color}>{paymentStatus(o).label}</Badge></td>
                      <td className={tdClass}>{o.status === "paid" ? <Badge color={FULFILMENT_STATUS[o.fulfillmentStatus].color}>{FULFILMENT_STATUS[o.fulfillmentStatus].label}</Badge> : <span className="text-stone">—</span>}</td>
                      <td className={`${tdClass} text-right font-medium tabular-nums`}>{formatMoney(o.total, o.market, { forceDecimals: true })}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={6}>No orders yet. Place a test order from the storefront to see it here.</EmptyRow>
                )}
              </tbody>
            </Table>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Low stock" actions={<Link href="/admin/inventory?filter=low" className="text-xs underline">Inventory</Link>}>
            {lowStock.length ? (
              <ul className="divide-y divide-line text-sm">
                {lowStock.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{v.title}</p>
                      <p className="text-xs text-ash">{variantLabel(v, true)} · {v.sku}</p>
                    </div>
                    <Badge color={v.stock <= 0 ? "red" : "amber"}>{v.stock <= 0 ? "Sold out" : `${v.stock} left`}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ash">All variants are above their low-stock threshold.</p>
            )}
          </Card>
          <Card title="Best sellers">
            <ol className="space-y-2 text-sm">
              {best.map((p, i) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <Link href={`/admin/products/${p.id}`} className="truncate hover:underline">{i + 1}. {p.title}</Link>
                  <span className="text-xs tabular-nums text-ash">{p.sales} sold</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
