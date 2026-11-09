"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Drawer } from "@/components/ui/drawer";
import { buttonClass } from "@/components/ui/button";
import type { Facets, SortKey } from "@/lib/server/catalog";
import { formatMoney, type MarketCode } from "@/lib/markets";
import { cn } from "@/lib/utils";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "best_selling", label: "Best selling" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

function listParam(sp: URLSearchParams, key: string) {
  return (sp.get(key) ?? "").split(",").filter(Boolean);
}

export function ListingControls({
  facets,
  total,
  market,
  showCategoryFilter = false,
  params,
}: {
  facets: Facets;
  total: number;
  market: MarketCode;
  showCategoryFilter?: boolean;
  /** Current query string values, passed from the server so the bar renders without a client-only bailout */
  params: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = new URLSearchParams(params);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const push = (next: URLSearchParams) => {
    next.delete("page");
    const qs = next.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const toggle = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    const current = listParam(next, key);
    const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    if (updated.length) next.set(key, updated.join(","));
    else next.delete(key);
    push(next);
  };

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    push(next);
  };

  const sizes = listParam(sp, "size");
  const colours = listParam(sp, "colour");
  const cats = listParam(sp, "category");
  const min = sp.get("min");
  const max = sp.get("max");
  const inStock = sp.get("stock") === "1";
  const type = sp.get("type");
  const sort = (sp.get("sort") as SortKey) || "featured";

  const chips: { label: string; remove: () => void }[] = [
    ...cats.map((c) => ({ label: facets.categories.find((x) => x.slug === c)?.name ?? c, remove: () => toggle("category", c) })),
    ...sizes.map((s) => ({ label: `Size ${s}`, remove: () => toggle("size", s) })),
    ...colours.map((c) => ({ label: c, remove: () => toggle("colour", c) })),
    ...(min ? [{ label: `From ${formatMoney(Number(min) * 100, market)}`, remove: () => setParam("min", null) }] : []),
    ...(max ? [{ label: `Up to ${formatMoney(Number(max) * 100, market)}`, remove: () => setParam("max", null) }] : []),
    ...(inStock ? [{ label: "In stock", remove: () => setParam("stock", null) }] : []),
    ...(type ? [{ label: type === "set" ? "Complete sets" : "Individual pieces", remove: () => setParam("type", null) }] : []),
  ];

  const clearAll = () => {
    const next = new URLSearchParams();
    const q = sp.get("q");
    if (q) next.set("q", q);
    if (sp.get("sort")) next.set("sort", sp.get("sort")!);
    push(next);
  };

  const priceSteps = (() => {
    const maxMajor = Math.ceil(facets.price.max / 100);
    if (maxMajor <= 0) return [];
    const step = maxMajor > 200 ? 50 : 25;
    const out: number[] = [];
    for (let v = step; v < maxMajor + step; v += step) out.push(v);
    return out.slice(0, 8);
  })();

  return (
    <div className={cn("transition-opacity", pending && "opacity-60")}>
      <div className="flex items-center justify-between gap-3 border-y border-line py-3">
        <button type="button" onClick={() => setOpen(true)} className="label inline-flex h-10 items-center gap-2 px-1 text-[0.6875rem]">
          <SlidersHorizontal className="size-4" /> Filter{chips.length ? ` (${chips.length})` : ""}
        </button>
        <p className="hidden text-xs text-stone sm:block" aria-live="polite">
          {total} {total === 1 ? "product" : "products"}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="label hidden text-[0.6875rem] text-stone sm:block">
            Sort
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setParam("sort", e.target.value === "featured" ? null : e.target.value)}
            className="h-10 border border-line bg-paper px-3 text-xs focus:border-ink focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {chips.length ? (
        <ul className="flex flex-wrap items-center gap-2 py-4" aria-label="Active filters">
          {chips.map((c) => (
            <li key={c.label}>
              <button type="button" onClick={c.remove} className="inline-flex h-8 items-center gap-1.5 border border-ink px-3 text-xs hover:bg-ink hover:text-canvas">
                {c.label} <X className="size-3" aria-hidden />
                <span className="sr-only">— remove filter</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={clearAll} className="ml-1 text-xs underline underline-offset-4">
              Clear all
            </button>
          </li>
        </ul>
      ) : null}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Filter"
        side="left"
        footer={
          <div className="grid grid-cols-2 gap-2 p-5">
            <button type="button" className={buttonClass("secondary", "md")} onClick={clearAll} disabled={!chips.length}>
              Clear all
            </button>
            <button type="button" className={buttonClass("primary", "md")} onClick={() => setOpen(false)}>
              View {total}
            </button>
          </div>
        }
      >
        <div className="divide-y divide-line px-5">
          {showCategoryFilter && facets.categories.length > 1 ? (
            <FilterGroup title="Category">
              {facets.categories.map((c) => (
                <Check key={c.slug} label={c.name} checked={cats.includes(c.slug)} onChange={() => toggle("category", c.slug)} />
              ))}
            </FilterGroup>
          ) : null}
          {facets.hasTypes ? (
            <FilterGroup title="Product type">
              <Check label="Complete sets" checked={type === "set"} onChange={() => setParam("type", type === "set" ? null : "set")} />
              <Check label="Individual pieces" checked={type === "piece"} onChange={() => setParam("type", type === "piece" ? null : "piece")} />
            </FilterGroup>
          ) : null}
          {facets.sizes.length ? (
            <FilterGroup title="Size">
              <div className="grid grid-cols-4 gap-2">
                {facets.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={sizes.includes(s)}
                    onClick={() => toggle("size", s)}
                    className={cn("h-10 border text-xs", sizes.includes(s) ? "border-ink bg-ink text-canvas" : "border-line bg-paper hover:border-ink")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </FilterGroup>
          ) : null}
          {facets.colours.length > 1 ? (
            <FilterGroup title="Colour">
              {facets.colours.map((c) => (
                <Check
                  key={c.name}
                  label={c.name}
                  checked={colours.includes(c.name)}
                  onChange={() => toggle("colour", c.name)}
                  swatch={c.name.includes("/") ? "linear-gradient(180deg,#E8E0D0 50%,#141414 50%)" : c.hex}
                />
              ))}
            </FilterGroup>
          ) : null}
          {priceSteps.length ? (
            <FilterGroup title="Price">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs">
                  <span className="mb-1 block text-stone">Min</span>
                  <select value={min ?? ""} onChange={(e) => setParam("min", e.target.value || null)} className="h-10 w-full border border-line bg-paper px-2 text-xs">
                    <option value="">Any</option>
                    {priceSteps.map((p) => (
                      <option key={p} value={p}>{formatMoney(p * 100, market)}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">
                  <span className="mb-1 block text-stone">Max</span>
                  <select value={max ?? ""} onChange={(e) => setParam("max", e.target.value || null)} className="h-10 w-full border border-line bg-paper px-2 text-xs">
                    <option value="">Any</option>
                    {priceSteps.map((p) => (
                      <option key={p} value={p}>{formatMoney(p * 100, market)}</option>
                    ))}
                  </select>
                </label>
              </div>
            </FilterGroup>
          ) : null}
          <FilterGroup title="Availability">
            <Check label="In stock only" checked={inStock} onChange={() => setParam("stock", inStock ? null : "1")} />
          </FilterGroup>
        </div>
      </Drawer>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="py-6">
      <legend className="label float-left mb-4 w-full text-xs">{title}</legend>
      <div className="clear-both space-y-3">{children}</div>
    </fieldset>
  );
}

function Check({ label, checked, onChange, swatch }: { label: string; checked: boolean; onChange: () => void; swatch?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-4 accent-ink" />
      {swatch ? <span className="size-4 rounded-full border border-ink/20" style={{ background: swatch }} aria-hidden /> : null}
      {label}
    </label>
  );
}
