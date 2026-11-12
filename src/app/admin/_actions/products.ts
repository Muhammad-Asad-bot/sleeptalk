"use server";

import { revalidatePath } from "next/cache";
import { refreshStorefront } from "@/lib/server/store-cache";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { productImages, productPrices, products, setComponents, slugRedirects, stockMovements, variants } from "@/db/schema";
import { MARKET_CODES, parseMoneyInput } from "@/lib/markets";
import { requireStaff } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { back, str } from "@/lib/server/admin";
import { slugify } from "@/lib/utils";
import { FIT_CODES } from "@/lib/fits";

const priceSchema = z.object({ amount: z.string().max(12), compareAt: z.string().max(12), available: z.boolean() });

const productSchema = z.object({
  id: z.string().max(64).optional(),
  title: z.string().trim().min(1, "Title is required").max(140),
  slug: z.string().trim().max(90),
  description: z.string().max(5000),
  fitNotes: z.string().max(1000),
  fabric: z.string().max(1000),
  care: z.string().max(1000),
  modelInfo: z.string().max(500),
  measurements: z.string().max(2000),
  categoryId: z.string().max(64).nullable(),
  type: z.enum(["standard", "set"]),
  status: z.enum(["draft", "active", "archived"]),
  isListed: z.boolean(),
  isFeatured: z.boolean(),
  isNewArrival: z.boolean(),
  tags: z.array(z.string().trim().toLowerCase().max(40)).max(30),
  seoTitle: z.string().max(140),
  seoDescription: z.string().max(320),
  prices: z.record(z.string(), priceSchema),
  images: z
    .array(
      z.object({
        url: z.string().trim().min(1).max(1000).refine((u) => u.startsWith("/") || u.startsWith("https://"), "Image URLs must start with / or https://"),
        alt: z.string().max(300),
        color: z.string().max(60).nullable(),
      }),
    )
    .max(40),
  variants: z
    .array(
      z.object({
        id: z.string().max(64).optional(),
        sku: z.string().trim().min(1, "Every variant needs a SKU").max(64),
        color: z.string().trim().min(1, "Every variant needs a colour").max(60),
        // One hex, or "#upper,#lower" for a two-tone colour.
        colorHex: z.string().regex(/^#[0-9a-fA-F]{6}(,#[0-9a-fA-F]{6})?$/, "Colour must be a hex value like #111111 (or two, for a two-tone colour)"),
        size: z.string().trim().min(1, "Every variant needs a size").max(20),
        fit: z.enum(FIT_CODES).default("standard"),
        initialStock: z.number().int().min(0).max(100000).optional(),
        /** Saved variants: change typed on the product page (new count − count when the page loaded). */
        stockDelta: z.number().int().min(-100000).max(100000).optional(),
        lowStockThreshold: z.number().int().min(0).max(1000),
        allowBackorder: z.boolean(),
        active: z.boolean(),
      }),
    )
    .max(300),
  components: z.array(z.object({ productId: z.string().max(64), label: z.string().trim().min(1).max(30) })).max(6),
});

export type ProductPayload = z.infer<typeof productSchema>;
export type SaveProductResult = { ok: true; id: string } | { ok: false; error: string };

export async function saveProductAction(payload: ProductPayload): Promise<SaveProductResult> {
  const user = await requireStaff();
  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const data = parsed.data;
  const slug = slugify(data.slug || data.title);
  if (!slug) return { ok: false, error: "Enter a URL slug." };

  // Prices (minor units) per market
  const prices: { market: (typeof MARKET_CODES)[number]; amount: number; compareAt: number | null; available: boolean }[] = [];
  for (const m of MARKET_CODES) {
    const p = data.prices[m];
    if (!p || !p.amount.trim()) continue;
    const amount = parseMoneyInput(p.amount);
    const compareAt = parseMoneyInput(p.compareAt);
    if (amount == null || Number.isNaN(amount) || amount <= 0) return { ok: false, error: `Enter a valid ${m} price.` };
    if (compareAt != null && (Number.isNaN(compareAt) || compareAt <= amount)) {
      return { ok: false, error: `${m} compare-at price must be higher than the selling price (or left empty).` };
    }
    prices.push({ market: m, amount, compareAt, available: p.available });
  }
  if (data.status === "active" && !prices.length) return { ok: false, error: "Active products need a price in at least one market." };
  if (data.type === "standard" && data.status === "active" && !data.variants.some((v) => v.active)) {
    return { ok: false, error: "Active products need at least one active size/colour variant." };
  }
  if (data.type === "set" && data.status === "active" && data.components.length < 2) {
    return { ok: false, error: "A tracksuit set needs at least two component pieces." };
  }
  const skus = data.variants.map((v) => v.sku.toUpperCase());
  if (new Set(skus).size !== skus.length) return { ok: false, error: "Each variant SKU must be unique." };

  const db = await getDb();
  // Independent checks run in parallel: each is a round trip to the database.
  const [[slugTaken], clash, before] = await Promise.all([
    db
      .select({ id: products.id })
      .from(products)
      .where(data.id ? and(eq(products.slug, slug), ne(products.id, data.id)) : eq(products.slug, slug))
      .limit(1),
    skus.length
      ? db.select({ sku: variants.sku, productId: variants.productId }).from(variants).where(inArray(variants.sku, skus))
      : Promise.resolve([]),
    data.id ? db.query.products.findFirst({ where: eq(products.id, data.id), with: { prices: true } }) : Promise.resolve(null),
  ]);
  if (slugTaken) return { ok: false, error: `The URL slug "${slug}" is already used by another product.` };
  const foreign = clash.find((c) => c.productId !== data.id);
  if (foreign) return { ok: false, error: `SKU ${foreign.sku} is already used by another product.` };
  if (data.id && !before) return { ok: false, error: "Product not found." };

  const stockChanges: { sku: string; from: number; to: number }[] = [];
  const id = await db.transaction(async (tx) => {
    const values = {
      title: data.title,
      slug,
      description: data.description,
      fitNotes: data.fitNotes,
      fabric: data.fabric,
      care: data.care,
      modelInfo: data.modelInfo,
      measurements: data.measurements,
      categoryId: data.categoryId || null,
      type: data.type,
      status: data.status,
      isListed: data.isListed,
      isFeatured: data.isFeatured,
      isNewArrival: data.isNewArrival,
      tags: [...new Set(data.tags.filter(Boolean))],
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      publishedAt: data.status === "active" ? (before?.publishedAt ?? new Date()) : (before?.publishedAt ?? null),
    };
    let productId: string;
    if (before) {
      productId = before.id;
      await tx.update(products).set(values).where(eq(products.id, productId));
      if (before.slug !== slug) {
        // Keep old URLs working (301/308) after a rename
        await tx.insert(slugRedirects).values({ fromSlug: before.slug, productId }).onConflictDoUpdate({ target: slugRedirects.fromSlug, set: { productId } });
        await tx.delete(slugRedirects).where(eq(slugRedirects.fromSlug, slug));
      }
    } else {
      const [created] = await tx.insert(products).values(values).returning({ id: products.id });
      productId = created.id;
    }

    await tx.delete(productPrices).where(eq(productPrices.productId, productId));
    if (prices.length) await tx.insert(productPrices).values(prices.map((p) => ({ ...p, productId })));

    await tx.delete(productImages).where(eq(productImages.productId, productId));
    if (data.images.length) {
      await tx.insert(productImages).values(
        data.images.map((img, i) => ({ productId, url: img.url, alt: img.alt, color: img.color || null, position: i, isDemo: false })),
      );
    }

    if (data.type === "standard") {
      const existing = await tx.select().from(variants).where(eq(variants.productId, productId));
      const keep = new Set(data.variants.filter((v) => v.id).map((v) => v.id));
      // Variants removed in the editor are deactivated (never deleted) to preserve order and stock history.
      for (const v of existing) if (!keep.has(v.id) && v.active) await tx.update(variants).set({ active: false }).where(eq(variants.id, v.id));
      for (const [i, v] of data.variants.entries()) {
        const fields = {
          sku: v.sku.toUpperCase(),
          color: v.color,
          colorHex: v.colorHex,
          size: v.size,
          fit: v.fit,
          lowStockThreshold: v.lowStockThreshold,
          allowBackorder: v.allowBackorder,
          active: v.active,
          position: i,
        };
        const old = v.id ? existing.find((e) => e.id === v.id) : undefined;
        if (old) {
          // Only write sizes that actually changed — each update is a round trip.
          const changed = (Object.keys(fields) as (keyof typeof fields)[]).some((k) => old[k] !== fields[k]);
          if (changed) await tx.update(variants).set(fields).where(eq(variants.id, old.id));
          if (v.stockDelta) {
            // Apply the change as a delta (not an absolute count) so sales made while the page was
            // open aren't overwritten, and log it like an Inventory adjustment. Never below zero.
            const [current] = await tx.select({ stock: variants.stock }).from(variants).where(eq(variants.id, old.id)).for("update");
            const delta = Math.max(v.stockDelta, -current.stock);
            if (delta !== 0) {
              const [updated] = await tx
                .update(variants)
                .set({ stock: sql`${variants.stock} + ${delta}` })
                .where(eq(variants.id, old.id))
                .returning({ stock: variants.stock });
              await tx.insert(stockMovements).values({ variantId: old.id, delta, stockAfter: updated.stock, reason: "adjustment", note: "Changed on product page", userId: user.id });
              stockChanges.push({ sku: fields.sku, from: current.stock, to: updated.stock });
            }
          }
        } else {
          const stock = v.initialStock ?? 0;
          const [nv] = await tx.insert(variants).values({ ...fields, productId, stock }).returning({ id: variants.id });
          await tx.insert(stockMovements).values({ variantId: nv.id, delta: stock, stockAfter: stock, reason: "initial", note: "Created in admin", userId: user.id });
        }
      }
    }

    await tx.delete(setComponents).where(eq(setComponents.setProductId, productId));
    if (data.type === "set" && data.components.length) {
      await tx.insert(setComponents).values(
        data.components
          .filter((c) => c.productId && c.productId !== productId)
          .map((c, i) => ({ setProductId: productId, componentProductId: c.productId, label: c.label, position: i })),
      );
    }
    return productId;
  });

  const priceChanges = MARKET_CODES.map((m) => {
    const old = before?.prices.find((p) => p.market === m);
    const next = prices.find((p) => p.market === m);
    return old?.amount !== next?.amount || (old?.compareAt ?? null) !== (next?.compareAt ?? null)
      ? { market: m, from: old ? [old.amount, old.compareAt] : null, to: next ? [next.amount, next.compareAt] : null }
      : null;
  }).filter(Boolean);
  await audit(user, before ? "product.updated" : "product.created", "product", id, {
    title: data.title,
    status: data.status,
    ...(before && before.status !== data.status ? { statusChange: [before.status, data.status] } : {}),
    ...(priceChanges.length ? { priceChanges } : {}),
    ...(stockChanges.length ? { stockChanges } : {}),
  });
  if (stockChanges.length) revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath(`/products/${slug}`);
  refreshStorefront();
  return { ok: true, id };
}

export async function setProductStatusAction(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["draft", "active", "archived"].includes(status)) return;
  const db = await getDb();
  const [p] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!p) return;
  await db.update(products).set({ status: status as "draft" | "active" | "archived" }).where(eq(products.id, id));
  await audit(user, "product.status_changed", "product", id, { title: p.title, from: p.status, to: status });
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  refreshStorefront();
}

export async function deleteProductAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  if (!id) back("/admin/products", { error: "Product not found." });

  const db = await getDb();
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) back("/admin/products", { error: "Product not found." });

  const [dependentSet] = await db
    .select({ id: setComponents.setProductId })
    .from(setComponents)
    .where(eq(setComponents.componentProductId, id))
    .limit(1);
  if (dependentSet) {
    back(`/admin/products/${id}`, { error: "This product is part of a tracksuit set. Remove it from the set before deleting it." });
  }

  await db.delete(products).where(eq(products.id, id));
  await audit(user, "product.deleted", "product", id, { title: product.title, slug: product.slug });
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath(`/products/${product.slug}`);
  refreshStorefront();
  back("/admin/products", { ok: `Deleted “${product.title}”.` });
}
