"use client";

import { useEffect, useMemo } from "react";
import type { CartLineInput } from "@/lib/cart-types";
import { FIT_CODES, FIT_HINT, FIT_LABEL, variantLabel, type FitCode } from "@/lib/fits";
import type { OptionVariant, ProductOptions } from "@/lib/product-options";
import { cn, sortSizes, swatchBackground } from "@/lib/utils";

export type PickerSelection = {
  colour: string | null;
  /** Chosen fit. Only asked for when the product is sold in more than one fit. */
  fit: FitCode | null;
  /** standard: one size; set: size per component index */
  sizes: (string | null)[];
};

/** Does this variant belong to the chosen fit? (Any fit while none is chosen, or when only one is sold.) */
function fitMatches(options: ProductOptions, v: OptionVariant, fit: FitCode | null) {
  return options.fits.length < 2 || fit == null || v.fit === fit;
}

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
  // One fit on sale: nothing to choose. Several: the shopper picks, like a size.
  const fit = options.fits.length === 1 ? options.fits[0] : null;
  // Single-size products don't need a choice
  if (options.type === "standard" && options.fits.length < 2) {
    const forColour = options.variants.filter((v) => v.color === colour);
    if (forColour.length === 1) sizes[0] = forColour[0].size;
  }
  return { colour, fit, sizes };
}

export function resolveSelection(options: ProductOptions, sel: PickerSelection): ResolvedSelection {
  if (!sel.colour && options.colours.length > 1) return { line: null, label: "", missing: "Select a colour", lowStock: null, soldOut: false };
  const multiFit = options.fits.length > 1;
  if (multiFit && !sel.fit) return { line: null, label: "", missing: "Select a fit", lowStock: null, soldOut: false };
  if (options.type === "set") {
    const ids: string[] = [];
    let low: number | null = null;
    for (const [i, comp] of options.components.entries()) {
      const size = sel.sizes[i];
      if (!size) return { line: null, label: "", missing: `Select a ${comp.label.toLowerCase()} size`, lowStock: null, soldOut: false };
      const v = comp.variants.find((x) => x.color === sel.colour && x.size === size && fitMatches(options, x, sel.fit));
      if (!v || !v.available) return { line: null, label: "", missing: null, lowStock: null, soldOut: true };
      ids.push(v.id);
      if (v.lowStock != null) low = low == null ? v.lowStock : Math.min(low, v.lowStock);
    }
    return {
      line: { productId: options.id, componentVariantIds: ids },
      label: [sel.colour, ...(multiFit && sel.fit ? [FIT_LABEL[sel.fit]] : []), ...options.components.map((c, i) => `${c.label} ${sel.sizes[i]}`)].join(" / "),
      missing: null,
      lowStock: low,
      soldOut: false,
    };
  }
  const size = sel.sizes[0];
  if (!size) return { line: null, label: "", missing: "Select a size", lowStock: null, soldOut: false };
  const v = options.variants.find((x) => x.color === sel.colour && x.size === size && fitMatches(options, x, sel.fit));
  if (!v || !v.available) return { line: null, label: "", missing: null, lowStock: null, soldOut: true };
  return { line: { productId: options.id, variantId: v.id }, label: variantLabel(v, multiFit), missing: null, lowStock: v.lowStock, soldOut: false };
}

function SizeGrid({
  legend,
  sizes,
  variants,
  colour,
  inFit,
  value,
  onChange,
  name,
  showError,
}: {
  legend: string;
  sizes: string[];
  variants: OptionVariant[];
  colour: string | null;
  /** Limits availability to the chosen fit */
  inFit: (v: OptionVariant) => boolean;
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
          const matching = variants.filter((x) => x.color === colour && x.size === size && inFit(x));
          const available = matching.some((x) => x.available);
          const exists = matching.length > 0;
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
              <span className="sr-only">{!exists ? " (not offered in this colour or fit)" : !available ? " (sold out)" : ""}</span>
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
      const ok = options.variants.some((v) => v.color === selection.colour && v.size === selection.sizes[0] && fitMatches(options, v, selection.fit) && v.available);
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
                  onChange={() => onChange({ ...selection, colour: c.name })}
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

      {/* Fit is always shown so shoppers see which fit they're buying. Fits this product isn't
          made in are shown struck through (like sold-out sizes) until stock is added in admin. */}
      {options.fits.length ? (
        <fieldset>
          <legend className="label mb-3 text-xs">
            Fit {selection.fit ? <span className="ml-2 font-normal normal-case tracking-normal text-ash">{FIT_LABEL[selection.fit]}</span> : null}
          </legend>
          <div className={cn("grid grid-cols-2 gap-2", showErrors && !selection.fit && "outline outline-1 outline-offset-4 outline-sale/60")}>
            {FIT_CODES.map((f) => {
              const offered = options.fits.includes(f);
              const chosen = selection.fit === f;
              return (
                <label
                  key={f}
                  className={cn(
                    "flex flex-col justify-center border px-3 py-2.5 transition-colors",
                    "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                    chosen ? "border-ink bg-ink text-canvas" : "border-line bg-paper",
                    offered ? "cursor-pointer" : "cursor-not-allowed text-stone/70",
                    offered && !chosen && "hover:border-ink",
                  )}
                >
                  <input
                    type="radio"
                    name={`${idPrefix}-fit`}
                    value={f}
                    checked={chosen}
                    disabled={!offered}
                    onChange={() => onChange({ ...selection, fit: f })}
                    className="sr-only"
                  />
                  <span className={cn("text-xs font-semibold", !offered && "line-through decoration-1")}>{FIT_LABEL[f]} fit</span>
                  <span className={cn("mt-0.5 text-[0.6875rem] leading-snug", chosen ? "text-canvas/75" : offered ? "text-ash" : "text-stone/70")}>
                    {offered ? FIT_HINT[f] : "Not available for this product"}
                  </span>
                </label>
              );
            })}
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
            inFit={(v) => fitMatches(options, v, selection.fit)}
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
          inFit={(v) => fitMatches(options, v, selection.fit)}
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
