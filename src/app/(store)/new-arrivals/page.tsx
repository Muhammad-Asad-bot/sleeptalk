import type { Metadata } from "next";
import { ListingPage } from "@/components/listing/listing-page";
import { getListing, parseListingParams } from "@/lib/server/catalog";
import { getMarket } from "@/lib/server/market";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = {
  title: "New arrivals",
  description: "The latest SLEEP TALK drops.",
  alternates: { canonical: "/new-arrivals" },
};

export default async function NewArrivalsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const market = await getMarket();
  const parsed = parseListingParams(sp);
  const sort = sp.sort ? parsed.sort : "newest";
  const listing = await getListing({ market, scope: (p) => p.isNewArrival, filters: parsed.filters, sort, page: parsed.page });
  return (
    <ListingPage
      title="New arrivals"
      eyebrow="Just landed"
      description="Fresh from the latest drop."
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/new-arrivals", label: "New arrivals" },
      ]}
      {...listing}
      market={market}
      page={parsed.page}
      searchParams={sp}
      listName="New arrivals"
      showCategoryFilter
    />
  );
}
