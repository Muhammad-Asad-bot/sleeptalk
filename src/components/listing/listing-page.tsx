import Link from "next/link";
import { ProductGrid } from "@/components/product/product-grid";
import { buttonClass } from "@/components/ui/button";
import type { Facets, ProductCardData } from "@/lib/server/catalog";
import type { MarketCode } from "@/lib/markets";
import { ListingControls } from "./listing-controls";

export type Crumb = { href: string; label: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-stone">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={c.href} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden>/</span> : null}
            {i === items.length - 1 ? (
              <span aria-current="page" className="text-ash">{c.label}</span>
            ) : (
              <Link href={c.href} className="hover:text-ink">{c.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ListingPage({
  title,
  eyebrow,
  description,
  crumbs,
  items,
  total,
  baseTotal,
  hasMore,
  facets,
  market,
  page,
  searchParams,
  listName,
  showCategoryFilter,
  emptyMessage,
  heroImage,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  crumbs: Crumb[];
  items: ProductCardData[];
  total: number;
  baseTotal: number;
  hasMore: boolean;
  facets: Facets;
  market: MarketCode;
  page: number;
  searchParams: Record<string, string | string[] | undefined>;
  listName: string;
  showCategoryFilter?: boolean;
  emptyMessage?: string;
  heroImage?: React.ReactNode;
}) {
  const flatParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(searchParams)) if (v != null) flatParams[k] = Array.isArray(v) ? v.join(",") : v;
  const nextParams = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v == null || k === "page") continue;
    nextParams.set(k, Array.isArray(v) ? v.join(",") : v);
  }
  nextParams.set("page", String(page + 1));

  return (
    <div className="container-site pt-6 md:pt-10">
      <Breadcrumbs items={crumbs} />
      <header className="mb-8 mt-6 grid gap-6 md:mb-10 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7">
          {eyebrow ? <p className="label mb-3 text-stone">{eyebrow}</p> : null}
          <h1 className="display text-5xl sm:text-6xl md:text-7xl">{title}</h1>
        </div>
        {description ? <p className="max-w-md text-sm leading-relaxed text-ash md:col-span-5 md:justify-self-end">{description}</p> : null}
      </header>
      {heroImage}

      {baseTotal > 0 ? (
        <ListingControls facets={facets} total={total} market={market} showCategoryFilter={showCategoryFilter} params={flatParams} />
      ) : null}

      <div className="mt-8">
        {items.length ? (
          <ProductGrid products={items} listName={listName} />
        ) : (
          <div className="border border-dashed border-line px-6 py-20 text-center">
            <p className="display text-3xl">Nothing here — yet</p>
            <p className="mx-auto mt-3 max-w-sm text-sm text-ash">
              {baseTotal > 0 ? "No products match these filters. Try removing a filter." : emptyMessage ?? "Check back soon for new pieces."}
            </p>
            <Link href="/shop" className={buttonClass("secondary", "md", "mt-6")}>
              Shop all products
            </Link>
          </div>
        )}
      </div>

      {hasMore ? (
        <div className="mt-14 flex flex-col items-center gap-3">
          <p className="text-xs text-stone">
            Showing {items.length} of {total}
          </p>
          <div className="h-0.5 w-48 bg-line">
            <div className="h-full bg-ink" style={{ width: `${(items.length / total) * 100}%` }} />
          </div>
          <Link href={`?${nextParams.toString()}`} scroll={false} className={buttonClass("secondary", "md", "mt-2 min-w-48")}>
            Load more
          </Link>
        </div>
      ) : null}
    </div>
  );
}
