import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, collectionProducts, collections, products } from "@/db/schema";
import { deleteCollectionAction, saveCollectionAction } from "@/app/admin/_actions/catalog";
import { abtn, adminInput, adminSelect, adminTextarea, AField, Card, Flash, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { requireStaff } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Collection" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

const toLocal = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function CollectionEditPage({ params, searchParams }: Props) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  await requireStaff(`/admin/collections/${id}`);
  const db = await getDb();
  const isNew = id === "new";
  const c = isNew ? null : (await db.select().from(collections).where(eq(collections.id, id)).limit(1))[0];
  if (!isNew && !c) notFound();
  const [cats, prods, members] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.position)),
    db.select({ id: products.id, title: products.title, status: products.status }).from(products).orderBy(asc(products.title)),
    c ? db.select().from(collectionProducts).where(eq(collectionProducts.collectionId, c.id)) : Promise.resolve([]),
  ]);
  const selected = new Set(members.map((m) => m.productId));
  const rules = c?.rules ?? {};

  return (
    <>
      <PageHeader back={{ href: "/admin/collections", label: "Collections" }} title={c ? c.title : "New collection"} description={c ? `/collections/${c.slug}` : undefined} />
      <Flash ok={flash.ok} error={flash.error} />
      <form action={saveCollectionAction} className="grid gap-6 xl:grid-cols-3">
        {c ? <input type="hidden" name="id" value={c.id} /> : null}
        <div className="space-y-6 xl:col-span-2">
          <Card title="Details">
            <div className="grid gap-4 md:grid-cols-2">
              <AField label="Title"><input name="title" required defaultValue={c?.title} className={adminInput} /></AField>
              <AField label="Slug"><input name="slug" defaultValue={c?.slug} className={adminInput} /></AField>
              <AField label="Description" className="md:col-span-2"><textarea name="description" defaultValue={c?.description} className={adminTextarea} /></AField>
              <AField label="Banner image URL" className="md:col-span-2"><input name="image" defaultValue={c?.image} className={adminInput} /></AField>
            </div>
          </Card>
          <Card title="Products">
            <AField label="How products are chosen" className="mb-4 max-w-sm">
              <select name="mode" defaultValue={c?.mode ?? "manual"} className={adminSelect}>
                <option value="manual">Manual — pick products below</option>
                <option value="rule">Automatic — products matching all rules</option>
              </select>
            </AField>
            <div className="grid gap-6 md:grid-cols-2">
              <fieldset>
                <legend className="mb-2 text-xs font-semibold">Manual selection</legend>
                <div className="max-h-80 space-y-1 overflow-y-auto border border-line bg-white p-3 text-sm">
                  {prods.map((p) => (
                    <label key={p.id} className="flex items-center gap-2">
                      <input type="checkbox" name="products" value={p.id} defaultChecked={selected.has(p.id)} className="size-4 accent-ink" />
                      <span className={p.status !== "active" ? "text-stone" : ""}>{p.title}{p.status !== "active" ? ` (${p.status})` : ""}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-3 text-sm">
                <legend className="mb-2 text-xs font-semibold">Automatic rules</legend>
                <div className="space-y-1">
                  <p className="text-xs text-ash">In any of these categories</p>
                  {cats.map((cat) => (
                    <label key={cat.id} className="mr-3 inline-flex items-center gap-1.5">
                      <input type="checkbox" name="ruleCategory" value={cat.id} defaultChecked={rules.categoryIds?.includes(cat.id)} className="size-4 accent-ink" /> {cat.name}
                    </label>
                  ))}
                </div>
                <AField label="Has any of these tags" hint="Comma separated"><input name="ruleTags" defaultValue={rules.tags?.join(", ")} className={adminInput} /></AField>
                <label className="flex items-center gap-2"><input type="checkbox" name="ruleNew" defaultChecked={rules.newArrivals} className="size-4 accent-ink" /> New arrivals only</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="ruleSale" defaultChecked={rules.onSale} className="size-4 accent-ink" /> On sale only</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="ruleFeatured" defaultChecked={rules.featured} className="size-4 accent-ink" /> Featured only</label>
              </fieldset>
            </div>
          </Card>
          <Card title="Search engine listing">
            <div className="grid gap-4">
              <AField label="SEO title"><input name="seoTitle" defaultValue={c?.seoTitle} className={adminInput} /></AField>
              <AField label="Meta description"><textarea name="seoDescription" defaultValue={c?.seoDescription} className={adminTextarea} /></AField>
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Visibility">
            <div className="space-y-3 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="visible" defaultChecked={c?.visible ?? true} className="size-4 accent-ink" /> Visible</label>
              <AField label="Publish from (optional)"><input type="datetime-local" name="publishAt" defaultValue={toLocal(c?.publishAt ?? null)} className={adminInput} /></AField>
              <AField label="Hide after (optional)"><input type="datetime-local" name="unpublishAt" defaultValue={toLocal(c?.unpublishAt ?? null)} className={adminInput} /></AField>
              <AField label="Menu order"><input type="number" name="position" defaultValue={c?.position ?? 0} className={adminInput} /></AField>
            </div>
          </Card>
          <SubmitButton className={`${abtn("primary")} w-full`}>{c ? "Save collection" : "Create collection"}</SubmitButton>
        </div>
      </form>
      {c ? (
        <form action={deleteCollectionAction} className="mt-8 border-t border-line pt-6">
          <input type="hidden" name="id" value={c.id} />
          <SubmitButton className={abtn("danger", "sm")} confirm="Delete this collection? Products in it are not affected.">Delete collection</SubmitButton>
          <span className="ml-3 text-xs text-stone">Products are not affected.</span>
        </form>
      ) : null}
    </>
  );
}
