"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/providers/store-provider";
import { buttonClass } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Price } from "@/components/ui/price";
import { SmartImage } from "@/components/ui/smart-image";
import type { ProductOptions } from "@/lib/product-options";
import { initialSelection, resolveSelection, VariantPicker, type PickerSelection } from "./variant-picker";

/**
 * Quick Add opens a small size/colour panel; it never silently adds an arbitrary size.
 */
export function QuickAddPanel({ productId, open, onClose }: { productId: string; open: boolean; onClose: () => void }) {
  const { addToCart, market } = useStore();
  const [options, setOptions] = useState<ProductOptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<PickerSelection>({ colour: null, sizes: [] });
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!open || options) return;
    let cancelled = false;
    fetch(`/api/products/${productId}/options`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Unavailable"))))
      .then((data: ProductOptions) => {
        if (cancelled) return;
        setOptions(data);
        setSelection(initialSelection(data));
      })
      .catch(() => !cancelled && setError("This product is unavailable right now."));
    return () => {
      cancelled = true;
    };
  }, [open, options, productId]);

  const onChange = useCallback((s: PickerSelection) => setSelection(s), []);

  const add = () => {
    if (!options) return;
    const r = resolveSelection(options, selection);
    if (!r.line) {
      setShowErrors(true);
      return;
    }
    addToCart(
      { ...r.line, quantity: 1 },
      { title: options.title, variantLabel: r.label, image: options.imagesByColour[selection.colour ?? ""] ?? null, price: options.price },
    );
    onClose();
  };

  return (
    <Drawer open={open} onClose={onClose} title="Quick add" side="right">
      <div className="p-5">
        {error ? <p className="text-sm text-sale">{error}</p> : null}
        {!options && !error ? (
          <div className="space-y-4" aria-busy>
            <div className="skeleton aspect-[4/5] w-32" />
            <div className="skeleton h-5 w-2/3" />
            <div className="skeleton h-11 w-full" />
          </div>
        ) : null}
        {options ? (
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="relative aspect-[4/5] w-28 shrink-0 overflow-hidden bg-cream">
                <SmartImage
                  src={options.imagesByColour[selection.colour ?? ""] ?? null}
                  alt=""
                  fill
                  sizes="112px"
                  className="object-contain"
                  showDemoTag={false}
                />
              </div>
              <div>
                <p className="text-sm font-medium">{options.title}</p>
                <Price amount={options.price} compareAt={options.compareAt} market={market} className="mt-1" />
                {options.type === "set" ? <p className="mt-2 text-xs text-ash">Price is for the complete set.</p> : null}
              </div>
            </div>
            <VariantPicker options={options} selection={selection} onChange={onChange} showErrors={showErrors} idPrefix={`qa-${productId}`} />
            <div className="space-y-3">
              <button type="button" onClick={add} className={buttonClass("primary", "lg", "w-full")}>
                Add to bag
              </button>
              <Link href={`/products/${options.slug}`} className="block text-center text-xs underline underline-offset-4" onClick={onClose}>
                View full details
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}
