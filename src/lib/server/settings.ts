import "server-only";
import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { homeSections, markets, pages, settings, shippingRates } from "@/db/schema";
import { DEFAULT_SETTINGS, type SettingsMap } from "@/content/defaults";
import type { MarketCode } from "@/lib/markets";

export const getSettings = cache(async (): Promise<SettingsMap> => {
  const db = await getDb();
  const rows = await db.select().from(settings);
  const merged = structuredClone(DEFAULT_SETTINGS) as SettingsMap;
  for (const row of rows) {
    const key = row.key as keyof SettingsMap;
    if (key in merged) {
      (merged as Record<string, unknown>)[key] = { ...merged[key], ...(row.value as object) };
    }
  }
  return merged;
});

export async function saveSetting<K extends keyof SettingsMap>(key: K, value: SettingsMap[K]) {
  const db = await getDb();
  await db
    .insert(settings)
    .values({ key, value: value as unknown as Record<string, unknown> })
    .onConflictDoUpdate({ target: settings.key, set: { value: value as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

export const getMarketConfigs = cache(async () => {
  const db = await getDb();
  return db.select().from(markets).orderBy(asc(markets.code));
});

export const getMarketConfig = cache(async (code: MarketCode) => {
  const all = await getMarketConfigs();
  return all.find((m) => m.code === code) ?? null;
});

export const getShippingRates = cache(async (market: MarketCode) => {
  const db = await getDb();
  const rows = await db
    .select()
    .from(shippingRates)
    .where(eq(shippingRates.market, market))
    .orderBy(asc(shippingRates.position));
  return rows.filter((r) => r.active);
});

export const getPage = cache(async (slug: string) => {
  const db = await getDb();
  const [page] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
  return page ?? null;
});

export const getHomeSections = cache(async () => {
  const db = await getDb();
  const rows = await db.select().from(homeSections).orderBy(asc(homeSections.position));
  return rows.filter((r) => r.visible);
});
