import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_MARKET, isMarketCode, MARKET_COOKIE, MARKETS, type MarketCode } from "@/lib/markets";
import { getMarketConfigs } from "./settings";

/**
 * The active market comes from the visitor's explicit choice (st_market cookie, a strictly
 * necessary preference cookie). Without a choice we fall back to the admin-configured default.
 */
export const getMarket = cache(async (): Promise<MarketCode> => {
  const store = await cookies();
  const chosen = store.get(MARKET_COOKIE)?.value;
  const configs = await getMarketConfigs();
  const active = configs.filter((c) => c.active).map((c) => c.code);
  if (isMarketCode(chosen) && (active.length === 0 || active.includes(chosen))) return chosen;
  return configs.find((c) => c.isDefault && c.active)?.code ?? DEFAULT_MARKET;
});

export async function getMarketInfo() {
  const code = await getMarket();
  return MARKETS[code];
}
