import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { discounts } from "@/db/schema";
import { MARKETS, type MarketCode } from "@/lib/markets";
import {
  allocateStock,
  computeTotals,
  type DiscountRule,
  type PricingLine,
  type ShippingOption,
} from "@/lib/pricing";
import { cartLineKey, type CartLineInput, type CartQuote, type QuoteComponent, type QuoteLine } from "@/lib/cart-types";
import { collectionMembership, loadCatalogFresh, type CatalogProduct } from "./catalog";
import { getMarketConfig, getShippingRates } from "./settings";
import { FIT_LABEL, fitsOf, isFit, variantLabel } from "@/lib/fits";

export async function findDiscount(code: string | null | undefined): Promise<DiscountRule | null> {
  const normalized = code?.trim().toUpperCase();
  if (!normalized) return null;
  const db = await getDb();
  const [row] = await db.select().from(discounts).where(eq(discounts.code, normalized)).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    percentOff: row.percentOff,
    amountOff: row.amountOff,
    minSpend: row.minSpend,
    markets: row.markets,
    scope: row.scope,
    targetIds: row.targetIds,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    usageLimit: row.usageLimit,
    usageCount: row.usageCount,
    active: row.active,
  };
}

function imageFor(product: CatalogProduct, colour: string | null) {
  return (colour && product.images.find((i) => i.color === colour)) || product.images[0] || null;
}

function estimateText(minDays: number | null, maxDays: number | null) {
  if (minDays == null || maxDays == null) return null;
  return minDays === maxDays ? `${minDays} business days` : `${minDays}–${maxDays} business days`;
}

/**
 * Re-prices a bag from the database. Every amount the shopper sees and pays is derived here;
 * nothing price-related is trusted from the browser.
 */
export async function resolveCart(input: {
  lines: CartLineInput[];
  market: MarketCode;
  discountCode?: string | null;
  shippingRateId?: string | null;
}): Promise<CartQuote> {
  const [catalog, membership, rates, marketConfig] = await Promise.all([
    loadCatalogFresh(input.market),
    collectionMembership(input.market),
    getShippingRates(input.market),
    getMarketConfig(input.market),
  ]);

  // Merge duplicate lines (same product/variant selection)
  const merged = new Map<string, CartLineInput>();
  for (const line of input.lines) {
    const key = cartLineKey(line);
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, quantity: Math.min(20, prev.quantity + line.quantity) } : line);
  }

  type Draft = QuoteLine & { demand: { variantId: string; perUnit: number }[] };
  const drafts: Draft[] = [];
  const stockPool = new Map<string, { stock: number; allowBackorder: boolean }>();

  for (const [key, line] of merged) {
    const product = catalog.find((p) => p.id === line.productId);
    const base: Draft = {
      key,
      productId: line.productId,
      variantId: line.variantId ?? null,
      componentVariantIds: line.componentVariantIds ?? [],
      slug: product?.slug ?? "",
      title: product?.title ?? "Unavailable item",
      image: null,
      imageAlt: "",
      variantLabel: "",
      sku: "",
      isSet: product?.type === "set",
      unitPrice: product?.price ?? 0,
      compareAt: product?.compareAt ?? null,
      requestedQuantity: line.quantity,
      quantity: 0,
      maxQuantity: 0,
      lineTotal: 0,
      issue: null,
      components: [],
      categoryId: product?.categoryId ?? null,
      demand: [],
    };
    if (!product) {
      drafts.push({ ...base, issue: "unavailable" });
      continue;
    }

    if (product.type === "set") {
      const chosen = line.componentVariantIds ?? [];
      if (chosen.length !== product.components.length) {
        drafts.push({ ...base, issue: "invalid_selection" });
        continue;
      }
      const comps: QuoteComponent[] = [];
      let invalid = false;
      let colour: string | null = null;
      let fit: string | null = null;
      product.components.forEach((component, idx) => {
        const v = component.variants.find((x) => x.id === chosen[idx] && x.active);
        if (!v) {
          invalid = true;
          return;
        }
        if (colour && v.color !== colour) invalid = true; // a set is bought in one colourway
        if (fit && v.fit !== fit) invalid = true; // ...and one fit (jacket and pants match)
        colour = v.color;
        fit = v.fit;
        comps.push({
          variantId: v.id,
          productId: component.productId,
          label: component.label,
          title: component.title,
          sku: v.sku,
          size: v.size,
          color: v.color,
          fit: v.fit,
        });
        stockPool.set(v.id, { stock: v.stock, allowBackorder: v.allowBackorder });
      });
      if (invalid) {
        drafts.push({ ...base, issue: "invalid_selection" });
        continue;
      }
      const img = imageFor(product, colour);
      drafts.push({
        ...base,
        image: img?.url ?? null,
        imageAlt: img?.alt ?? product.title,
        variantLabel: [
          colour,
          // Name the fit when the set is sold in more than one.
          ...(isFit(fit) && fitsOf(product.components.flatMap((c) => c.variants.filter((x) => x.active))).length > 1 ? [FIT_LABEL[fit]] : []),
          ...comps.map((c) => `${c.label} ${c.size}`),
        ].join(" / "),
        sku: comps.map((c) => c.sku).join(" + "),
        components: comps,
        demand: comps.map((c) => ({ variantId: c.variantId, perUnit: 1 })),
      });
    } else {
      const v = product.variants.find((x) => x.id === line.variantId && x.active);
      if (!v) {
        drafts.push({ ...base, issue: "invalid_selection" });
        continue;
      }
      stockPool.set(v.id, { stock: v.stock, allowBackorder: v.allowBackorder });
      const img = imageFor(product, v.color);
      drafts.push({
        ...base,
        image: img?.url ?? null,
        imageAlt: img?.alt ?? product.title,
        variantLabel: variantLabel(v, fitsOf(product.variants.filter((x) => x.active)).length > 1),
        sku: v.sku,
        demand: [{ variantId: v.id, perUnit: 1 }],
      });
    }
  }

  // Allocate stock across lines that may share variants
  const allocation = allocateStock(
    drafts.filter((d) => !d.issue).map((d) => ({ key: d.key, quantity: d.requestedQuantity, demand: d.demand })),
    stockPool,
  );
  for (const d of drafts) {
    if (d.issue) continue;
    const a = allocation.get(d.key)!;
    d.maxQuantity = a.maxQuantity;
    d.quantity = a.allocated;
    if (a.allocated === 0) d.issue = "out_of_stock";
    else if (a.allocated < d.requestedQuantity) d.issue = "insufficient_stock";
    d.lineTotal = d.unitPrice * d.quantity;
  }

  const pricing: PricingLine[] = drafts
    .filter((d) => d.quantity > 0)
    .map((d) => ({
      key: d.key,
      productId: d.productId,
      categoryId: d.categoryId,
      collectionIds: membership.get(d.productId) ?? [],
      unitPrice: d.unitPrice,
      quantity: d.quantity,
    }));

  const discountRule = await findDiscount(input.discountCode);
  const shippingOptions: ShippingOption[] = rates.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    price: r.price,
    freeOver: r.freeOver,
    minDays: r.minDays,
    maxDays: r.maxDays,
  }));
  const selected = shippingOptions.find((o) => o.id === input.shippingRateId) ?? shippingOptions[0] ?? null;

  const totals = computeTotals({ lines: pricing, market: input.market, discount: discountRule, shipping: selected });
  const merchandise = totals.subtotal - totals.discountTotal;

  return {
    market: input.market,
    currency: MARKETS[input.market].currency,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip internal stock demand before returning
    lines: drafts.map(({ demand: _demand, ...rest }) => rest),
    itemCount: drafts.reduce((n, d) => n + d.quantity, 0),
    subtotal: totals.subtotal,
    discount: input.discountCode?.trim()
      ? {
          code: input.discountCode.trim().toUpperCase(),
          amount: totals.discountTotal,
          error: discountRule ? totals.discountError : "This code isn't recognised.",
        }
      : null,
    shippingOptions: shippingOptions.map((o) => ({
      id: o.id,
      name: o.name,
      description: o.description,
      basePrice: o.price,
      price: o.freeOver != null && merchandise >= o.freeOver ? 0 : o.price,
      freeOver: o.freeOver,
      estimate: estimateText(o.minDays, o.maxDays),
    })),
    selectedShippingId: selected?.id ?? null,
    shippingTotal: pricing.length ? totals.shippingTotal : 0,
    taxTotal: totals.taxTotal,
    taxNote: marketConfig?.taxNote || "Taxes and duties to be confirmed.",
    total: pricing.length ? totals.total : 0,
    hasIssues: drafts.some((d) => d.issue),
  };
}
