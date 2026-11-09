import type { Metadata } from "next";
import { ListingPage } from "@/components/listing/listing-page";
import { getListing, parseListingParams } from "@/lib/server/catalog";
import { getMarket } from "@/lib/server/market";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = {
  title: "Best sellers",
  description: "The SLEEP TALK pieces people keep coming back for.",
  alternates: { canonical: "/best-sellers" },
};

export default async function BestSellersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const market = await getMarket();
  const parsed = parseListingParams(sp);
  const sort = sp.sort ? parsed.sort : "best_selling";
  const listing = await getListing({ market, scope: (p) => p.salesCount > 0, filters: parsed.filters, sort, page: parsed.page });
  return (
    <ListingPage
      title="Best sellers"
      eyebrow="Most wanted"
      description="Ranked by orders. [Demo sales data]"
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/best-sellers", label: "Best sellers" },
      ]}
      {...listing}
      market={market}
      page={parsed.page}
      searchParams={sp}
      listName="Best sellers"
      showCategoryFilter
    />
  );
}
