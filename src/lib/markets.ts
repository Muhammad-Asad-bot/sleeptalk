import type { MarketCode } from "@/db/schema";

export type { MarketCode };

export type MarketInfo = {
  code: MarketCode;
  label: string;
  shortLabel: string;
  currency: "GBP" | "CAD";
  currencySymbol: string;
  locale: string;
  country: "GB" | "CA";
};

/** Launch markets. Market-specific copy, shipping and tax notes are configured in admin (markets table). */
export const MARKETS: Record<MarketCode, MarketInfo> = {
  UK: {
    code: "UK",
    label: "United Kingdom",
    shortLabel: "UK",
    currency: "GBP",
    currencySymbol: "£",
    locale: "en-GB",
    country: "GB",
  },
  CA: {
    code: "CA",
    label: "Canada",
    shortLabel: "CA",
    currency: "CAD",
    currencySymbol: "$",
    locale: "en-CA",
    country: "CA",
  },
};

export const MARKET_CODES = Object.keys(MARKETS) as MarketCode[];
export const DEFAULT_MARKET: MarketCode = "UK";
export const MARKET_COOKIE = "st_market";

export function isMarketCode(value: unknown): value is MarketCode {
  return typeof value === "string" && value in MARKETS;
}

/**
 * Format integer minor units (pence/cents) for display.
 * Rounding rule: prices are stored as exact minor units per market, so no conversion/rounding
 * happens at display time. Whole amounts drop the decimals (e.g. £45), others show 2dp.
 */
export function formatMoney(minor: number, market: MarketCode, opts: { forceDecimals?: boolean } = {}) {
  const info = MARKETS[market];
  const whole = minor % 100 === 0 && !opts.forceDecimals;
  const formatted = new Intl.NumberFormat(info.locale, {
    style: "currency",
    currency: info.currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
  // Disambiguate Canadian dollars for UK-language readers ("$80 CAD") without cluttering GBP.
  return info.currency === "CAD" ? `${formatted} CAD` : formatted;
}

/** Parse a decimal price string from an admin form ("45", "45.50") into minor units. */
export function parseMoneyInput(value: string | null | undefined): number | null {
  if (value == null) return null;
  const trimmed = String(value).trim().replace(/[£$,\s]/g, "");
  if (trimmed === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return NaN;
  const [whole, frac = ""] = trimmed.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export function minorToInput(minor: number | null | undefined) {
  if (minor == null) return "";
  return (minor / 100).toFixed(2).replace(/\.00$/, "");
}
