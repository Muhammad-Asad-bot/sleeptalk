import type { Metadata } from "next";
import { ListingPage } from "@/components/listing/listing-page";
import { getListing, parseListingParams } from "@/lib/server/catalog";
import { getMarket } from "@/lib/server/market";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = {
  title: "Sale",
  description: "Reduced SLEEP TALK pieces while stocks last.",
  alternates: { canonical: "/sale" },
};

export default async function SalePage({ searchParams }: Props) {
  const sp = await searchParams;
  const market = await getMarket();
  const { filters, sort, page } = parseListingParams(sp);
  const listing = await getListing({ market, scope: (p) => p.compareAt != null, filters, sort, page });
  return (
    <ListingPage
      title="Sale"
      eyebrow="Reduced"
      description="Selected pieces at reduced prices, while stocks last."
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/sale", label: "Sale" },
      ]}
      {...listing}
      market={market}
      page={page}
      searchParams={sp}
      listName="Sale"
      showCategoryFilter
      emptyMessage="There's nothing on sale right now."
    />
  );
}
