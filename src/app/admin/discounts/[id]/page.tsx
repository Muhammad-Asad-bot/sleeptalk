import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, collections, discounts, products } from "@/db/schema";
import { saveDiscountAction } from "@/app/admin/_actions/sales";
import { abtn, adminInput, adminSelect, AField, Card, Flash, PageHeader } from "@/components/admin/ui";
import { MARKETS, MARKET_CODES, minorToInput } from "@/lib/markets";
import { requireStaff } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Discount" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };
const toLocal = (d: Date | null | undefined) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function DiscountEditPage({ params, searchParams }: Props) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  await requireStaff("/admin/discounts");
  const db = await getDb();
  const d = id === "new" ? null : (await db.select().from(discounts).where(eq(discounts.id, id)).limit(1))[0];
  if (id !== "new" && !d) notFound();
  const [cats, cols, prods] = await Promise.all([
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.position)),
    db.select({ id: collections.id, name: collections.title }).from(collections).orderBy(asc(collections.position)),
    db.select({ id: products.id, name: products.title }).from(products).where(eq(products.status, "active")).orderBy(asc(products.title)),
  ]);
  const targets = new Set(d?.targetIds ?? []);
  const scopeList = (name: "categories" | "collections" | "products", items: { id: string; name: string }[]) => (
    <div className="max-h-48 space-y-1 overflow-y-auto border border-line bg-white p-2 text-sm">
      {items.map((i) => (
        <label key={i.id} className="flex items-center gap-2"><input type="checkbox" name={`targets_${name}`} value={i.id} defaultChecked={d?.scope === name && targets.has(i.id)} className="size-4 accent-ink" /> {i.name}</label>
      ))}
    </div>
  );
  return (
    <>
      <PageHeader back={{ href: "/admin/discounts", label: "Discounts" }} title={d ? d.code : "New discount code"} description={d ? `Used ${d.usageCount} time${d.usageCount === 1 ? "" : "s"}` : undefined} />
      <Flash ok={flash.ok} error={flash.error} />
      <form action={saveDiscountAction} className="grid gap-6 xl:grid-cols-3">
        {d ? <input type="hidden" name="id" value={d.id} /> : null}
        <div className="space-y-6 xl:col-span-2">
          <Card title="Code & value">
            <div className="grid gap-4 md:grid-cols-2">
              <AField label="Code" hint="Customers type this. Letters/numbers, no spaces."><input name="code" required defaultValue={d?.code} className={`${adminInput} font-mono uppercase`} /></AField>
              <AField label="Internal description"><input name="description" defaultValue={d?.description} className={adminInput} /></AField>
              <AField label="Type">
                <select name="type" defaultValue={d?.type ?? "percentage"} className={adminSelect}>
                  <option value="percentage">Percentage off</option>
                  <option value="fixed">Fixed amount off (per market)</option>
                </select>
              </AField>
              <AField label="Percentage off" hint="For percentage codes"><input name="percentOff" type="number" min={1} max={100} defaultValue={d?.percentOff ?? ""} className={adminInput} /></AField>
              {MARKET_CODES.map((m) => (
                <AField key={m} label={`Fixed amount off — ${MARKETS[m].currency}`} hint="For fixed codes; leave empty to exclude this market">
                  <input name={`amountOff_${m}`} inputMode="decimal" defaultValue={minorToInput(d?.amountOff[m])} className={adminInput} />
                </AField>
              ))}
              {MARKET_CODES.map((m) => (
                <AField key={m} label={`Minimum spend — ${MARKETS[m].currency} (optional)`}>
                  <input name={`minSpend_${m}`} inputMode="decimal" defaultValue={minorToInput(d?.minSpend[m])} className={adminInput} />
                </AField>
              ))}
            </div>
          </Card>
          <Card title="Applies to">
            <AField label="Scope" className="mb-4 max-w-xs">
              <select name="scope" defaultValue={d?.scope ?? "all"} className={adminSelect}>
                <option value="all">Whole order</option>
                <option value="categories">Selected categories</option>
                <option value="collections">Selected collections</option>
                <option value="products">Selected products</option>
              </select>
            </AField>
            <div className="grid gap-4 md:grid-cols-3">
              <div><p className="mb-1 text-xs font-medium">Categories</p>{scopeList("categories", cats)}</div>
              <div><p className="mb-1 text-xs font-medium">Collections</p>{scopeList("collections", cols)}</div>
              <div><p className="mb-1 text-xs font-medium">Products</p>{scopeList("products", prods)}</div>
            </div>
            <p className="mt-2 text-xs text-stone">Only the list matching the chosen scope is used.</p>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Limits">
            <div className="space-y-3 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={d?.active ?? true} className="size-4 accent-ink" /> Active</label>
              <fieldset>
                <legend className="mb-1 text-xs font-medium">Markets (none ticked = all)</legend>
                {MARKET_CODES.map((m) => (
                  <label key={m} className="mr-4 inline-flex items-center gap-2"><input type="checkbox" name="markets" value={m} defaultChecked={d?.markets.includes(m)} className="size-4 accent-ink" /> {MARKETS[m].label}</label>
                ))}
              </fieldset>
              <AField label="Starts (optional)"><input type="datetime-local" name="startsAt" defaultValue={toLocal(d?.startsAt)} className={adminInput} /></AField>
              <AField label="Ends (optional)"><input type="datetime-local" name="endsAt" defaultValue={toLocal(d?.endsAt)} className={adminInput} /></AField>
              <AField label="Total uses (optional)"><input type="number" min={1} name="usageLimit" defaultValue={d?.usageLimit ?? ""} className={adminInput} /></AField>
            </div>
          </Card>
          <button type="submit" className={`${abtn("primary")} w-full`}>{d ? "Save code" : "Create code"}</button>
        </div>
      </form>
    </>
  );
}
