import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, ilike, lte, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import { products, variants } from "@/db/schema";
import { adjustStockAction, updateVariantSettingsAction } from "@/app/admin/_actions/inventory";
import { abtn, adminInput, adminSelect, AField, Badge, EmptyRow, FilterBar, Flash, inputSm, PageHeader, Pagination, Stat, Table, tdClass, thClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { requireStaff } from "@/lib/server/auth";
import { pageParam } from "@/lib/server/admin";

export const metadata: Metadata = { title: "Inventory" };

type SP = { q?: string; filter?: string; page?: string; ok?: string; error?: string };
const PER_PAGE = 40;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff("/admin/inventory");
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const db = await getDb();

  const where: SQL[] = [eq(products.type, "standard")];
  if (sp.q?.trim()) {
    const q = `%${sp.q.trim()}%`;
    where.push(or(ilike(products.title, q), ilike(variants.sku, q), ilike(variants.color, q))!);
  }
  if (sp.filter === "low") where.push(lte(variants.stock, variants.lowStockThreshold), eq(variants.allowBackorder, false));
  if (sp.filter === "out") where.push(lte(variants.stock, 0));
  if (sp.filter === "inactive") where.push(eq(variants.active, false));
  const cond = and(...where);

  const base = db.select({ v: variants, title: products.title, productId: products.id, status: products.status }).from(variants).innerJoin(products, eq(products.id, variants.productId));
  const [rows, countRows, allVariants] = await Promise.all([
    base.where(cond).orderBy(asc(products.title), asc(variants.position)).limit(PER_PAGE).offset((page - 1) * PER_PAGE),
    db.select({ id: variants.id }).from(variants).innerJoin(products, eq(products.id, variants.productId)).where(cond),
    db.select({ stock: variants.stock, threshold: variants.lowStockThreshold, backorder: variants.allowBackorder, active: variants.active }).from(variants),
  ]);
  const total = countRows.length;
  const units = allVariants.reduce((n, v) => n + Math.max(0, v.stock), 0);
  const low = allVariants.filter((v) => v.active && !v.backorder && v.stock > 0 && v.stock <= v.threshold).length;
  const out = allVariants.filter((v) => v.active && v.stock <= 0).length;
  const returnTo = `/admin/inventory?${new URLSearchParams(Object.entries({ q: sp.q ?? "", filter: sp.filter ?? "", page: String(page) }).filter(([, v]) => v)).toString()}`;

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock is tracked per size/colour variant. Tracksuit sets draw stock from their component pieces, so adjust the pieces here."
      />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Stat label="Units in stock" value={units.toLocaleString("en-GB")} />
        <Stat label="Variants" value={allVariants.length} />
        <Stat label="Low stock" value={low} tone={low ? "warn" : undefined} />
        <Stat label="Sold out" value={out} tone={out ? "warn" : undefined} />
      </div>
      <FilterBar clearHref={sp.q || sp.filter ? "/admin/inventory" : undefined}>
        <AField label="Search" className="w-64">
          <input name="q" defaultValue={sp.q} placeholder="Product, SKU or colour" className={adminInput} />
        </AField>
        <AField label="Show">
          <select name="filter" defaultValue={sp.filter ?? ""} className={adminSelect}>
            <option value="">All variants</option>
            <option value="low">Low stock</option>
            <option value="out">Sold out</option>
            <option value="inactive">Inactive</option>
          </select>
        </AField>
      </FilterBar>

      <Table>
        <thead>
          <tr>
            <th className={thClass}>Product / variant</th>
            <th className={thClass}>SKU</th>
            <th className={`${thClass} text-right`}>Stock</th>
            <th className={thClass}>Adjust stock</th>
            <th className={thClass}>Settings</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map(({ v, title, productId, status }) => {
              const lowStock = !v.allowBackorder && v.stock > 0 && v.stock <= v.lowStockThreshold;
              return (
                <tr key={v.id} className={v.active ? "" : "opacity-60"}>
                  <td className={`${tdClass} min-w-[220px]`}>
                    <Link href={`/admin/products/${productId}`} className="font-medium hover:underline">{title}</Link>
                    <span className="block text-xs text-ash">{v.color} / {v.size}{status !== "active" ? ` · product ${status}` : ""}</span>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap font-mono text-xs`}>
                    <Link href={`/admin/inventory/${v.id}`} className="hover:underline" title="Stock history">{v.sku}</Link>
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <span className={`text-lg font-bold tabular-nums ${v.stock < 5 ? "text-sale" : ""}`}>{v.stock}</span>
                    <span className="mt-0.5 block">
                      {v.stock <= 0 ? <Badge color="red">Sold out</Badge> : lowStock ? <Badge color="amber">Low</Badge> : <Badge color="green">In stock</Badge>}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <form action={adjustStockAction} className="flex min-w-[460px] flex-wrap items-center gap-1.5">
                      <input type="hidden" name="variantId" value={v.id} />
                      <input type="hidden" name="_return" value={returnTo} />
                      <select name="mode" aria-label="Adjustment type" className={`${inputSm} w-[118px]`}>
                        <option value="add">Add / remove</option>
                        <option value="set">Set exact count</option>
                      </select>
                      <input name="quantity" type="number" required step={1} placeholder="+10 / −2" aria-label={`Quantity for ${v.sku}`} className={`${inputSm} w-[78px]`} />
                      <select name="reason" aria-label="Reason" className={`${inputSm} w-[104px]`}>
                        <option value="restock">Restock</option>
                        <option value="adjustment">Correction</option>
                      </select>
                      <input name="note" placeholder="Note (optional)" maxLength={300} aria-label="Note" className={`${inputSm} w-[130px]`} />
                      <SubmitButton className={abtn("primary", "sm")}>Update</SubmitButton>
                    </form>
                  </td>
                  <td className={tdClass}>
                    <form action={updateVariantSettingsAction} className="flex min-w-[300px] flex-wrap items-center gap-2 text-xs">
                      <input type="hidden" name="variantId" value={v.id} />
                      <input type="hidden" name="_return" value={returnTo} />
                      <label className="flex items-center gap-1" title="Low-stock alert threshold">
                        Low at
                        <input name="lowStockThreshold" type="number" min={0} max={1000} defaultValue={v.lowStockThreshold} className={`${inputSm} w-14`} />
                      </label>
                      <label className="flex items-center gap-1" title="Allow orders when stock reaches zero (oversell)">
                        <input type="checkbox" name="allowBackorder" defaultChecked={v.allowBackorder} className="size-3.5 accent-ink" /> Backorder
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="checkbox" name="active" defaultChecked={v.active} className="size-3.5 accent-ink" /> Active
                      </label>
                      <SubmitButton className={abtn("secondary", "sm")}>Save</SubmitButton>
                    </form>
                  </td>
                </tr>
              );
            })
          ) : (
            <EmptyRow colSpan={5}>No variants match these filters.</EmptyRow>
          )}
        </tbody>
      </Table>
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} params={{ q: sp.q, filter: sp.filter }} />
    </>
  );
}
