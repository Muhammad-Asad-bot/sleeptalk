import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Breadcrumbs } from "@/components/listing/listing-page";
import { ProductCard } from "@/components/product/product-card";
import { ProductView } from "@/components/product/product-view";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { ReviewsSection, Stars } from "@/components/product/reviews";
import { Markdown } from "@/lib/markdown";
import { MARKETS } from "@/lib/markets";
import { buildProductOptions } from "@/lib/product-options";
import { getCurrentUser } from "@/lib/server/auth";
import {
  getProductBySlug,
  getProductReviews,
  getRelatedProducts,
  getSetRelations,
  resolveRedirectSlug,
} from "@/lib/server/catalog";
import { getMarket } from "@/lib/server/market";
import { getMarketConfig, getPage, getSettings } from "@/lib/server/settings";
import { absoluteUrl } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const market = await getMarket();
  const product = await getProductBySlug(slug, market);
  if (!product) return {};
  const image = product.images[0]?.url;
  return {
    title: product.seoTitle || product.title,
    description: product.seoDescription || product.description.slice(0, 155),
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { type: "website", images: image ? [{ url: image, alt: product.images[0]?.alt }] : undefined },
  };
}

function Accordion({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group border-b border-line" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-xs font-semibold uppercase tracking-[0.12em] [&::-webkit-details-marker]:hidden">
        {title}
        <span className="text-base font-normal transition-transform group-open:rotate-45" aria-hidden>+</span>
      </summary>
      <div className="pb-5 text-sm leading-relaxed text-charcoal">{children}</div>
    </details>
  );
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const market = await getMarket();
  const product = await getProductBySlug(slug, market);
  if (!product) {
    const moved = await resolveRedirectSlug(slug);
    if (moved && moved !== slug) permanentRedirect(`/products/${moved}`);
    notFound();
  }

  const [settings, marketConfig, reviews, related, setRelations, sizeGuide, user] = await Promise.all([
    getSettings(),
    getMarketConfig(market),
    getProductReviews(product.id),
    getRelatedProducts(product, market),
    getSetRelations(product, market),
    getPage("size-guide"),
    getCurrentUser(),
  ]);
  const options = buildProductOptions(product, settings.inventory.showLowStock);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: product.title,
        description: product.description,
        image: product.images.slice(0, 4).map((i) => (i.url.startsWith("http") ? i.url : absoluteUrl(i.url))),
        sku: product.variants[0]?.sku,
        brand: { "@type": "Brand", name: "SLEEP TALK" },
        category: product.categoryName ?? undefined,
        offers: {
          "@type": "Offer",
          url: absoluteUrl(`/products/${product.slug}`),
          priceCurrency: MARKETS[market].currency,
          price: (product.price / 100).toFixed(2),
          availability: product.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
        },
        ...(reviews.count
          ? { aggregateRating: { "@type": "AggregateRating", ratingValue: reviews.average.toFixed(1), reviewCount: reviews.count } }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Shop", item: absoluteUrl("/shop") },
          ...(product.categorySlug
            ? [{ "@type": "ListItem", position: 3, name: product.categoryName, item: absoluteUrl(`/shop/${product.categorySlug}`) }]
            : []),
          { "@type": "ListItem", position: product.categorySlug ? 4 : 3, name: product.title, item: absoluteUrl(`/products/${product.slug}`) },
        ],
      },
    ],
  };

  const crumbs = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    ...(product.categorySlug ? [{ href: `/shop/${product.categorySlug}`, label: product.categoryName ?? "" }] : []),
    { href: `/products/${product.slug}`, label: product.title },
  ];

  const accordions = (
    <div className="border-t border-line">
      <Accordion title="Details" open>
        <p className="whitespace-pre-line">{product.description}</p>
        {product.tags.length ? <p className="mt-3 text-xs text-stone">Tags: {product.tags.join(", ")}</p> : null}
      </Accordion>
      <Accordion title="Size & Fit">
        {product.fitNotes ? <p>{product.fitNotes}</p> : null}
        {product.modelInfo ? <p className="mt-2">{product.modelInfo}</p> : null}
        {product.measurements ? <p className="mt-2">{product.measurements}</p> : null}
      </Accordion>
      <Accordion title="Fabric & Care">
        <p>{product.fabric || "Fabric details coming soon."}</p>
        <p className="mt-2">{product.care || "Care instructions coming soon."}</p>
      </Accordion>
      <Accordion title="Delivery & Returns">
        <p>{marketConfig?.shippingSummary}</p>
        <p className="mt-2">{marketConfig?.returnsSummary}</p>
        {marketConfig?.taxNote ? <p className="mt-2 text-xs text-stone">{marketConfig.taxNote}</p> : null}
      </Accordion>
    </div>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="container-site pt-4 md:pt-8">
        <Breadcrumbs items={crumbs} />
        <div className="mt-4 md:mt-6">
          <ProductView
            options={options}
            images={product.images}
            isDemo={product.isDemo}
            sizeGuide={sizeGuide ? <Markdown source={sizeGuide.body} /> : <p className="text-sm">Size guide coming soon.</p>}
            shippingSummary={marketConfig?.shippingSummary ?? "Shipping options are shown at checkout."}
            returnsSummary={marketConfig?.returnsSummary ?? ""}
            ratingSummary={
              reviews.count ? (
                <a href="#reviews" className="inline-flex items-center gap-2 text-xs">
                  <Stars value={reviews.average} /> <span className="underline">{reviews.count} review{reviews.count === 1 ? "" : "s"}</span>
                </a>
              ) : null
            }
            accordions={accordions}
          />
        </div>
      </div>

      {setRelations.sets.length || setRelations.pieces.length ? (
        <section className="container-site mt-20 border-t border-line pt-14" aria-labelledby="set-heading">
          <p className="label text-stone">Matching pieces</p>
          <h2 id="set-heading" className="display mt-2 text-4xl md:text-5xl">
            {product.type === "set" ? "Also sold separately" : "Complete the set"}
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-5">
            {[...setRelations.sets, ...setRelations.pieces].map((c, i) => (
              <li key={c.id}>
                <ProductCard product={c} listName="Complete the set" index={i} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ReviewsSection
        productId={product.id}
        reviews={reviews.reviews.map((r) => ({
          id: r.id,
          authorName: r.authorName,
          rating: r.rating,
          title: r.title,
          body: r.body,
          verifiedPurchase: r.verifiedPurchase,
          createdAt: r.createdAt.toISOString(),
        }))}
        count={reviews.count}
        average={reviews.average}
        distribution={reviews.distribution}
        signedInName={user ? user.firstName || "Customer" : null}
      />

      {related.length ? (
        <section className="container-site py-12" aria-labelledby="related-heading">
          <h2 id="related-heading" className="display mb-8 text-3xl md:text-4xl">You may also like</h2>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-5">
            {related.map((c, i) => (
              <li key={c.id}>
                <ProductCard product={c} listName="Related products" index={i} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <RecentlyViewed excludeId={product.id} />
    </>
  );
}
