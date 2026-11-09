import type { Metadata } from "next";
import { ListingPage } from "@/components/listing/listing-page";
import { getListing, parseListingParams } from "@/lib/server/catalog";
import { getMarket } from "@/lib/server/market";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = {
  title: "Shop all",
  description: "Shop all SLEEP TALK unisex streetwear: hoodies, tees, shirts, jackets, pants and tracksuits.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({ searchParams }: Props) {
  const sp = await searchParams;
  const market = await getMarket();
  const { filters, sort, page } = parseListingParams(sp);
  const listing = await getListing({ market, scope: () => true, filters, sort, page });
  return (
    <ListingPage
      title="Shop all"
      eyebrow="SLEEP TALK"
      description="Unisex pieces in black, cream and charcoal. Built around the orbit emblem and the crescent moon."
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/shop", label: "Shop" },
      ]}
      {...listing}
      market={market}
      page={page}
      searchParams={sp}
      listName="All products"
      showCategoryFilter
    />
  );
}
