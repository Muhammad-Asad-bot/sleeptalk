import {
  BrandStorySection,
  CategoriesSection,
  EditorialSection,
  HeroSection,
  NewsletterSection,
  ProductGridSection,
  ProductRailSection,
  SocialGallerySection,
  TickerStrip,
} from "@/components/home/home-sections";
import { getCategories, loadCatalog, sortProducts, toCard } from "@/lib/server/catalog";
import { getMarket } from "@/lib/server/market";
import { getHomeSections, getSettings } from "@/lib/server/settings";

export default async function HomePage() {
  const market = await getMarket();
  const [sections, catalog, categories, settings] = await Promise.all([
    getHomeSections(),
    loadCatalog(market),
    getCategories(),
    getSettings(),
  ]);
  const listed = catalog.filter((p) => p.isListed);
  const limit = (d: Record<string, unknown>, fallback: number) => (typeof d.limit === "number" ? d.limit : fallback);

  const rendered = await Promise.all(
    sections.map(async (section) => {
      const data = section.data;
      switch (section.type) {
        case "hero": {
          const ticker = Array.isArray(data.ticker)
            ? (data.ticker as unknown[]).filter((t): t is string => typeof t === "string" && t.trim() !== "")
            : [settings.store.motto, "New collection out now", "UK & Canada", "Unisex streetwear"];
          return (
            <div key={section.id}>
              <HeroSection data={data} social={settings.social} demoMode={settings.store.demoMode} />
              {ticker.length ? <TickerStrip items={ticker} /> : null}
            </div>
          );
        }
        case "categories":
          return <CategoriesSection key={section.id} data={data} categories={categories} />;
        case "new_arrivals": {
          const items = sortProducts(listed.filter((p) => p.isNewArrival && p.available), "newest").slice(0, limit(data, 8)).map(toCard);
          return <ProductRailSection key={section.id} data={data} products={items} listName="Home: new arrivals" />;
        }
        case "best_sellers": {
          const items = sortProducts(listed.filter((p) => p.available), "best_selling").slice(0, limit(data, 4)).map(toCard);
          return <ProductGridSection key={section.id} data={data} products={items} listName="Home: best sellers" />;
        }
        case "brand_story":
          return <BrandStorySection key={section.id} data={data} />;
        case "editorial":
          {
            const from = typeof data.productsFrom === "string" ? data.productsFrom : "";
            const items = from
              ? sortProducts(
                  listed.filter((p) => p.categorySlug === from && p.available && (data.setsOnly ? p.type === "set" : true)),
                  "featured",
                ).map(toCard)
              : [];
            return <EditorialSection key={section.id} data={data} products={items} />;
          }
        case "social_gallery":
          return <SocialGallerySection key={section.id} data={data} socialUrl={settings.social.instagram} />;
        case "newsletter":
          return <NewsletterSection key={section.id} data={data} />;
        default:
          return null;
      }
    }),
  );

  return <>{rendered}</>;
}
