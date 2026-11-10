import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";

/**
 * Cross-request cache for storefront data that is the same for every visitor (settings,
 * categories, the catalogue, content pages…). Without it every click re-ran the full set of
 * layout and page queries against the database.
 *
 *  - Everything shares one tag, so any admin save calls `refreshStorefront()` and the next
 *    page view reads fresh data.
 *  - Entries also expire after `revalidate` seconds as a safety net for changes that don't go
 *    through an admin action (stock moving as orders are placed, scheduled collections).
 *  - Cart pricing and checkout never read from this cache (see `loadCatalogFresh`).
 *
 * NOTE: unstable_cache is bypassed under `dynamic = "force-dynamic"` (force-no-store), so the
 * root layout must not set it. Store pages are still dynamic because they read cookies.
 */
export const STORE_TAG = "storefront";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

/** unstable_cache stores JSON, so Date fields come back as ISO strings; turn them back into Dates. */
function reviveDates<T>(value: T): T {
  if (typeof value === "string") return (ISO_DATE.test(value) ? new Date(value) : value) as T;
  if (Array.isArray(value)) return value.map(reviveDates) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const proto = Object.getPrototypeOf(value);
    if (proto === Object.prototype || proto === null) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) out[k] = reviveDates(v);
      return out as T;
    }
  }
  return value;
}

export function storeCached<A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string, revalidate = 300) {
  const cached = unstable_cache(fn, ["storefront", key], { tags: [STORE_TAG], revalidate });
  return async (...args: A): Promise<R> => reviveDates(await cached(...args));
}

/** Mark all cached storefront data stale. Call after any change customers can see. */
export function refreshStorefront() {
  try {
    revalidateTag(STORE_TAG, { expire: 0 });
  } catch (err) {
    // Not allowed during render; the time-based expiry still applies.
    console.warn("[storefront cache] revalidate skipped:", (err as Error).message);
  }
}
