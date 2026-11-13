import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, products } from "@/db/schema";
import type { EditorInitial } from "@/components/admin/product-editor";
import { MARKET_CODES, minorToInput } from "@/lib/markets";
import { getMarketConfigs, getSettings } from "@/lib/server/settings";
import { isFit } from "@/lib/fits";

export async function editorOptions() {
  const db = await getDb();
  const [cats, all, marketConfigs, settings] = await Promise.all([
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.position)),
    db.select({ id: products.id, title: products.title, type: products.type }).from(products).orderBy(asc(products.title)),
    getMarketConfigs(),
    getSettings(),
  ]);
  // Only show price fields for markets the store sells in (Shipping & markets → "Selling here").
  const markets = marketConfigs.filter((m) => m.active).map((m) => m.code);
  return { categories: cats, componentOptions: all.filter((p) => p.type === "standard"), markets, colourLibrary: settings.colours.list };
}

export const EMPTY_PRODUCT: EditorInitial = {
  title: "",
  slug: "",
  description: "",
  fitNotes: "",
  fabric: "",
  care: "",
  modelInfo: "",
  measurements: "",
  categoryId: null,
  type: "standard",
  status: "draft",
  isListed: true,
  isFeatured: false,
  isNewArrival: true,
  preorder: false,
  preorderMessage: "Ships as soon as possible",
  tags: [],
  seoTitle: "",
  seoDescription: "",
  prices: Object.fromEntries(MARKET_CODES.map((m) => [m, { amount: "", compareAt: "", available: true }])),
  images: [],
  variants: [],
  components: [],
};

export async function loadEditorProduct(id: string): Promise<EditorInitial | null> {
  const db = await getDb();
  const p = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      prices: true,
      images: { orderBy: (t, { asc }) => [asc(t.position)] },
      variants: { orderBy: (t, { asc }) => [asc(t.position)] },
      components: { orderBy: (t, { asc }) => [asc(t.position)] },
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    fitNotes: p.fitNotes,
    fabric: p.fabric,
    care: p.care,
    modelInfo: p.modelInfo,
    measurements: p.measurements,
    categoryId: p.categoryId,
    type: p.type,
    status: p.status,
    isListed: p.isListed,
    isFeatured: p.isFeatured,
    isNewArrival: p.isNewArrival,
    preorder: p.preorder,
    preorderMessage: p.preorderMessage,
    tags: p.tags,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    prices: Object.fromEntries(
      MARKET_CODES.map((m) => {
        const pr = p.prices.find((x) => x.market === m);
        return [m, { amount: minorToInput(pr?.amount), compareAt: minorToInput(pr?.compareAt), available: pr?.available ?? true }];
      }),
    ),
    images: p.images.map((i) => ({ url: i.url, alt: i.alt, color: i.color })),
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      color: v.color,
      colorHex: v.colorHex,
      size: v.size,
      fit: isFit(v.fit) ? v.fit : "standard",
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold,
      allowBackorder: v.allowBackorder,
      active: v.active,
    })),
    components: p.components.map((c) => ({ productId: c.componentProductId, label: c.label })),
  };
}
