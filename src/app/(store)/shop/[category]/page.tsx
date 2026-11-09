import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingPage } from "@/components/listing/listing-page";
import { getCategoryBySlug, getListing, parseListingParams } from "@/lib/server/catalog";
import { getMarket } from "@/lib/server/market";

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) return {};
  return {
    title: cat.seoTitle || cat.name,
    description: cat.seoDescription || cat.description,
    alternates: { canonical: `/shop/${cat.slug}` },
    openGraph: cat.image ? { images: [{ url: cat.image }] } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ category }, sp] = await Promise.all([params, searchParams]);
  const cat = await getCategoryBySlug(category);
  if (!cat) notFound();
  const market = await getMarket();
  const { filters, sort, page } = parseListingParams(sp);
  const listing = await getListing({ market, scope: (p) => p.categoryId === cat.id, filters, sort, page });
  return (
    <ListingPage
      title={cat.name}
      eyebrow="Shop"
      description={cat.description}
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/shop", label: "Shop" },
        { href: `/shop/${cat.slug}`, label: cat.name },
      ]}
      {...listing}
      market={market}
      page={page}
      searchParams={sp}
      listName={cat.name}
    />
  );
}
