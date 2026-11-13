import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, products } from "@/db/schema";
import { abtn, adminInput, adminSelect, AField, Badge, EmptyRow, FilterBar, Flash, PageHeader, Table, tdClass, thClass } from "@/components/admin/ui";
import { SmartImage } from "@/components/ui/smart-image";
import { formatMoney } from "@/lib/markets";
import { requireStaff } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Products" };

type SP = { q?: string; status?: string; category?: string; preorder?: string; ok?: string; error?: string };

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff("/admin/products");
  const sp = await searchParams;
  const db = await getDb();
  const where: SQL[] = [];
  if (sp.q?.trim()) where.push(or(ilike(products.title, `%${sp.q.trim()}%`), ilike(products.slug, `%${sp.q.trim()}%`))!);
  if (sp.status && ["draft", "active", "archived"].includes(sp.status)) where.push(eq(products.status, sp.status as "draft"));
  if (sp.category) where.push(eq(products.categoryId, sp.category));
  if (sp.preorder === "1") where.push(eq(products.preorder, true));
  const [rows, cats] = await Promise.all([
    db.query.products.findMany({
      where: where.length ? and(...where) : undefined,
      with: { category: true, prices: true, variants: true, images: { orderBy: (t, { asc }) => [asc(t.position)], limit: 1 }, components: true },
      orderBy: [desc(products.updatedAt)],
    }),
    db.select().from(categories).orderBy(asc(categories.position)),
  ]);

  return (
    <>
      <PageHeader
        title="Products"
        description={`${rows.length} product${rows.length === 1 ? "" : "s"}. Archive to hide and restore products; permanent deletion keeps saved order details intact.`}
        actions={<Link href="/admin/products/new" className={abtn("primary")}>Add product</Link>}
      />
      <Flash ok={sp.ok} error={sp.error} />
      <FilterBar clearHref={sp.q || sp.status || sp.category || sp.preorder ? "/admin/products" : undefined}>
        <AField label="Search" className="w-64"><input name="q" defaultValue={sp.q} placeholder="Title or slug" className={adminInput} /></AField>
        <AField label="Status">
          <select name="status" defaultValue={sp.status ?? ""} className={adminSelect}>
            <option value="">All</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
          </select>
        </AField>
        <AField label="Category">
          <select name="category" defaultValue={sp.category ?? ""} className={adminSelect}>
            <option value="">All</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </AField>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="preorder" value="1" defaultChecked={sp.preorder === "1"} className="size-4 accent-ink" />
          Pre-order only
        </label>
      </FilterBar>
      <Table>
        <thead>
          <tr>
            <th className={thClass}>Product</th>
            <th className={thClass}>Category</th>
            <th className={thClass}>Status</th>
            <th className={`${thClass} text-right`}>Canada</th>
            <th className={`${thClass} text-right`}>Stock</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((p) => {
              const ca = p.prices.find((x) => x.market === "CA");
              const stock = p.variants.filter((v) => v.active).reduce((n, v) => n + Math.max(0, v.stock), 0);
              return (
                <tr key={p.id} className="hover:bg-paper">
                  <td className={tdClass}>
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                      <span className="relative block h-14 w-11 shrink-0 overflow-hidden bg-cream">
                        <SmartImage src={p.images[0]?.url} alt="" fill sizes="44px" className="object-cover" showDemoTag={false} />
                      </span>
                      <span>
                        <span className="font-medium hover:underline">{p.title}</span>
                        <span className="mt-0.5 flex flex-wrap gap-1">
                          {p.type === "set" ? <Badge color="black">Set</Badge> : null}
                          {p.preorder ? <Badge color="blue">Pre-order</Badge> : null}
                          {!p.isListed ? <Badge>Unlisted</Badge> : null}
                          {p.isDemo ? <Badge color="amber">Demo</Badge> : null}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className={`${tdClass} text-ash`}>{p.category?.name ?? "—"}</td>
                  <td className={tdClass}>
                    <Badge color={p.status === "active" ? "green" : p.status === "draft" ? "amber" : "grey"}>{p.status}</Badge>
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{ca ? formatMoney(ca.amount, "CA").replace(" CAD", "") : "—"}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{p.type === "set" ? <span className="text-xs text-stone">from pieces</span> : <span className={stock < 5 ? "font-semibold text-sale" : ""}>{stock}</span>}</td>
                </tr>
              );
            })
          ) : (
            <EmptyRow colSpan={5}>No products match. <Link href="/admin/products/new" className="underline">Add a product</Link>.</EmptyRow>
          )}
        </tbody>
      </Table>
    </>
  );
}
