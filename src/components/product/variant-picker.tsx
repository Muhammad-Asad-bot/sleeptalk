"use client";

import { useEffect, useMemo } from "react";
import type { CartLineInput } from "@/lib/cart-types";
import type { OptionVariant, ProductOptions } from "@/lib/product-options";
import { cn, sortSizes, swatchBackground } from "@/lib/utils";

export type PickerSelection = {
  colour: string | null;
  /** standard: one size; set: size per component index */
  sizes: (string | null)[];
};

export type ResolvedSelection = {
  line: Omit<CartLineInput, "quantity"> | null;
  label: string;
  missing: string | null;
  lowStock: number | null;
  soldOut: boolean;
};

export function initialSelection(options: ProductOptions, preferredColour?: string | null): PickerSelection {
  const colour =
    (preferredColour && options.colours.find((c) => c.name === preferredColour)?.name) ||
    options.colours.find((c) => c.available)?.name ||
    options.colours[0]?.name ||
    null;
  const slots = options.type === "set" ? options.components.length : 1;
  const sizes: (string | null)[] = Array.from({ length: slots }, () => null);
  // Single-size products don't need a choice
  if (options.type === "standard") {
    const forColour = options.variants.filter((v) => v.color === colour);
    if (forColour.length === 1) sizes[0] = forColour[0].size;
  }
  return { colour, sizes };
}

export function resolveSelection(options: ProductOptions, sel: PickerSelection): ResolvedSelection {
  if (!sel.colour && options.colours.length > 1) return { line: null, label: "", missing: "Select a colour", lowStock: null, soldOut: false };
  if (options.type === "set") {
    const ids: string[] = [];
    let low: number | null = null;
    for (const [i, comp] of options.components.entries()) {
      const size = sel.sizes[i];
      if (!size) return { line: null, label: "", missing: `Select a ${comp.label.toLowerCase()} size`, lowStock: null, soldOut: false };
      const v = comp.variants.find((x) => x.color === sel.colour && x.size === size);
      if (!v || !v.available) return { line: null, label: "", missing: null, lowStock: null, soldOut: true };
      ids.push(v.id);
      if (v.lowStock != null) low = low == null ? v.lowStock : Math.min(low, v.lowStock);
    }
    return {
      line: { productId: options.id, componentVariantIds: ids },
      label: [sel.colour, ...options.components.map((c, i) => `${c.label} ${sel.sizes[i]}`)].join(" / "),
      missing: null,
      lowStock: low,
      soldOut: false,
    };
  }
  const size = sel.sizes[0];
  if (!size) return { line: null, label: "", missing: "Select a size", lowStock: null, soldOut: false };
  const v = options.variants.find((x) => x.color === sel.colour && x.size === size);
  if (!v || !v.available) return { line: null, label: "", missing: null, lowStock: null, soldOut: true };
  return { line: { productId: options.id, variantId: v.id }, label: `${v.color} / ${v.size}`, missing: null, lowStock: v.lowStock, soldOut: false };
}

function SizeGrid({
  legend,
  sizes,
  variants,
  colour,
  value,
  onChange,
  name,
  showError,
}: {
  legend: string;
  sizes: string[];
  variants: OptionVariant[];
  colour: string | null;
  value: string | null;
  onChange: (size: string) => void;
  name: string;
  showError: boolean;
}) {
  return (
    <fieldset>
      <legend className="mb-3 flex w-full items-center justify-between text-xs">
        <span className="label">
          {legend}
          {value ? <span className="ml-2 font-normal normal-case tracking-normal text-ash">{value}</span> : null}
        </span>
      </legend>
      <div className={cn("grid grid-cols-4 gap-2 sm:grid-cols-6", showError && !value && "outline outline-1 outline-offset-4 outline-sale/60")}>
        {sortSizes(sizes).map((size) => {
          const v = variants.find((x) => x.color === colour && x.size === size);
          const available = !!v?.available;
          const exists = !!v;
          return (
            <label
              key={size}
              className={cn(
                "relative grid h-11 cursor-pointer place-items-center border text-xs font-medium transition-colors",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                value === size ? "border-ink bg-ink text-canvas" : "border-line bg-paper hover:border-ink",
                !available && "cursor-not-allowed text-stone/70 hover:border-line",
              )}
            >
              <input
                type="radio"
                name={name}
                value={size}
                checked={value === size}
                disabled={!available}
                onChange={() => onChange(size)}
                className="sr-only"
              />
              <span className={cn(!available && "line-through decoration-1")}>{size}</span>
              <span className="sr-only">{!exists ? " (not offered in this colour)" : !available ? " (sold out)" : ""}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function VariantPicker({
  options,
  selection,
  onChange,
  showErrors = false,
  idPrefix,
}: {
  options: ProductOptions;
  selection: PickerSelection;
  onChange: (sel: PickerSelection) => void;
  showErrors?: boolean;
  idPrefix: string;
}) {
  const resolved = useMemo(() => resolveSelection(options, selection), [options, selection]);

  // If the chosen size isn't offered in a newly chosen colour, clear it.
  useEffect(() => {
    if (options.type === "standard" && selection.sizes[0]) {
      const ok = options.variants.some((v) => v.color === selection.colour && v.size === selection.sizes[0] && v.available);
      if (!ok) onChange({ ...selection, sizes: [null] });
    }
  }, [selection, options, onChange]);

  return (
    <div className="space-y-6">
      {options.colours.length ? (
        <fieldset>
          <legend className="label mb-3 text-xs">
            Colour <span className="ml-2 font-normal normal-case tracking-normal text-ash">{selection.colour}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {options.colours.map((c) => (
              <label
                key={c.name}
                title={c.name}
                className={cn(
                  "relative grid size-10 cursor-pointer place-items-center rounded-full border transition-colors",
                  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                  selection.colour === c.name ? "border-ink" : "border-transparent hover:border-line",
                )}
              >
                <input
                  type="radio"
                  name={`${idPrefix}-colour`}
                  value={c.name}
                  checked={selection.colour === c.name}
                  onChange={() => onChange({ colour: c.name, sizes: selection.sizes })}
                  className="sr-only"
                />
                {/* Sold-out colours keep their real colours (so two-tones stay recognisable) with a strike line. */}
                <span
                  className="relative size-7 overflow-hidden rounded-full border border-ink/15"
                  style={{ background: swatchBackground(c.hex) }}
                  aria-hidden
                >
                  {!c.available ? (
                    <span className="absolute left-1/2 top-1/2 h-px w-[140%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-sale shadow-[0_0_0_1px_rgba(255,255,255,0.7)]" />
                  ) : null}
                </span>
                <span className="sr-only">
                  {c.name}
                  {c.available ? "" : " (sold out)"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {options.type === "set" ? (
        options.components.map((comp, i) => (
          <SizeGrid
            key={comp.productId}
            legend={`${comp.label} size — ${comp.title}`}
            sizes={comp.sizes}
            variants={comp.variants}
            colour={selection.colour}
            value={selection.sizes[i]}
            name={`${idPrefix}-size-${i}`}
            showError={showErrors}
            onChange={(size) => {
              const sizes = [...selection.sizes];
              sizes[i] = size;
              onChange({ ...selection, sizes });
            }}
          />
        ))
      ) : (
        <SizeGrid
          legend="Size"
          sizes={options.sizes}
          variants={options.variants}
          colour={selection.colour}
          value={selection.sizes[0]}
          name={`${idPrefix}-size`}
          showError={showErrors}
          onChange={(size) => onChange({ ...selection, sizes: [size] })}
        />
      )}

      <div aria-live="polite" className="min-h-5 text-xs">
        {showErrors && resolved.missing ? <p className="text-sale">{resolved.missing}</p> : null}
        {resolved.soldOut ? <p className="text-sale">This combination is sold out.</p> : null}
        {resolved.lowStock != null ? <p className="text-warning">Only {resolved.lowStock} left in this size</p> : null}
      </div>
    </div>
  );
}
