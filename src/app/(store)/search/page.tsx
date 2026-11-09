import type { Metadata } from "next";
import { ListingPage } from "@/components/listing/listing-page";
import { SearchTracker } from "@/components/listing/search-tracker";
import {
  applyFilters,
  computeFacets,
  PAGE_SIZE,
  parseListingParams,
  searchProducts,
  sortProducts,
  toCard,
} from "@/lib/server/catalog";
import { getMarket } from "@/lib/server/market";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = ((Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "").trim().slice(0, 80);
  const market = await getMarket();
  const { filters, sort, page } = parseListingParams(sp);
  const matches = q ? await searchProducts(q, market) : [];
  // Relevance order by default; explicit sort when chosen
  const filtered = sp.sort ? sortProducts(applyFilters(matches, filters), sort) : applyFilters(matches, filters);
  const visible = filtered.slice(0, page * PAGE_SIZE);
  return (
    <>
      <SearchTracker term={q} />
      <ListingPage
        title={q ? `“${q}”` : "Search"}
        eyebrow={q ? `${filtered.length} result${filtered.length === 1 ? "" : "s"} for` : "Search"}
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/search", label: "Search" },
        ]}
        items={visible.map(toCard)}
        total={filtered.length}
        baseTotal={matches.length}
        hasMore={filtered.length > visible.length}
        facets={computeFacets(matches)}
        market={market}
        page={page}
        searchParams={sp}
        listName="Search results"
        showCategoryFilter
        emptyMessage={
          q
            ? `No products match “${q}”. Try a broader term like “hoodie” or “tracksuit”.`
            : "Use the search icon in the header to find products by name, category or SKU."
        }
      />
    </>
  );
}
