import type { Metadata } from "next";
import { ListingPage } from "@/components/listing/listing-page";
import { getListing, parseListingParams } from "@/lib/server/catalog";
import { getMarket } from "@/lib/server/market";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = {
  title: "Pre-order",
  description: "Browse SLEEP TALK pieces available to pre-order.",
  alternates: { canonical: "/pre-order" },
};

export default async function PreOrderPage({ searchParams }: Props) {
  const sp = await searchParams;
  const market = await getMarket();
  const { filters, sort, page } = parseListingParams(sp);
  const listing = await getListing({ market, scope: (product) => product.preorder, filters, sort, page });
  return (
    <ListingPage
      title="Pre-order"
      eyebrow="Reserve your piece"
      description="Order now; we’ll ship as soon as possible."
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/pre-order", label: "Pre-order" },
      ]}
      {...listing}
      market={market}
      page={page}
      searchParams={sp}
      listName="Pre-order"
      showCategoryFilter
      emptyMessage="There are no pre-order products available right now."
    />
  );
}
