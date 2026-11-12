import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  categories,
  collectionProducts,
  collections,
  products,
  productImages,
  reviews,
  slugRedirects,
  type CollectionRules,
} from "@/db/schema";
import type { MarketCode } from "@/lib/markets";
import { sortSizes } from "@/lib/utils";
import { storeCached } from "./store-cache";

/*
 * Catalogue access. A boutique label's catalogue (tens to low hundreds of products) is loaded
 * once per request and filtered in memory, which keeps filtering/faceting logic simple and
 * consistent. If the catalogue grows into thousands of SKUs, move filters into SQL here.
 */

export type CatalogVariant = {
  id: string;
  sku: string;
  color: string;
  colorHex: string;
  size: string;
  /** "standard" | "oversized" (lib/fits.ts) */
  fit: string;
  stock: number;
  allowBackorder: boolean;
  lowStockThreshold: number;
  active: boolean;
};

export type CatalogImage = { id: string; url: string; alt: string; color: string | null; isDemo: boolean };

export type CatalogComponent = {
  productId: string;
  slug: string;
  title: string;
  label: string;
  isListed: boolean;
  status: string;
  variants: CatalogVariant[];
};

export type CatalogProduct = {
  id: string;
  slug: string;
  title: string;
  description: string;
  fitNotes: string;
  fabric: string;
  care: string;
  modelInfo: string;
  measurements: string;
  type: "standard" | "set";
  categoryId: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  tags: string[];
  isListed: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isDemo: boolean;
  salesCount: number;
  publishedAt: Date | null;
  seoTitle: string;
  seoDescription: string;
  price: number;
  compareAt: number | null;
  images: CatalogImage[];
  variants: CatalogVariant[];
  components: CatalogComponent[];
  colours: { name: string; hex: string }[];
  sizes: string[];
  available: boolean;
};

export type ProductCardData = {
  id: string;
  slug: string;
  title: string;
  price: number;
  compareAt: number | null;
  image: CatalogImage | null;
  hoverImage: CatalogImage | null;
  colours: { name: string; hex: string }[];
  badges: ("New" | "Sale" | "Sold out" | "Set")[];
  available: boolean;
  isSet: boolean;
  requiresSelection: boolean;
  singleVariantId: string | null;
  /** Units available to buy (sets: complete sets that can be assembled from their pieces) */
  stock: number;
};

function variantInStock(v: CatalogVariant) {
  return v.active && (v.allowBackorder || v.stock > 0);
}

/** Colours a set can be bought in: those offered by every component. */
function setColours(components: CatalogComponent[]) {
  if (!components.length) return [];
  const lists = components.map((c) => c.variants.filter((v) => v.active).map((v) => v.color));
  return [...new Set(lists[0])].filter((colour) => lists.every((l) => l.includes(colour)));
}

export function setAvailableInColour(components: CatalogComponent[], colour: string) {
  return components.every((c) => c.variants.some((v) => v.color === colour && variantInStock(v)));
}

async function buildCatalog(market: MarketCode): Promise<CatalogProduct[]> {
  const db = await getDb();
  const rows = await db.query.products.findMany({
    where: eq(products.status, "active"),
    with: {
      category: true,
      prices: true,
      images: { orderBy: (t, { asc }) => [asc(t.position)] },
      variants: { orderBy: (t, { asc }) => [asc(t.position)] },
      components: {
        orderBy: (t, { asc }) => [asc(t.position)],
        with: { component: { with: { variants: { orderBy: (t, { asc }) => [asc(t.position)] } } } },
      },
    },
  });

  const result: CatalogProduct[] = [];
  for (const p of rows) {
    const price = p.prices.find((pr) => pr.market === market && pr.available);
    if (!price) continue; // not sold in this market
    const variants: CatalogVariant[] = p.variants.map((v) => ({ ...v }));
    const components: CatalogComponent[] = p.components.map((c) => ({
      productId: c.component.id,
      slug: c.component.slug,
      title: c.component.title,
      label: c.label,
      isListed: c.component.isListed && c.component.status === "active",
      status: c.component.status,
      variants: c.component.variants.map((v) => ({ ...v })),
    }));

    let colours: { name: string; hex: string }[];
    let sizes: string[];
    let available: boolean;
    if (p.type === "set") {
      const names = setColours(components);
      colours = names.map((name) => ({
        name,
        hex: components[0]?.variants.find((v) => v.color === name)?.colorHex ?? "#111111",
      }));
      sizes = sortSizes([...new Set(components.flatMap((c) => c.variants.filter((v) => v.active).map((v) => v.size)))]);
      available =
        components.length > 0 && components.every((c) => c.status === "active") && names.some((n) => setAvailableInColour(components, n));
    } else {
      const active = variants.filter((v) => v.active);
      const seen = new Map<string, string>();
      for (const v of active) if (!seen.has(v.color)) seen.set(v.color, v.colorHex);
      colours = [...seen].map(([name, hex]) => ({ name, hex }));
      sizes = sortSizes([...new Set(active.map((v) => v.size))]);
      available = active.some(variantInStock);
    }

    result.push({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      fitNotes: p.fitNotes,
      fabric: p.fabric,
      care: p.care,
      modelInfo: p.modelInfo,
      measurements: p.measurements,
      type: p.type,
      categoryId: p.categoryId,
      categorySlug: p.category?.slug ?? null,
      categoryName: p.category?.name ?? null,
      tags: p.tags,
      isListed: p.isListed,
      isFeatured: p.isFeatured,
      isNewArrival: p.isNewArrival,
      isDemo: p.isDemo,
      salesCount: p.salesCount,
      publishedAt: p.publishedAt,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      price: price.amount,
      compareAt: price.compareAt && price.compareAt > price.amount ? price.compareAt : null,
      images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, color: i.color, isDemo: i.isDemo })),
      variants,
      components,
      colours,
      sizes,
      available,
    });
  }
  return result;
}

/**
 * Catalogue for browsing pages (listings, product pages, search, menus): cached across requests
 * and refreshed on admin saves, plus every 60s so stock levels from new orders show up.
 */
export const loadCatalog = cache(storeCached(buildCatalog, "catalog", 60));

/** Uncached catalogue for cart pricing and checkout, which must always see current prices and stock. */
export const loadCatalogFresh = cache(buildCatalog);

/** Units in stock: sum of active variants; for sets, how many complete sets the pieces allow. */
export function availableUnits(p: CatalogProduct) {
  if (p.type === "set") {
    if (!p.components.length) return 0;
    return p.colours.reduce((total, colour) => {
      const perPiece = p.components.map((c) =>
        c.variants.filter((v) => v.active && v.color === colour.name).reduce((n, v) => n + Math.max(0, v.stock), 0),
      );
      return total + Math.min(...perPiece);
    }, 0);
  }
  return p.variants.filter((v) => v.active).reduce((n, v) => n + Math.max(0, v.stock), 0);
}

export function toCard(p: CatalogProduct): ProductCardData {
  const badges: ProductCardData["badges"] = [];
  if (!p.available) badges.push("Sold out");
  else if (p.compareAt) badges.push("Sale");
  if (p.isNewArrival) badges.push("New");
  if (p.type === "set") badges.push("Set");
  const first = p.images[0] ?? null;
  const firstColour = first?.color;
  const hover = p.images.find((i, idx) => idx > 0 && (firstColour ? i.color === firstColour : true)) ?? p.images[1] ?? null;
  const activeVariants = p.variants.filter((v) => v.active);
  const single = p.type === "standard" && activeVariants.length === 1 ? activeVariants[0].id : null;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    price: p.price,
    compareAt: p.compareAt,
    image: first,
    hoverImage: hover,
    colours: p.colours,
    badges,
    available: p.available,
    isSet: p.type === "set",
    requiresSelection: !single,
    singleVariantId: single,
    stock: availableUnits(p),
  };
}

/* ───────────── Listings, filters & facets ───────────── */

export type SortKey = "featured" | "newest" | "best_selling" | "price_asc" | "price_desc";
export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "best_selling", label: "Best selling" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export type ListingFilters = {
  sizes?: string[];
  colours?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  inStock?: boolean;
  productType?: "set" | "piece" | null;
  categorySlugs?: string[];
};

export type Facets = {
  sizes: string[];
  colours: { name: string; hex: string }[];
  categories: { slug: string; name: string }[];
  price: { min: number; max: number };
  hasTypes: boolean;
};

export const PAGE_SIZE = 12;

function matchesSize(p: CatalogProduct, sizes: string[]) {
  if (p.type === "set") {
    return p.components.some((c) => c.variants.some((v) => sizes.includes(v.size) && variantInStock(v)));
  }
  return p.variants.some((v) => sizes.includes(v.size) && variantInStock(v));
}

export function applyFilters(items: CatalogProduct[], f: ListingFilters) {
  return items.filter((p) => {
    if (f.categorySlugs?.length && !f.categorySlugs.includes(p.categorySlug ?? "")) return false;
    if (f.sizes?.length && !matchesSize(p, f.sizes)) return false;
    if (f.colours?.length && !p.colours.some((c) => f.colours!.includes(c.name))) return false;
    if (f.minPrice != null && p.price < f.minPrice) return false;
    if (f.maxPrice != null && p.price > f.maxPrice) return false;
    if (f.inStock && !p.available) return false;
    if (f.productType === "set" && p.type !== "set") return false;
    if (f.productType === "piece" && p.type === "set") return false;
    return true;
  });
}

export function sortProducts(items: CatalogProduct[], sort: SortKey) {
  const time = (p: CatalogProduct) => p.publishedAt?.getTime() ?? 0;
  const sorted = [...items];
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => time(b) - time(a));
    case "best_selling":
      return sorted.sort((a, b) => b.salesCount - a.salesCount);
    case "price_asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price_desc":
      return sorted.sort((a, b) => b.price - a.price);
    default:
      return sorted.sort(
        (a, b) =>
          Number(b.isFeatured) - Number(a.isFeatured) ||
          Number(b.available) - Number(a.available) ||
          time(b) - time(a),
      );
  }
}

export function computeFacets(items: CatalogProduct[]): Facets {
  const colourMap = new Map<string, string>();
  const catMap = new Map<string, string>();
  for (const p of items) {
    for (const c of p.colours) if (!colourMap.has(c.name)) colourMap.set(c.name, c.hex);
    if (p.categorySlug && p.categoryName) catMap.set(p.categorySlug, p.categoryName);
  }
  const prices = items.map((p) => p.price);
  return {
    sizes: sortSizes([...new Set(items.flatMap((p) => p.sizes))]),
    colours: [...colourMap].map(([name, hex]) => ({ name, hex })),
    categories: [...catMap].map(([slug, name]) => ({ slug, name })),
    price: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 },
    hasTypes: items.some((p) => p.type === "set") && items.some((p) => p.type !== "set"),
  };
}

export function parseListingParams(sp: Record<string, string | string[] | undefined>) {
  const list = (key: string) => {
    const v = sp[key];
    const raw = Array.isArray(v) ? v.join(",") : (v ?? "");
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);
  };
  const num = (key: string) => {
    const v = Array.isArray(sp[key]) ? sp[key]![0] : sp[key];
    if (!v || !/^\d{1,7}$/.test(v)) return null;
    return Number(v) * 100;
  };
  const sortRaw = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort) as SortKey | undefined;
  const sort = SORT_OPTIONS.some((o) => o.value === sortRaw) ? sortRaw! : "featured";
  const pageRaw = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page);
  const page = Number.isInteger(pageRaw) && pageRaw > 0 && pageRaw < 100 ? pageRaw : 1;
  const typeRaw = Array.isArray(sp.type) ? sp.type[0] : sp.type;
  const filters: ListingFilters = {
    sizes: list("size"),
    colours: list("colour"),
    categorySlugs: list("category"),
    minPrice: num("min"),
    maxPrice: num("max"),
    inStock: sp.stock === "1",
    productType: typeRaw === "set" || typeRaw === "piece" ? typeRaw : null,
  };
  return { filters, sort, page };
}

export async function getListing(opts: {
  market: MarketCode;
  scope: (p: CatalogProduct) => boolean;
  filters: ListingFilters;
  sort: SortKey;
  page: number;
}) {
  const catalog = await loadCatalog(opts.market);
  const base = catalog.filter((p) => p.isListed && opts.scope(p));
  const facets = computeFacets(base);
  const filtered = sortProducts(applyFilters(base, opts.filters), opts.sort);
  const visible = filtered.slice(0, opts.page * PAGE_SIZE);
  return {
    items: visible.map(toCard),
    total: filtered.length,
    baseTotal: base.length,
    hasMore: filtered.length > visible.length,
    facets,
  };
}

/* ───────────── Categories ───────────── */

export const getCategories = cache(
  storeCached(async () => {
    const db = await getDb();
    const rows = await db.select().from(categories).where(eq(categories.visible, true)).orderBy(asc(categories.position));
    if (!rows.length) return rows;

    const images = await db
      .select({ categoryId: products.categoryId, url: productImages.url })
      .from(products)
      .innerJoin(productImages, eq(productImages.productId, products.id))
      .where(
        and(
          inArray(products.categoryId, rows.map((category) => category.id)),
          eq(products.status, "active"),
          eq(products.isListed, true),
          eq(products.isDemo, false),
          eq(productImages.isDemo, false),
        ),
      )
      .orderBy(asc(products.createdAt), asc(products.id), asc(productImages.position));

    const firstProductImage = new Map<string, string>();
    for (const image of images) {
      if (image.categoryId && !firstProductImage.has(image.categoryId)) {
        firstProductImage.set(image.categoryId, image.url);
      }
    }

    return rows.map((category) => ({
      ...category,
      image:
        firstProductImage.get(category.id) ??
        (category.image.startsWith("/images/demo/") ? "" : category.image),
    }));
  }, "categories"),
);

export async function getCategoryBySlug(slug: string) {
  const all = await getCategories();
  return all.find((c) => c.slug === slug) ?? null;
}

/* ───────────── Collections ───────────── */

export function collectionIsLive(c: { visible: boolean; publishAt: Date | null; unpublishAt: Date | null }, now = new Date()) {
  if (!c.visible) return false;
  if (c.publishAt && c.publishAt > now) return false;
  if (c.unpublishAt && c.unpublishAt <= now) return false;
  return true;
}

export function productMatchesRules(p: CatalogProduct, rules: CollectionRules) {
  const checks: boolean[] = [];
  if (rules.categoryIds?.length) checks.push(!!p.categoryId && rules.categoryIds.includes(p.categoryId));
  if (rules.tags?.length) checks.push(p.tags.some((t) => rules.tags!.includes(t)));
  if (rules.newArrivals) checks.push(p.isNewArrival);
  if (rules.onSale) checks.push(p.compareAt != null);
  if (rules.featured) checks.push(p.isFeatured);
  return checks.length > 0 && checks.every(Boolean);
}

const collectionRows = storeCached(async () => {
  const db = await getDb();
  const [rows, manual] = await Promise.all([
    db.select().from(collections).orderBy(asc(collections.position)),
    db.select().from(collectionProducts).orderBy(asc(collectionProducts.position)),
  ]);
  return { rows, manual };
}, "collections");

/** `live` is worked out per request so scheduled publish/unpublish times apply on time. */
export const getCollectionsWithMembers = cache(async (market: MarketCode) => {
  const [{ rows, manual }, catalog] = await Promise.all([collectionRows(), loadCatalog(market)]);
  return rows.map((c) => {
    const productIds =
      c.mode === "manual"
        ? manual.filter((m) => m.collectionId === c.id).map((m) => m.productId)
        : catalog.filter((p) => productMatchesRules(p, c.rules)).map((p) => p.id);
    return { ...c, productIds, live: collectionIsLive(c) };
  });
});

export async function getLiveCollections(market: MarketCode) {
  return (await getCollectionsWithMembers(market)).filter((c) => c.live);
}

export async function getCollectionBySlug(slug: string, market: MarketCode) {
  const all = await getCollectionsWithMembers(market);
  const c = all.find((x) => x.slug === slug);
  return c && c.live ? c : null;
}

/** productId → ids of collections containing it (used for collection-scoped discounts). */
export async function collectionMembership(market: MarketCode) {
  const all = await getCollectionsWithMembers(market);
  const map = new Map<string, string[]>();
  for (const c of all) for (const pid of c.productIds) map.set(pid, [...(map.get(pid) ?? []), c.id]);
  return map;
}

/* ───────────── Product detail ───────────── */

export async function getProductBySlug(slug: string, market: MarketCode) {
  const catalog = await loadCatalog(market);
  const product = catalog.find((p) => p.slug === slug && p.isListed);
  return product ?? null;
}

/** Resolves an old product slug to its current slug (for 308 redirects after renames). */
export async function resolveRedirectSlug(slug: string) {
  const db = await getDb();
  const [row] = await db
    .select({ slug: products.slug })
    .from(slugRedirects)
    .innerJoin(products, eq(products.id, slugRedirects.productId))
    .where(eq(slugRedirects.fromSlug, slug))
    .limit(1);
  return row?.slug ?? null;
}

export async function getRelatedProducts(product: CatalogProduct, market: MarketCode, limit = 4) {
  const catalog = await loadCatalog(market);
  const pool = catalog.filter((p) => p.isListed && p.id !== product.id);
  const same = pool.filter((p) => p.categoryId === product.categoryId);
  const tagged = pool.filter((p) => p.categoryId !== product.categoryId && p.tags.some((t) => product.tags.includes(t)));
  return [...same, ...tagged].slice(0, limit).map(toCard);
}

/** "Complete the set" links: sets containing this piece, or listed pieces of this set. */
export async function getSetRelations(product: CatalogProduct, market: MarketCode) {
  const catalog = await loadCatalog(market);
  if (product.type === "set") {
    const pieces = product.components
      .filter((c) => c.isListed)
      .map((c) => catalog.find((p) => p.id === c.productId && p.isListed))
      .filter((p): p is CatalogProduct => !!p)
      .map(toCard);
    return { sets: [], pieces };
  }
  const sets = catalog
    .filter((p) => p.type === "set" && p.isListed && p.components.some((c) => c.productId === product.id))
    .map(toCard);
  const siblingIds = new Set(
    catalog
      .filter((p) => p.type === "set" && p.components.some((c) => c.productId === product.id))
      .flatMap((p) => p.components.map((c) => c.productId)),
  );
  siblingIds.delete(product.id);
  const pieces = catalog.filter((p) => siblingIds.has(p.id) && p.isListed).map(toCard);
  return { sets, pieces };
}

export const getProductReviews = storeCached(async (productId: string) => {
  const db = await getDb();
  const rows = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, "approved")))
    .orderBy(desc(reviews.createdAt));
  const count = rows.length;
  const average = count ? rows.reduce((s, r) => s + r.rating, 0) / count : 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({ star, count: rows.filter((r) => r.rating === star).length }));
  return { reviews: rows, count, average, distribution };
}, "reviews");

export async function getCardsByIds(ids: string[], market: MarketCode) {
  const catalog = await loadCatalog(market);
  return ids
    .map((id) => catalog.find((p) => p.id === id && p.isListed))
    .filter((p): p is CatalogProduct => !!p)
    .map(toCard);
}

/* ───────────── Search ───────────── */

export async function searchProducts(query: string, market: MarketCode) {
  const q = query.trim().toLowerCase().slice(0, 80);
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const catalog = await loadCatalog(market);
  const scored = catalog
    .filter((p) => p.isListed)
    .map((p) => {
      const title = p.title.toLowerCase();
      const hay = [
        title,
        p.description.toLowerCase(),
        (p.categoryName ?? "").toLowerCase(),
        p.tags.join(" ").toLowerCase(),
        p.variants.map((v) => v.sku.toLowerCase()).join(" "),
        p.colours.map((c) => c.name.toLowerCase()).join(" "),
      ].join(" ");
      if (!tokens.every((t) => hay.includes(t))) return null;
      let score = 0;
      for (const t of tokens) {
        if (title.includes(t)) score += 5;
        if ((p.categoryName ?? "").toLowerCase().includes(t)) score += 3;
        if (p.tags.some((tag) => tag.includes(t))) score += 2;
        if (p.variants.some((v) => v.sku.toLowerCase() === t)) score += 10;
      }
      return { p, score };
    })
    .filter((x): x is { p: CatalogProduct; score: number } => !!x)
    .sort((a, b) => b.score - a.score || b.p.salesCount - a.p.salesCount);
  return scored.map((x) => x.p);
}

export async function getProductsByIdsRaw(ids: string[]) {
  if (!ids.length) return [];
  const db = await getDb();
  return db.select().from(products).where(inArray(products.id, ids));
}
