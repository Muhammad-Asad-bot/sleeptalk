"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useStore } from "@/components/providers/store-provider";
import { Price } from "@/components/ui/price";
import { SmartImage } from "@/components/ui/smart-image";
import type { QuoteLine } from "@/lib/cart-types";
import { formatMoney } from "@/lib/markets";
import { cn } from "@/lib/utils";
import { QuantityStepper } from "./quantity-stepper";

const ISSUE_TEXT: Record<NonNullable<QuoteLine["issue"]>, string> = {
  unavailable: "No longer available in your country. Please remove it.",
  out_of_stock: "Sold out in this size. Please remove it or choose another size.",
  insufficient_stock: "Only {max} left — quantity reduced.",
  invalid_selection: "This size/colour is no longer available. Please remove it and reselect.",
};

export function CartLines({ lines, compact = false }: { lines: QuoteLine[]; compact?: boolean }) {
  const { market, setQuantity, removeLine, toggleWishlist, wishlist, setCartOpen } = useStore();
  return (
    <ul className="divide-y divide-line">
      {lines.map((line) => (
        <li key={line.key} className={cn("flex gap-4", compact ? "py-5" : "py-6")}>
          <Link
            href={line.slug ? `/products/${line.slug}` : "#"}
            onClick={() => setCartOpen(false)}
            className={cn("relative shrink-0 overflow-hidden bg-product", compact ? "h-28 w-[88px]" : "h-36 w-28")}
          >
            <SmartImage src={line.image} alt={line.imageAlt} fill sizes="112px" className="object-contain" showDemoTag={false} />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={line.slug ? `/products/${line.slug}` : "#"}
                  onClick={() => setCartOpen(false)}
                  className="block text-sm font-medium leading-snug hover:underline"
                >
                  {line.title}
                </Link>
                <p className="mt-1 text-xs text-ash">{line.variantLabel}</p>
                {line.isSet ? <p className="mt-0.5 text-[0.6875rem] text-stone">Complete set price</p> : null}
              </div>
              <p className="shrink-0 text-sm font-medium tabular-nums">
                {line.quantity > 0 ? formatMoney(line.lineTotal, market) : "—"}
              </p>
            </div>
            <div className="mt-1 text-xs">
              <Price amount={line.unitPrice} compareAt={line.compareAt} market={market} className="text-xs text-stone" />
              <span className="text-stone"> each</span>
            </div>
            {line.issue ? (
              <p role="alert" className="mt-2 text-xs text-sale">
                {ISSUE_TEXT[line.issue].replace("{max}", String(line.maxQuantity))}
              </p>
            ) : null}
            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
              {line.issue !== "unavailable" && line.issue !== "invalid_selection" && line.issue !== "out_of_stock" ? (
                <QuantityStepper
                  size="sm"
                  value={line.requestedQuantity}
                  max={Math.max(1, Math.min(20, line.maxQuantity))}
                  onChange={(q) => setQuantity(line.key, q)}
                  label={`Quantity for ${line.title}`}
                />
              ) : null}
              <button type="button" onClick={() => removeLine(line.key)} className="text-xs underline underline-offset-4 hover:text-ash">
                Remove
              </button>
              {line.productId && !wishlist.has(line.productId) ? (
                <button
                  type="button"
                  onClick={async () => {
                    await toggleWishlist(line.productId);
                    removeLine(line.key);
                  }}
                  className="inline-flex items-center gap-1 text-xs underline underline-offset-4 hover:text-ash"
                >
                  <Heart className="size-3" /> Save for later
                </button>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
