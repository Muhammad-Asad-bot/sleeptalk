import type { Metadata } from "next";
import { asc, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, products } from "@/db/schema";
import { saveCategoryAction } from "@/app/admin/_actions/catalog";
import { abtn, adminInput, adminTextarea, AField, Badge, Card, Flash, PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Categories" };

function CategoryForm({ c }: { c?: typeof categories.$inferSelect }) {
  return (
    <form action={saveCategoryAction} className="grid gap-3 md:grid-cols-6">
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <AField label="Name" className="md:col-span-2"><input name="name" required defaultValue={c?.name} className={adminInput} /></AField>
      <AField label="Slug" className="md:col-span-2" hint="/shop/…"><input name="slug" defaultValue={c?.slug} className={adminInput} /></AField>
      <AField label="Order"><input name="position" type="number" defaultValue={c?.position ?? 0} className={adminInput} /></AField>
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="visible" defaultChecked={c?.visible ?? true} className="size-4 accent-ink" /> Visible</label>
      <AField label="Description" className="md:col-span-3"><textarea name="description" defaultValue={c?.description} className={adminTextarea} /></AField>
      <AField label="Tile image URL" className="md:col-span-3" hint="Upload images in a product, then paste the /uploads/… URL"><input name="image" defaultValue={c?.image} className={adminInput} /></AField>
      <AField label="SEO title" className="md:col-span-3"><input name="seoTitle" defaultValue={c?.seoTitle} className={adminInput} /></AField>
      <AField label="Meta description" className="md:col-span-3"><input name="seoDescription" defaultValue={c?.seoDescription} className={adminInput} /></AField>
      <div className="md:col-span-6"><button type="submit" className={abtn(c ? "secondary" : "primary")}>{c ? "Save category" : "Add category"}</button></div>
    </form>
  );
}

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("/admin/categories");
  const flash = await searchParams;
  const db = await getDb();
  const [rows, counts] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.position)),
    db.select({ id: products.categoryId, n: sql<number>`count(*)`.mapWith(Number) }).from(products).groupBy(products.categoryId),
  ]);
  return (
    <>
      <PageHeader title="Categories" description="The six primary shop categories (and any you add). Order controls the menu and homepage tiles." />
      <Flash ok={flash.ok} error={flash.error} />
      <div className="space-y-4">
        {rows.map((c) => (
          <Card key={c.id} title={c.name} actions={<span className="flex gap-2">{!c.visible ? <Badge>Hidden</Badge> : null}<Badge>{counts.find((x) => x.id === c.id)?.n ?? 0} products</Badge></span>}>
            <CategoryForm c={c} />
          </Card>
        ))}
        <Card title="Add a category"><CategoryForm /></Card>
      </div>
    </>
  );
}
