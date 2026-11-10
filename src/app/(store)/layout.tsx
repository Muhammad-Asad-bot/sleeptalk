import { StoreProvider } from "@/components/providers/store-provider";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SearchOverlay } from "@/components/layout/search-overlay";
import { CookieBanner } from "@/components/layout/cookie-banner";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { getCurrentUser } from "@/lib/server/auth";
import { getCategories, getLiveCollections } from "@/lib/server/catalog";
import { getMarket } from "@/lib/server/market";
import { getMarketConfigs, getSettings, getShippingRates } from "@/lib/server/settings";
import { MARKETS, type MarketCode } from "@/lib/markets";

/**
 * Banner text built from the configured free-shipping thresholds, e.g.
 * "Free shipping in Canada on orders over $500 CAD" (one market) or
 * "Free shipping on orders over £100 GBP / $500 CAD" (several).
 */
async function freeShippingText(markets: MarketCode[]) {
  const parts: string[] = [];
  const offered: MarketCode[] = [];
  const allRates = await Promise.all(markets.map((code) => getShippingRates(code)));
  for (const [i, code] of markets.entries()) {
    const rates = allRates[i];
    const thresholds = rates.map((r) => r.freeOver).filter((v): v is number => v != null);
    if (!thresholds.length) continue;
    const min = Math.min(...thresholds);
    const amount = min % 100 === 0 ? String(min / 100) : (min / 100).toFixed(2);
    parts.push(`${MARKETS[code].currencySymbol}${amount} ${MARKETS[code].currency}`);
    offered.push(code);
  }
  if (!parts.length) return null;
  return offered.length === 1
    ? `Free shipping in ${MARKETS[offered[0]].label} on orders over ${parts[0]}`
    : `Free shipping on orders over ${parts.join(" / ")}`;
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, market, user, categories, marketConfigs] = await Promise.all([
    getSettings(),
    getMarket(),
    getCurrentUser(),
    getCategories(),
    getMarketConfigs(),
  ]);
  const activeMarkets = marketConfigs.filter((m) => m.active).map((m) => m.code);
  const [collections, shippingNote] = await Promise.all([getLiveCollections(market), freeShippingText(activeMarkets)]);

  return (
    <StoreProvider market={market} isAuthed={!!user}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:bg-ink focus:px-4 focus:py-3 focus:text-sm focus:text-canvas"
      >
        Skip to content
      </a>
      <AnnouncementBar settings={settings.announcement} freeShippingText={shippingNote} market={market} markets={activeMarkets} />
      <SiteHeader
        categories={categories.map((c) => ({ slug: c.slug, name: c.name, image: c.image }))}
        collections={collections.map((c) => ({ slug: c.slug, title: c.title, image: c.image }))}
        market={market}
        markets={activeMarkets}
        userName={user ? user.firstName || user.email : null}
        logo={settings.store.logoDark}
        logoLight={settings.store.logoLight}
      />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <SiteFooter settings={settings} market={market} markets={activeMarkets} />
      <CartDrawer />
      <SearchOverlay />
      <CookieBanner />
    </StoreProvider>
  );
}
