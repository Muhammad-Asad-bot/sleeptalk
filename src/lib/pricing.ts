/**
 * Pure pricing functions (no I/O) shared by the cart quote and order creation.
 * All amounts are integer minor units in the market's currency.
 */
import type { MarketCode } from "@/lib/markets";

export type PricingLine = {
  key: string;
  productId: string;
  categoryId: string | null;
  collectionIds: string[];
  unitPrice: number;
  quantity: number;
};

export type DiscountRule = {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  percentOff: number | null;
  amountOff: Partial<Record<MarketCode, number>>;
  minSpend: Partial<Record<MarketCode, number>>;
  markets: MarketCode[];
  scope: "all" | "categories" | "collections" | "products";
  targetIds: string[];
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usageCount: number;
  active: boolean;
};

export type ShippingOption = {
  id: string;
  name: string;
  description: string;
  price: number;
  freeOver: number | null;
  minDays: number | null;
  maxDays: number | null;
};

export type DiscountResult =
  | { ok: true; amount: number; eligibleSubtotal: number }
  | { ok: false; reason: string };

export function lineTotal(line: Pick<PricingLine, "unitPrice" | "quantity">) {
  return line.unitPrice * line.quantity;
}

export function subtotalOf(lines: Pick<PricingLine, "unitPrice" | "quantity">[]) {
  return lines.reduce((sum, l) => sum + lineTotal(l), 0);
}

function lineEligible(rule: DiscountRule, line: PricingLine) {
  switch (rule.scope) {
    case "all":
      return true;
    case "categories":
      return line.categoryId != null && rule.targetIds.includes(line.categoryId);
    case "collections":
      return line.collectionIds.some((id) => rule.targetIds.includes(id));
    case "products":
      return rule.targetIds.includes(line.productId);
  }
}

export function evaluateDiscount(
  rule: DiscountRule,
  lines: PricingLine[],
  market: MarketCode,
  now: Date = new Date(),
): DiscountResult {
  if (!rule.active) return { ok: false, reason: "This code is not active." };
  if (rule.startsAt && now < rule.startsAt) return { ok: false, reason: "This code is not active yet." };
  if (rule.endsAt && now > rule.endsAt) return { ok: false, reason: "This code has expired." };
  if (rule.usageLimit != null && rule.usageCount >= rule.usageLimit)
    return { ok: false, reason: "This code has reached its usage limit." };
  if (rule.markets.length > 0 && !rule.markets.includes(market))
    return { ok: false, reason: "This code isn't valid in your selected country." };

  const subtotal = subtotalOf(lines);
  const minSpend = rule.minSpend[market];
  if (minSpend != null && subtotal < minSpend) return { ok: false, reason: "Your bag doesn't meet the minimum spend for this code." };

  const eligibleSubtotal = subtotalOf(lines.filter((l) => lineEligible(rule, l)));
  if (eligibleSubtotal <= 0) return { ok: false, reason: "This code doesn't apply to the items in your bag." };

  let amount = 0;
  if (rule.type === "percentage") {
    const pct = Math.min(100, Math.max(0, rule.percentOff ?? 0));
    amount = Math.floor((eligibleSubtotal * pct) / 100);
  } else {
    const fixed = rule.amountOff[market];
    if (fixed == null) return { ok: false, reason: "This code isn't valid in your selected country." };
    amount = Math.min(fixed, eligibleSubtotal);
  }
  if (amount <= 0) return { ok: false, reason: "This code doesn't apply to the items in your bag." };
  return { ok: true, amount, eligibleSubtotal };
}

export function shippingCost(option: ShippingOption, merchandiseTotal: number) {
  if (option.freeOver != null && merchandiseTotal >= option.freeOver) return 0;
  return option.price;
}

export type Totals = {
  subtotal: number;
  discountTotal: number;
  discountError: string | null;
  shippingTotal: number | null;
  /** Taxes/duties are not calculated until the client confirms market/provider rules. */
  taxTotal: number;
  total: number;
};

export function computeTotals(input: {
  lines: PricingLine[];
  market: MarketCode;
  discount?: DiscountRule | null;
  shipping?: ShippingOption | null;
  now?: Date;
}): Totals {
  const subtotal = subtotalOf(input.lines);
  let discountTotal = 0;
  let discountError: string | null = null;
  if (input.discount) {
    const result = evaluateDiscount(input.discount, input.lines, input.market, input.now);
    if (result.ok) discountTotal = result.amount;
    else discountError = result.reason;
  }
  const merchandise = subtotal - discountTotal;
  const shippingTotal = input.shipping ? shippingCost(input.shipping, merchandise) : null;
  const taxTotal = 0;
  return {
    subtotal,
    discountTotal,
    discountError,
    shippingTotal,
    taxTotal,
    total: merchandise + (shippingTotal ?? 0) + taxTotal,
  };
}

/**
 * Allocates available stock across cart lines in order. Multiple lines can draw on the same
 * variant (e.g. a tracksuit set and the same jacket bought separately), so availability is
 * computed against a shared pool.
 */
export function allocateStock(
  lines: { key: string; quantity: number; demand: { variantId: string; perUnit: number }[] }[],
  stock: Map<string, { stock: number; allowBackorder: boolean }>,
) {
  const remaining = new Map<string, number>();
  for (const [id, v] of stock) remaining.set(id, v.allowBackorder ? Number.POSITIVE_INFINITY : Math.max(0, v.stock));
  const result = new Map<string, { maxQuantity: number; allocated: number }>();
  for (const line of lines) {
    let max = Number.POSITIVE_INFINITY;
    for (const d of line.demand) {
      const r = remaining.get(d.variantId) ?? 0;
      max = Math.min(max, Math.floor(r / d.perUnit));
    }
    if (!Number.isFinite(max)) max = 99;
    const allocated = Math.min(line.quantity, max);
    for (const d of line.demand) {
      const r = remaining.get(d.variantId) ?? 0;
      remaining.set(d.variantId, r - allocated * d.perUnit);
    }
    result.set(line.key, { maxQuantity: Math.min(max, 99), allocated });
  }
  return result;
}
