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

/** "Free shipping on orders over £100 / $150" — built from the configured shipping thresholds. */
async function freeShippingText(markets: MarketCode[]) {
  const parts: string[] = [];
  for (const code of markets) {
    const rates = await getShippingRates(code);
    const thresholds = rates.map((r) => r.freeOver).filter((v): v is number => v != null);
    if (!thresholds.length) continue;
    const min = Math.min(...thresholds);
    const amount = min % 100 === 0 ? String(min / 100) : (min / 100).toFixed(2);
    parts.push(`${MARKETS[code].currencySymbol}${amount}`);
  }
  return parts.length ? `Free shipping on orders over ${parts.join(" / ")}` : null;
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, market, user, categories, marketConfigs] = await Promise.all([
    getSettings(),
    getMarket(),
    getCurrentUser(),
    getCategories(),
    getMarketConfigs(),
  ]);
  const collections = await getLiveCollections(market);
  const activeMarkets = marketConfigs.filter((m) => m.active).map((m) => m.code);
  const shippingNote = await freeShippingText(activeMarkets);

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
