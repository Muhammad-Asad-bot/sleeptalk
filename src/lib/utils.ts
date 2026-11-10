import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function absoluteUrl(path = "/") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Phone number as a `tel:` target: digits with a leading "+", e.g. "+1 (647) 512-6054" → "+16475126054". */
export function telHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return phone.trim().startsWith("+") ? `+${digits}` : digits;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "26", "28", "30", "32", "34", "36", "38", "40", "ONE SIZE"];

export function sortSizes(sizes: string[]) {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a.toUpperCase());
    const ib = SIZE_ORDER.indexOf(b.toUpperCase());
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export function formatDate(date: Date | string | null | undefined, locale = "en-GB") {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined, locale = "en-GB") {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * A colour's swatch value is one hex ("#141414") or an upper/lower pair for two-tone
 * garments ("#E8E0D0,#141414" = cream upper, black lower).
 */
export function splitHex(value: string): [string, string | null] {
  const [upper, lower] = value.split(",").map((s) => s.trim());
  return [upper || "#111111", lower || null];
}

/** CSS background for a colour swatch: solid, or top/bottom halves for two-tone colours. */
export function swatchBackground(value: string) {
  const [upper, lower] = splitHex(value);
  return lower ? `linear-gradient(180deg, ${upper} 50%, ${lower} 50%)` : upper;
}
