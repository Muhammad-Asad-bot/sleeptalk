import type { Metadata } from "next";
import { variantLabel } from "@/lib/fits";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { orders, products, stockMovements, users, variants } from "@/db/schema";
import { adjustStockAction } from "@/app/admin/_actions/inventory";
import { abtn, adminInput, adminSelect, AField, Badge, Card, EmptyRow, Flash, PageHeader, Stat, Table, tdClass, thClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { requireStaff } from "@/lib/server/auth";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Stock history" };

const REASON: Record<string, { label: string; color: "green" | "amber" | "red" | "grey" | "blue" | "black" }> = {
  initial: { label: "Initial", color: "grey" },
  restock: { label: "Restock", color: "green" },
  adjustment: { label: "Adjustment", color: "blue" },
  order: { label: "Order", color: "black" },
  order_released: { label: "Released", color: "amber" },
  order_reinstated: { label: "Reinstated", color: "red" },
};

type Props = { params: Promise<{ variantId: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function StockHistoryPage({ params, searchParams }: Props) {
  const [{ variantId }, flash] = await Promise.all([params, searchParams]);
  await requireStaff(`/admin/inventory/${variantId}`);
  const db = await getDb();
  const [row] = await db
    .select({ v: variants, title: products.title, productId: products.id })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(eq(variants.id, variantId))
    .limit(1);
  if (!row) notFound();
  const moves = await db
    .select({ m: stockMovements, email: users.email, orderNumber: orders.number })
    .from(stockMovements)
    .leftJoin(users, eq(users.id, stockMovements.userId))
    .leftJoin(orders, eq(orders.id, stockMovements.orderId))
    .where(eq(stockMovements.variantId, variantId))
    .orderBy(desc(stockMovements.createdAt))
    .limit(200);
  const sold = moves.filter((x) => x.m.reason === "order").reduce((n, x) => n - x.m.delta, 0);
  const restocked = moves.filter((x) => x.m.reason === "restock").reduce((n, x) => n + x.m.delta, 0);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/inventory", label: "Inventory" }}
        title={`${row.title} — ${variantLabel(row.v, true)}`}
        description={<span className="font-mono">{row.v.sku}</span>}
        actions={<Link href={`/admin/products/${row.productId}`} className={abtn("secondary")}>Edit product</Link>}
      />
      <Flash ok={flash.ok} error={flash.error} />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Stat label="In stock" value={row.v.stock} tone={row.v.stock <= row.v.lowStockThreshold ? "warn" : undefined} />
        <Stat label="Low-stock threshold" value={row.v.lowStockThreshold} />
        <Stat label="Units sold (history)" value={sold} />
        <Stat label="Units restocked" value={restocked} />
      </div>
      <Card title="Adjust stock" className="mb-6">
        <form action={adjustStockAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="variantId" value={row.v.id} />
          <input type="hidden" name="_return" value={`/admin/inventory/${row.v.id}`} />
          <AField label="Type">
            <select name="mode" className={adminSelect}>
              <option value="add">Add / remove units</option>
              <option value="set">Set exact count (stock-take)</option>
            </select>
          </AField>
          <AField label="Quantity" className="w-32">
            <input name="quantity" type="number" step={1} required className={adminInput} />
          </AField>
          <AField label="Reason">
            <select name="reason" className={adminSelect}>
              <option value="restock">Restock / delivery</option>
              <option value="adjustment">Correction / damage</option>
            </select>
          </AField>
          <AField label="Note" className="min-w-[220px] flex-1">
            <input name="note" maxLength={300} placeholder="e.g. PO-1042 delivery, 2 damaged" className={adminInput} />
          </AField>
          <SubmitButton className={abtn("primary")}>Update stock</SubmitButton>
        </form>
      </Card>
      <Table>
        <thead>
          <tr>
            <th className={thClass}>When</th>
            <th className={thClass}>Reason</th>
            <th className={`${thClass} text-right`}>Change</th>
            <th className={`${thClass} text-right`}>Stock after</th>
            <th className={thClass}>Order</th>
            <th className={thClass}>By</th>
            <th className={thClass}>Note</th>
          </tr>
        </thead>
        <tbody>
          {moves.length ? (
            moves.map(({ m, email, orderNumber }) => (
              <tr key={m.id}>
                <td className={`${tdClass} whitespace-nowrap text-ash`}>{formatDateTime(m.createdAt)}</td>
                <td className={tdClass}><Badge color={REASON[m.reason]?.color ?? "grey"}>{REASON[m.reason]?.label ?? m.reason}</Badge></td>
                <td className={`${tdClass} text-right font-semibold tabular-nums ${m.delta > 0 ? "text-success" : "text-sale"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{m.stockAfter ?? "—"}</td>
                <td className={tdClass}>{orderNumber && m.orderId ? <Link href={`/admin/orders/${m.orderId}`} className="underline">{orderNumber}</Link> : "—"}</td>
                <td className={`${tdClass} text-xs text-ash`}>{email ?? (m.orderId ? "Checkout" : "System")}</td>
                <td className={`${tdClass} text-xs`}>{m.note || "—"}</td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={7}>No stock movements recorded.</EmptyRow>
          )}
        </tbody>
      </Table>
    </>
  );
}
