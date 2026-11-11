import { z } from "zod";
import type { MarketCode } from "@/lib/markets";

/**
 * What the browser stores for the bag. It never contains prices — the server re-prices every
 * line from the database for the active market (see lib/server/cart.ts).
 */
export const cartLineSchema = z.object({
  productId: z.string().min(1).max(64),
  variantId: z.string().min(1).max(64).optional(),
  /** Tracksuit sets: one chosen variant per component, in component order */
  componentVariantIds: z.array(z.string().min(1).max(64)).max(6).optional(),
  quantity: z.number().int().min(1).max(20),
});
export type CartLineInput = z.infer<typeof cartLineSchema>;

export const cartQuoteSchema = z.object({
  lines: z.array(cartLineSchema).max(50),
  discountCode: z.string().trim().max(40).optional().nullable(),
  shippingRateId: z.string().max(64).optional().nullable(),
});

export function cartLineKey(line: Pick<CartLineInput, "productId" | "variantId" | "componentVariantIds">) {
  return `${line.productId}:${line.variantId ?? (line.componentVariantIds ?? []).join("+")}`;
}

export type QuoteIssue = "unavailable" | "out_of_stock" | "insufficient_stock" | "invalid_selection";

export type QuoteComponent = {
  variantId: string;
  productId: string;
  label: string;
  title: string;
  sku: string;
  size: string;
  color: string;
  /** "standard" | "oversized" (absent on orders placed before fits existed) */
  fit?: string;
};

export type QuoteLine = {
  key: string;
  productId: string;
  variantId: string | null;
  componentVariantIds: string[];
  slug: string;
  title: string;
  image: string | null;
  imageAlt: string;
  variantLabel: string;
  sku: string;
  isSet: boolean;
  unitPrice: number;
  compareAt: number | null;
  requestedQuantity: number;
  quantity: number;
  maxQuantity: number;
  lineTotal: number;
  issue: QuoteIssue | null;
  components: QuoteComponent[];
  categoryId: string | null;
};

export type QuoteShippingOption = {
  id: string;
  name: string;
  description: string;
  price: number;
  basePrice: number;
  freeOver: number | null;
  estimate: string | null;
};

export type CartQuote = {
  market: MarketCode;
  currency: string;
  lines: QuoteLine[];
  itemCount: number;
  subtotal: number;
  discount: { code: string; amount: number; error: string | null } | null;
  shippingOptions: QuoteShippingOption[];
  selectedShippingId: string | null;
  shippingTotal: number | null;
  taxTotal: number;
  taxNote: string;
  total: number;
  hasIssues: boolean;
};
