"use server";

import { revalidatePath } from "next/cache";
import { refreshStorefront } from "@/lib/server/store-cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, collectionProducts, collections, type CollectionRules } from "@/db/schema";
import { requireStaff } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { back, bool, int, str } from "@/lib/server/admin";
import { slugify } from "@/lib/utils";
import { getSettings, saveSetting } from "@/lib/server/settings";

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
  refreshStorefront();
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
  refreshStorefront();
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
  refreshStorefront();
  back("/admin/collections", { ok: `Deleted “${c.title}”.` });
}

const HEX = /^#[0-9a-fA-F]{6}(,#[0-9a-fA-F]{6})?$/;
type LibraryColour = { name: string; hex: string };

function cleanColours(list: unknown): LibraryColour[] | null {
  if (!Array.isArray(list) || list.length > 200) return null;
  const out: LibraryColour[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const name = String((item as LibraryColour)?.name ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
    const hex = String((item as LibraryColour)?.hex ?? "").trim();
    if (!name || !HEX.test(hex) || seen.has(name.toLowerCase())) return null;
    seen.add(name.toLowerCase());
    out.push({ name, hex });
  }
  return out;
}

/** Replaces the shop colour library (Admin → Colours). */
export async function saveColourLibraryAction(list: LibraryColour[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireStaff();
  const clean = cleanColours(list);
  if (!clean) return { ok: false, error: "Every colour needs a unique name and a valid colour." };
  await saveSetting("colours", { list: clean });
  await audit(user, "colours.updated", "settings", "colours", { count: clean.length });
  revalidatePath("/admin/colours");
  refreshStorefront();
  return { ok: true };
}

/** Adds one colour to the library from the product editor (no-op if the name already exists). */
export async function addLibraryColourAction(colour: LibraryColour): Promise<{ ok: true; list: LibraryColour[] } | { ok: false; error: string }> {
  const user = await requireStaff();
  const [clean] = cleanColours([colour]) ?? [];
  if (!clean) return { ok: false, error: "Give the colour a name and pick its shade." };
  const { colours } = await getSettings();
  if (colours.list.some((c) => c.name.toLowerCase() === clean.name.toLowerCase())) return { ok: true, list: colours.list };
  const list = [...colours.list, clean];
  await saveSetting("colours", { list });
  await audit(user, "colours.added", "settings", "colours", clean);
  revalidatePath("/admin/colours");
  refreshStorefront();
  return { ok: true, list };
}

/** Removes one colour from the shop library without changing products that already use it. */
export async function removeLibraryColourAction(rawName: string): Promise<{ ok: true; list: LibraryColour[] } | { ok: false; error: string }> {
  const user = await requireStaff();
  const name = String(rawName ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  if (!name) return { ok: false, error: "Choose a colour to remove." };
  const { colours } = await getSettings();
  const list = colours.list.filter((colour) => colour.name.toLowerCase() !== name.toLowerCase());
  if (list.length === colours.list.length) return { ok: false, error: `“${name}” is no longer in the colour library. Refresh and try again.` };
  await saveSetting("colours", { list });
  await audit(user, "colours.removed", "settings", "colours", { name });
  revalidatePath("/admin/colours");
  refreshStorefront();
  return { ok: true, list };
}

/** Creates a category from the product editor without leaving the page. */
export async function quickCreateCategoryAction(rawName: string): Promise<{ ok: true; id: string; name: string } | { ok: false; error: string }> {
  const user = await requireStaff();
  const name = String(rawName ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const slug = slugify(name);
  if (!name || !slug) return { ok: false, error: "Enter a category name." };
  const db = await getDb();
  const [existing] = await db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.slug, slug)).limit(1);
  if (existing) return { ok: true, id: existing.id, name: existing.name };
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${categories.position}), 0)`.mapWith(Number) }).from(categories);
  const [created] = await db.insert(categories).values({ name, slug, position: max + 1, visible: true }).returning({ id: categories.id, name: categories.name });
  await audit(user, "category.created", "category", created.id, { name, slug, from: "product editor" });
  revalidatePath("/admin/categories");
  refreshStorefront();
  return { ok: true, ...created };
}
