"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ruler, Truck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/components/providers/store-provider";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { buttonClass } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Price } from "@/components/ui/price";
import { track } from "@/lib/analytics";
import type { CatalogImage } from "@/lib/server/catalog";
import type { ProductOptions } from "@/lib/product-options";
import { cn } from "@/lib/utils";
import { ProductGallery } from "./product-gallery";
import { initialSelection, resolveSelection, VariantPicker, type PickerSelection } from "./variant-picker";
import { WishlistButton } from "./wishlist-button";

export function ProductView({
  options,
  images,
  sizeGuide,
  shippingSummary,
  returnsSummary,
  ratingSummary,
  accordions,
  isDemo,
}: {
  options: ProductOptions;
  images: CatalogImage[];
  sizeGuide: React.ReactNode;
  shippingSummary: string;
  returnsSummary: string;
  ratingSummary: React.ReactNode;
  accordions: React.ReactNode;
  isDemo: boolean;
}) {
  const { addToCart, market, recordView } = useStore();
  const router = useRouter();
  const [selection, setSelection] = useState<PickerSelection>(() => initialSelection(options));
  const [quantity, setQuantity] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);
  const resolved = resolveSelection(options, selection);
  const anyAvailable = options.colours.some((c) => c.available);

  useEffect(() => {
    recordView(options.id);
    track("view_item", {
      currency: market === "UK" ? "GBP" : "CAD",
      value: options.price / 100,
      items: [{ item_id: options.id, item_name: options.title, item_category: options.categoryName, price: options.price / 100 }],
    });
  }, [options, market, recordView]);

  // Sticky add-to-bag bar once the main button scrolls out of view
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onChange = useCallback((s: PickerSelection) => {
    setSelection(s);
  }, []);

  const add = (buyNow = false) => {
    if (!resolved.line) {
      setShowErrors(true);
      ctaRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      return false;
    }
    addToCart(
      { ...resolved.line, quantity },
      { title: options.title, variantLabel: resolved.label, image: options.imagesByColour[selection.colour ?? ""] ?? null, price: options.price },
    );
    if (buyNow) router.push("/checkout");
    return true;
  };

  const maxQty = options.preorder ? 20 : resolved.lowStock ?? 10;

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-7">
        <ProductGallery images={images} colour={selection.colour} title={options.title} />
      </div>

      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-24">
          {options.categoryName ? <p className="label text-stone">{options.categoryName}</p> : null}
          <div className="mt-2 flex items-start justify-between gap-4">
            <h1 className="display text-4xl md:text-5xl">{options.title}</h1>
            <WishlistButton productId={options.id} title={options.title} className="mt-1 size-11 shrink-0 border border-line hover:border-ink" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Price amount={options.price} compareAt={options.compareAt} market={market} size="lg" />
            {ratingSummary}
          </div>
          <p className="mt-2 text-xs text-ash">
            {options.type === "set"
              ? `Price is for the complete set (${options.components.map((c) => c.label.toLowerCase()).join(" + ")}).`
              : "Price is for one item."}{" "}
            Taxes and shipping calculated at checkout.
          </p>
          {isDemo ? <p className="mt-3 inline-block bg-cream px-2 py-1 text-[0.6875rem] text-ash">Demo product — details and prices are placeholders</p> : null}

          <div className="mt-8">
            <VariantPicker options={options} selection={selection} onChange={onChange} showErrors={showErrors} idPrefix="pdp" />
          </div>

          <button type="button" onClick={() => setGuideOpen(true)} className="mt-1 inline-flex items-center gap-2 text-xs underline underline-offset-4">
            <Ruler className="size-3.5" /> Size guide
          </button>

          <div ref={ctaRef} className="mt-6 space-y-3">
            <div className="flex gap-3">
              <QuantityStepper value={quantity} onChange={(q) => setQuantity(Math.max(1, Math.min(maxQty, q)))} max={maxQty} />
              <button
                type="button"
                onClick={() => add(false)}
                disabled={!anyAvailable || resolved.soldOut}
                className={buttonClass("primary", "lg", "flex-1")}
              >
                {!anyAvailable ? "Sold out" : resolved.soldOut ? "Sold out in this size" : options.preorder ? "Pre-order now" : "Add to bag"}
              </button>
            </div>
            {anyAvailable ? (
              <button type="button" onClick={() => add(true)} disabled={resolved.soldOut} className={buttonClass("secondary", "lg", "w-full")}>
                {options.preorder ? "Pre-order & pay now" : "Buy now"}
              </button>
            ) : null}
            {options.preorder ? (
              <p className="text-xs text-ash">
                {options.preorderMessage} Payment is taken at checkout.
              </p>
            ) : null}
          </div>

          <div className="mt-6 space-y-2 border-y border-line py-5 text-xs text-ash">
            <p className="flex gap-2"><Truck className="size-4 shrink-0 text-ink" /> {shippingSummary}</p>
            <p className="pl-6">{returnsSummary} <Link href="/returns" className="underline">Returns policy</Link></p>
          </div>

          {options.type === "set" ? (
            <div className="mt-6 bg-paper p-4 text-xs leading-relaxed">
              <p className="label mb-2">What&apos;s in the set</p>
              <ul className="space-y-1">
                {options.components.map((c) => (
                  <li key={c.productId}>
                    {c.label}: {c.isListed ? <Link href={`/products/${c.slug}`} className="underline">{c.title}</Link> : c.title}
                    {c.isListed ? <span className="text-stone"> — also sold separately</span> : null}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-stone">Choose your top and bottom sizes independently.</p>
            </div>
          ) : null}

          <div className="mt-6">{accordions}</div>
        </div>
      </div>

      <Drawer open={guideOpen} onClose={() => setGuideOpen(false)} title="Size guide" widthClass="w-full sm:max-w-xl">
        <div className="px-5 py-6">{sizeGuide}</div>
      </Drawer>

      {/* Sticky add-to-bag */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 backdrop-blur transition-transform duration-300",
          stickyVisible && anyAvailable ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!stickyVisible}
      >
        <div className="container-site flex items-center gap-4 py-3">
          <div className="hidden min-w-0 flex-1 sm:block">
            <p className="truncate text-sm font-medium">{options.title}</p>
            <p className="text-xs text-ash">{resolved.label || "Select options"}</p>
          </div>
          <Price amount={options.price} compareAt={options.compareAt} market={market} className="shrink-0" />
          <button
            type="button"
            tabIndex={stickyVisible ? 0 : -1}
            onClick={() => add(false)}
            className={buttonClass("primary", "md", "ml-auto flex-1 sm:flex-none sm:min-w-56")}
          >
            {resolved.line ? (options.preorder ? "Pre-order now" : "Add to bag") : "Select size"}
          </button>
        </div>
      </div>
    </div>
  );
}
