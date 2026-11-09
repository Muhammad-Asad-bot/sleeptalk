import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingPage } from "@/components/listing/listing-page";
import { SmartImage } from "@/components/ui/smart-image";
import { getCollectionBySlug, getListing, parseListingParams } from "@/lib/server/catalog";
import { getMarket } from "@/lib/server/market";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug, await getMarket());
  if (!collection) return {};
  return {
    title: collection.seoTitle || collection.title,
    description: collection.seoDescription || collection.description,
    alternates: { canonical: `/collections/${collection.slug}` },
    openGraph: collection.image ? { images: [{ url: collection.image }] } : undefined,
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const market = await getMarket();
  const collection = await getCollectionBySlug(slug, market);
  if (!collection) notFound();
  const { filters, sort, page } = parseListingParams(sp);
  const order = new Map(collection.productIds.map((id, i) => [id, i]));
  const listing = await getListing({ market, scope: (p) => order.has(p.id), filters, sort, page });
  // Manual collections keep their curated order under "Featured"
  if (collection.mode === "manual" && !sp.sort) {
    listing.items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }
  return (
    <ListingPage
      title={collection.title}
      eyebrow="Collection"
      description={collection.description}
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/collections", label: "Collections" },
        { href: `/collections/${collection.slug}`, label: collection.title },
      ]}
      heroImage={
        collection.image ? (
          <div className="relative mb-10 aspect-[16/7] overflow-hidden bg-night">
            <SmartImage src={collection.image} alt="" fill priority sizes="100vw" className="object-cover" />
          </div>
        ) : null
      }
      {...listing}
      market={market}
      page={page}
      searchParams={sp}
      listName={`Collection: ${collection.title}`}
      showCategoryFilter
    />
  );
}
