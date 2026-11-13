"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/components/providers/store-provider";
import { Price } from "@/components/ui/price";
import { SmartImage } from "@/components/ui/smart-image";
import { track } from "@/lib/analytics";
import type { ProductCardData } from "@/lib/server/catalog";
import { cn, swatchBackground } from "@/lib/utils";
import { WishlistButton } from "./wishlist-button";

const QuickAddPanel = dynamic(() => import("./quick-add").then((module) => module.QuickAddPanel), { ssr: false });

export function ProductCard({
  product,
  priority = false,
  listName,
  index = 0,
}: {
  product: ProductCardData;
  priority?: boolean;
  listName?: string;
  index?: number;
}) {
  const { market } = useStore();
  const [quickOpen, setQuickOpen] = useState(false);
  const soldOut = !product.available;

  return (
    <article className="group relative">
      <div className="relative aspect-[4/5] overflow-hidden bg-product">
        <Link
          href={`/products/${product.slug}`}
          className="absolute inset-0"
          onClick={() =>
            track("select_item", {
              item_list_name: listName,
              items: [{ item_id: product.id, item_name: product.title, index, price: product.price / 100 }],
            })
          }
          aria-label={product.title}
        >
          {/* Whole photo always shown (object-contain) on the shared product backdrop. */}
          <SmartImage
            src={product.image?.url}
            alt={product.image?.alt ?? product.title}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 24vw, (min-width: 768px) 32vw, 50vw"
            className={cn(
              "object-contain object-center block transition-opacity duration-500",
              product.hoverImage && "group-hover:opacity-0 group-focus-within:opacity-0",
              soldOut && "opacity-70",
            )}
          />
          {product.hoverImage ? (
            <SmartImage
              src={product.hoverImage.url}
              alt=""
              fill
              sizes="(min-width: 1280px) 24vw, (min-width: 768px) 32vw, 50vw"
              className="object-contain object-center block opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              showDemoTag={false}
            />
          ) : null}
        </Link>

        {product.badges.length ? (
          <ul className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
            {product.badges.map((b) => (
              <li
                key={b}
                className={cn(
                  "px-1.5 py-1 text-[0.5625rem] font-semibold uppercase leading-none tracking-[0.14em]",
                  b === "Sale" && "bg-sale text-white",
                  b === "New" && "bg-canvas text-ink",
                  b === "Sold out" && "bg-ink text-canvas",
                  b === "Set" && "bg-ink/80 text-canvas",
                  b === "Pre-order" && "bg-ink text-canvas",
                )}
              >
                {b}
              </li>
            ))}
          </ul>
        ) : null}

        <WishlistButton
          productId={product.id}
          title={product.title}
          className="absolute right-1.5 top-1.5 size-9 bg-canvas/0 hover:bg-canvas/80"
        />

        {!soldOut ? (
          <button
            type="button"
            onClick={() => setQuickOpen(true)}
            className={cn(
              "absolute inset-x-2 bottom-2 flex h-10 items-center justify-center gap-1.5 bg-canvas/95 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] backdrop-blur",
              "translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 focus:translate-y-0 focus:opacity-100",
              "max-md:inset-x-auto max-md:right-2 max-md:size-9 max-md:translate-y-0 max-md:opacity-100",
            )}
            aria-label={`${product.preorder ? "Pre-order" : "Quick add"} ${product.title}`}
          >
            <Plus className="size-4" />
            <span className="max-md:sr-only">Quick add</span>
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[0.8125rem] font-medium leading-snug">
            <Link href={`/products/${product.slug}`} className="hover:underline">
              {product.title}
            </Link>
          </h3>
          <Price amount={product.price} compareAt={product.compareAt} market={market} className="mt-1 text-[0.8125rem]" />
          {product.isSet ? <p className="text-[0.6875rem] text-stone">Complete set</p> : null}
          <p className="mt-1 text-[0.6875rem] text-ash">
            {product.preorder ? (
              <span className="font-medium text-ink">Pre-order — {product.preorderMessage}</span>
            ) : product.stock > 0 ? (
              <>
                In stock:{" "}
                <span className={cn("font-semibold tabular-nums", product.stock < 5 ? "text-sale" : "text-ink")}>{product.stock}</span>
              </>
            ) : (
              <span className="font-semibold text-sale">Out of stock</span>
            )}
          </p>
        </div>
        {product.colours.length > 1 ? (
          <ul className="mt-1 flex shrink-0 gap-1" aria-label={`${product.colours.length} colours`}>
            {product.colours.slice(0, 4).map((c) => (
              <li
                key={c.name}
                title={c.name}
                className="size-3 rounded-full border border-ink/20"
                style={{ background: swatchBackground(c.hex) }}
              />
            ))}
          </ul>
        ) : null}
      </div>
      {quickOpen ? <QuickAddPanel productId={product.id} open={quickOpen} onClose={() => setQuickOpen(false)} /> : null}
    </article>
  );
}
