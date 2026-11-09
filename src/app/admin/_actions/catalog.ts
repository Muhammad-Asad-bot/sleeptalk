"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, collectionProducts, collections, type CollectionRules } from "@/db/schema";
import { requireStaff } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { back, bool, int, str } from "@/lib/server/admin";
import { slugify } from "@/lib/utils";

export async function saveCategoryAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const name = str(formData, "name", 80);
  const slug = slugify(str(formData, "slug", 90) || name);
  if (!name || !slug) back("/admin/categories", { error: "Category name is required." });
  const position = int(formData, "position") ?? 0;
  const db = await getDb();
  const [taken] = await db.select({ id: categories.id }).from(categories).where(id ? and(eq(categories.slug, slug), ne(categories.id, id)) : eq(categories.slug, slug)).limit(1);
  if (taken) back("/admin/categories", { error: `The slug "${slug}" is already used.` });
  const values = {
    name,
    slug,
    description: str(formData, "description", 1000),
    image: str(formData, "image", 1000),
    position: Number.isNaN(position) ? 0 : position,
    visible: bool(formData, "visible"),
    seoTitle: str(formData, "seoTitle", 140),
    seoDescription: str(formData, "seoDescription", 320),
  };
  if (id) await db.update(categories).set(values).where(eq(categories.id, id));
  else await db.insert(categories).values(values);
  await audit(user, id ? "category.updated" : "category.created", "category", id || slug, { name, slug });
  revalidatePath("/admin/categories");
  back("/admin/categories", { ok: `Category “${name}” saved.` });
}

export async function saveCollectionAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const title = str(formData, "title", 120);
  const slug = slugify(str(formData, "slug", 90) || title);
  const path = id ? `/admin/collections/${id}` : "/admin/collections/new";
  if (!title || !slug) back(path, { error: "Collection title is required." });
  const mode = str(formData, "mode", 10) === "rule" ? "rule" : "manual";
  const rules: CollectionRules = {
    categoryIds: formData.getAll("ruleCategory").map(String).filter(Boolean),
    tags: str(formData, "ruleTags", 400).split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
    newArrivals: bool(formData, "ruleNew"),
    onSale: bool(formData, "ruleSale"),
    featured: bool(formData, "ruleFeatured"),
  };
  const parseDate = (k: string) => {
    const v = str(formData, k, 40);
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const db = await getDb();
  const [taken] = await db.select({ id: collections.id }).from(collections).where(id ? and(eq(collections.slug, slug), ne(collections.id, id)) : eq(collections.slug, slug)).limit(1);
  if (taken) back(path, { error: `The slug "${slug}" is already used.` });
  const values = {
    title,
    slug,
    description: str(formData, "description", 2000),
    image: str(formData, "image", 1000),
    mode: mode as "manual" | "rule",
    rules,
    visible: bool(formData, "visible"),
    publishAt: parseDate("publishAt"),
    unpublishAt: parseDate("unpublishAt"),
    position: int(formData, "position") || 0,
    seoTitle: str(formData, "seoTitle", 140),
    seoDescription: str(formData, "seoDescription", 320),
  };
  const productIds = formData.getAll("products").map(String).filter(Boolean);
  const savedId = await db.transaction(async (tx) => {
    let cid = id;
    if (id) await tx.update(collections).set(values).where(eq(collections.id, id));
    else cid = (await tx.insert(collections).values(values).returning({ id: collections.id }))[0].id;
    await tx.delete(collectionProducts).where(eq(collectionProducts.collectionId, cid));
    if (mode === "manual" && productIds.length) {
      await tx.insert(collectionProducts).values(productIds.map((pid, i) => ({ collectionId: cid, productId: pid, position: i })));
    }
    return cid;
  });
  await audit(user, id ? "collection.updated" : "collection.created", "collection", savedId, { title, mode, products: productIds.length });
  revalidatePath("/admin/collections");
  back(`/admin/collections/${savedId}`, { ok: "Collection saved." });
}

export async function deleteCollectionAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const db = await getDb();
  const [c] = await db.select().from(collections).where(eq(collections.id, id)).limit(1);
  if (!c) back("/admin/collections", { error: "Collection not found." });
  await db.delete(collections).where(eq(collections.id, id));
  await audit(user, "collection.deleted", "collection", id, { title: c.title });
  revalidatePath("/admin/collections");
  back("/admin/collections", { ok: `Deleted “${c.title}”.` });
}
