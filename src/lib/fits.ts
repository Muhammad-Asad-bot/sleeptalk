/** Garment fits a variant can be made in. Each fit is its own variant (own stock and SKU). */
export const FIT_CODES = ["standard", "oversized"] as const;
export type FitCode = (typeof FIT_CODES)[number];

export const FIT_LABEL: Record<FitCode, string> = { standard: "Standard", oversized: "Oversized" };
export const FIT_HINT: Record<FitCode, string> = {
  standard: "Relaxed everyday fit. Take your usual size.",
  oversized: "Wider body, dropped shoulder and extra length.",
};

export function isFit(v: unknown): v is FitCode {
  return typeof v === "string" && (FIT_CODES as readonly string[]).includes(v);
}

/** Fits present in a list of variants, in display order. */
export function fitsOf(variants: { fit: string }[]): FitCode[] {
  return FIT_CODES.filter((f) => variants.some((v) => v.fit === f));
}

/** "Black / M", or "Black / Oversized / M" when the product is sold in more than one fit. */
export function variantLabel(v: { color: string; size: string; fit: string }, showFit: boolean) {
  return showFit && isFit(v.fit) ? `${v.color} / ${FIT_LABEL[v.fit]} / ${v.size}` : `${v.color} / ${v.size}`;
}
