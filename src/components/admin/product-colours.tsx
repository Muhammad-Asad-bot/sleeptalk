"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Plus, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { SmartImage } from "@/components/ui/smart-image";
import { FIT_CODES, FIT_LABEL, fitsOf, type FitCode } from "@/lib/fits";
import { cn, splitHex, swatchBackground } from "@/lib/utils";
import { abtn, inputSm } from "./ui";

/* Colour-first editing for standard products: each colour has its own photos and stock per size. */

export type ColourVariant = {
  id?: string;
  key: string;
  sku: string;
  color: string;
  colorHex: string;
  size: string;
  fit: FitCode;
  initialStock?: number;
  stock?: number;
  lowStockThreshold: number;
  allowBackorder: boolean;
  active: boolean;
  /** SKU not typed by staff: generated from the product title when saving. */
  autoSku?: boolean;
  /** Saved variant whose colour or size is currently switched off: kept (with its stock) and saved as inactive. */
  hiddenByGrid?: boolean;
  /** Saved variant: new stock count typed on the product page (saved as a logged adjustment). */
  editedStock?: number;
};
export type ColourImage = { key: string; url: string; alt: string; color: string | null };
type Colour = { key: string; name: string; hex: string };
/** Which fits each switched-on size is sold in, e.g. { S: ["standard", "oversized"], XL: ["standard"] } */
export type FitsBySize = Record<string, FitCode[]>;

export const PRESET_COLOURS: Record<string, string> = {
  Black: "#141414",
  Cream: "#E8E0D0",
  Charcoal: "#404042",
  White: "#FFFFFF",
  Grey: "#8A8A8A",
  Navy: "#1F2A44",
};
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];
/** Fixed standard sizes (North American / Canadian lettering), shown as chips in the editor. */
export const STANDARD_SIZES: { code: string; label: string }[] = [
  { code: "XS", label: "Extra small" },
  { code: "S", label: "Small" },
  { code: "M", label: "Medium" },
  { code: "L", label: "Large" },
  { code: "XL", label: "Extra large" },
  { code: "XXL", label: "2X large" },
];
const DEFAULT_SIZES = ["S", "M", "L"];

export const newKey = () => Math.random().toString(36).slice(2, 10);

export function sortSizes(list: string[]) {
  const rank = (s: string) => (SIZE_ORDER.includes(s) ? SIZE_ORDER.indexOf(s) : 100);
  return list.map((s, i) => ({ s, i })).sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i).map((x) => x.s);
}

/**
 * The colours and sizes currently switched on, worked out from saved variants: only those with an
 * active variant count, so a size that was switched off doesn't look selected.
 */
export function gridFromVariants(variants: { color: string; colorHex: string; size: string; fit: string; active: boolean }[]) {
  const live = variants.some((v) => v.active) ? variants.filter((v) => v.active) : variants;
  const colours = new Map<string, string>();
  for (const v of live) if (v.color && !colours.has(v.color)) colours.set(v.color, v.colorHex);
  const found = sortSizes([...new Set(live.map((v) => v.size).filter(Boolean))]);
  const sizes = found.length || variants.length ? found : DEFAULT_SIZES;
  const fitsBySize: FitsBySize = {};
  for (const s of sizes) {
    const f = fitsOf(live.filter((v) => v.size === s));
    fitsBySize[s] = f.length ? f : ["standard"];
  }
  return { colours: [...colours].map(([name, hex]) => ({ name, hex })), sizes, fitsBySize };
}

/**
 * One variant per switched-on colour × size × ticked fit. Saved rows outside the grid are kept but hidden
 * (saved as inactive, stock untouched) so switching them back on reuses the same SKU and stock.
 * `reactivate` turns rows back on when staff explicitly switch a colour or size on.
 */
export function syncVariants(
  colours: Colour[],
  sizes: string[],
  fitsBySize: FitsBySize,
  prev: ColourVariant[],
  reactivate?: (v: ColourVariant) => boolean,
) {
  const next: ColourVariant[] = [];
  const used = new Set<string>();
  for (const c of colours) {
    for (const size of sizes) {
      for (const fit of fitsBySize[size] ?? ["standard"]) {
        const found = prev.find((v) => v.color === c.name && v.size === size && v.fit === fit);
        if (found) {
          used.add(found.key);
          next.push({ ...found, colorHex: c.hex, hiddenByGrid: false, active: reactivate?.(found) ? true : found.active });
        } else {
          next.push({ key: newKey(), sku: "", autoSku: true, color: c.name, colorHex: c.hex, size, fit, initialStock: 0, lowStockThreshold: 3, allowBackorder: false, active: true });
        }
      }
    }
  }
  for (const v of prev) if (v.id && !used.has(v.key)) next.push({ ...v, hiddenByGrid: true });
  return next;
}

type Props = {
  variants: ColourVariant[];
  setVariants: (fn: (prev: ColourVariant[]) => ColourVariant[]) => void;
  images: ColourImage[];
  setImages: (fn: (prev: ColourImage[]) => ColourImage[]) => void;
  upload: (files: File[], colour: string | null) => Promise<void>;
  uploading: boolean;
  productTitle: string;
  /** Shop colour library (Admin → Colours): quick picks and two-tone halves. */
  library: { name: string; hex: string }[];
  /** Saves a newly made colour into the library so it can be reused on other products. */
  onLibraryAdd?: (colour: { name: string; hex: string }) => void;
};

export function ColoursSection({ variants, setVariants, images, setImages, upload, uploading, productTitle, library, onLibraryAdd }: Props) {
  const lib = library.length ? library : Object.entries(PRESET_COLOURS).map(([name, hex]) => ({ name, hex }));
  const libFind = (n: string) => lib.find((c) => c.name.toLowerCase() === n.trim().toLowerCase());
  const singles = lib.filter((c) => !c.hex.includes(","));
  const [colours, setColours] = useState<Colour[]>(() => gridFromVariants(variants).colours.map((c) => ({ key: newKey(), ...c })));
  const [sizes, setSizes] = useState<string[]>(() => gridFromVariants(variants).sizes);
  const [fitsBySize, setFitsBySize] = useState<FitsBySize>(() => gridFromVariants(variants).fitsBySize);
  const visible = variants.filter((v) => !v.hiddenByGrid);
  const [newColour, setNewColour] = useState("");
  const [newHex, setNewHex] = useState("#111111");
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [combo, setCombo] = useState(() => ({ upper: singles[0]?.name ?? "Black", lower: singles[1]?.name ?? singles[0]?.name ?? "Cream" }));
  const comboHex = `${libFind(combo.upper)?.hex ?? "#141414"},${libFind(combo.lower)?.hex ?? "#E8E0D0"}`;

  const applyColours = (next: Colour[], reactivate?: (v: ColourVariant) => boolean) => {
    setColours(next);
    setVariants((prev) => syncVariants(next, sizes, fitsBySize, prev, reactivate));
  };

  const addColour = (rawName: string, hex?: string) => {
    const name = rawName.trim().replace(/\s+/g, " ");
    if (!name) return;
    if (colours.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setNotice(`“${name}” is already added.`);
      return;
    }
    setNotice(null);
    const singleHex = (n: string) => {
      const h = libFind(n)?.hex;
      return h && !h.includes(",") ? h : null;
    };
    const known = libFind(name);
    // "Black / Cream" typed by hand becomes a two-tone colour when both halves are known colours.
    const halves = name.split("/").map((s) => s.trim());
    const twoTone = halves.length === 2 && singleHex(halves[0]) && singleHex(halves[1]) ? `${singleHex(halves[0])},${singleHex(halves[1])}` : null;
    const finalName = known?.name ?? name;
    const finalHex = hex ?? known?.hex ?? twoTone ?? "#111111";
    // Re-adding a colour that was removed earlier brings its saved sizes (and stock) back on sale.
    applyColours([...colours, { key: newKey(), name: finalName, hex: finalHex }], (v) => v.color === finalName);
    if (saveToLibrary && !known && onLibraryAdd) onLibraryAdd({ name: finalName, hex: finalHex });
    setNewColour("");
  };

  const renameColour = (c: Colour, rawName: string) => {
    const name = rawName.trim().replace(/\s+/g, " ");
    if (name === c.name) return true;
    if (!name || colours.some((o) => o.key !== c.key && o.name.toLowerCase() === name.toLowerCase())) {
      setNotice(name ? `Another colour is already called “${name}”.` : "A colour needs a name.");
      return false;
    }
    setNotice(null);
    setColours((prev) => prev.map((o) => (o.key === c.key ? { ...o, name } : o)));
    setVariants((prev) => prev.map((v) => (v.color === c.name && !v.hiddenByGrid ? { ...v, color: name } : v)));
    setImages((prev) => prev.map((i) => (i.color === c.name ? { ...i, color: name } : i)));
    return true;
  };

  const setHex = (c: Colour, hex: string) => {
    setColours((prev) => prev.map((o) => (o.key === c.key ? { ...o, hex } : o)));
    setVariants((prev) => prev.map((v) => (v.color === c.name ? { ...v, colorHex: hex } : v)));
  };

  const removeColour = (c: Colour) => {
    const photos = images.filter((i) => i.color === c.name).length;
    const stocked = visible.some((v) => v.color === c.name && v.id && (v.stock ?? 0) > 0);
    const parts = [photos ? `its ${photos} photo${photos === 1 ? "" : "s"}` : "", stocked ? "it will stop being sold (stock is kept in Inventory)" : ""].filter(Boolean);
    if (!window.confirm(`Remove ${c.name}${parts.length ? ` — ${parts.join(", and ")}` : ""}?`)) return;
    setImages((prev) => prev.filter((i) => i.color !== c.name));
    applyColours(colours.filter((o) => o.key !== c.key));
  };

  const toggleSize = (size: string) => {
    if (sizes.includes(size)) {
      const stocked = visible.some((v) => v.size === size && v.id && (v.stock ?? 0) > 0);
      if (stocked && !window.confirm(`Stop selling size ${size}? Its stock is kept and comes back if you switch the size on again.`)) return;
      const next = sizes.filter((s) => s !== size);
      setSizes(next);
      setVariants((prev) => syncVariants(colours, next, fitsBySize, prev));
    } else {
      const next = sortSizes([...sizes, size]);
      // A newly switched-on size starts in Standard fit (tick Oversized below to add it).
      const nextFits = { ...fitsBySize, [size]: fitsBySize[size]?.length ? fitsBySize[size] : (["standard"] as FitCode[]) };
      setSizes(next);
      setFitsBySize(nextFits);
      // Switching a size on puts every colour in that size on sale (reusing saved stock if any).
      setVariants((prev) => syncVariants(colours, next, nextFits, prev, (v) => v.size === size && nextFits[size].includes(v.fit)));
    }
  };

  /** Tick or untick one fit for one size (every size keeps at least one fit). */
  const toggleFit = (size: string, fit: FitCode) => {
    const current = fitsBySize[size] ?? ["standard"];
    const on = current.includes(fit);
    if (on && current.length === 1) return;
    if (on) {
      const stocked = visible.some((v) => v.size === size && v.fit === fit && v.id && (v.stock ?? 0) > 0);
      if (stocked && !window.confirm(`Stop selling size ${size} in ${FIT_LABEL[fit]} fit? Its stock is kept and comes back if you tick it again.`)) return;
    }
    const nextList = on ? current.filter((f) => f !== fit) : FIT_CODES.filter((f) => f === fit || current.includes(f));
    const nextFits = { ...fitsBySize, [size]: nextList };
    setFitsBySize(nextFits);
    setVariants((prev) => syncVariants(colours, sizes, nextFits, prev, on ? undefined : (v) => v.size === size && v.fit === fit));
  };
  const usedFits = FIT_CODES.filter((f) => sizes.some((s) => (fitsBySize[s] ?? ["standard"]).includes(f)));

  const setSavedStock = (variantKey: string, value: string) =>
    setVariants((prev) => prev.map((v) => (v.key === variantKey ? { ...v, editedStock: Math.max(0, Math.floor(Number(value) || 0)) } : v)));

  const setStock = (variantKey: string, value: string) =>
    setVariants((prev) => prev.map((v) => (v.key === variantKey ? { ...v, initialStock: Math.max(0, Math.floor(Number(value) || 0)) } : v)));

  // Fixed standard sizes, plus any older non-standard size a product already uses.
  const sizeChoices = sortSizes([...new Set([...STANDARD_SIZES.map((x) => x.code), ...sizes])]);
  const sizeLabel = (code: string) => STANDARD_SIZES.find((x) => x.code === code)?.label ?? code;

  return (
    <div className="space-y-6">
      {/* Sizes */}
      <div>
        <p className="mb-2 text-xs font-medium text-charcoal">Sizes you sell <span className="font-normal text-stone">— tap to switch a size on or off for every colour</span></p>
        <div className="flex flex-wrap items-center gap-2">
          {sizeChoices.map((s) => {
            const on = sizes.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => toggleSize(s)}
                className={cn("flex h-12 min-w-16 flex-col items-center justify-center border px-3 transition-colors", on ? "border-ink bg-ink text-canvas" : "border-line bg-white text-ash hover:border-ink")}
              >
                <span className="text-xs font-semibold">{s}</span>
                <span className={cn("text-[0.5625rem]", on ? "text-canvas/70" : "text-stone")}>{sizeLabel(s)}</span>
              </button>
            );
          })}
        </div>
        {sizes.length ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-charcoal">
              Fits for each size <span className="font-normal text-stone">— tick Standard fit, Oversized fit or both. Each fit has its own stock.</span>
            </p>
            <table className="text-xs">
              <thead>
                <tr className="text-[0.625rem] uppercase tracking-[0.1em] text-ash">
                  <th className="py-1.5 pr-6 text-left font-semibold">Size</th>
                  {FIT_CODES.map((f) => (
                    <th key={f} className="px-4 py-1.5 font-semibold">{FIT_LABEL[f]} fit</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizes.map((s) => (
                  <tr key={s} className="border-t border-line">
                    <td className="py-1.5 pr-6 font-semibold">{s}</td>
                    {FIT_CODES.map((f) => {
                      const list = fitsBySize[s] ?? ["standard"];
                      const on = list.includes(f);
                      const onlyOne = on && list.length === 1;
                      return (
                        <td key={f} className="px-4 py-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={onlyOne}
                            onChange={() => toggleFit(s, f)}
                            className="size-4 accent-ink disabled:opacity-60"
                            aria-label={`Sell size ${s} in ${FIT_LABEL[f]} fit`}
                            title={onlyOne ? "Each size needs at least one fit" : undefined}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="mt-2 text-[0.6875rem] text-stone">
          Standard Canadian (North American) sizing. Shoppers see Standard and Oversized measurements on the <a href="/size-guide" target="_blank" rel="noreferrer" className="underline">size guide</a>, and pick a fit on the product page when a product is sold in both.
        </p>
      </div>

      {notice ? <p role="status" className="border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">{notice}</p> : null}

      {/* One block per colour */}
      {colours.map((c) => {
        const photos = images.filter((i) => i.color === c.name);
        const groups = usedFits.map((f) => ({
          fit: f,
          rows: sizes
            .filter((s) => (fitsBySize[s] ?? ["standard"]).includes(f))
            .map((s) => visible.find((v) => v.color === c.name && v.size === s && v.fit === f))
            .filter((v): v is ColourVariant => !!v),
        }));
        const rows = groups.flatMap((g) => g.rows);
        return (
          <section key={c.key} className="border border-line bg-white p-4" aria-label={`Colour ${c.name}`}>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <SwatchPickers value={c.hex} name={c.name} onChange={(hex) => setHex(c, hex)} />
              <input
                defaultValue={c.name}
                onBlur={(e) => {
                  if (!renameColour(c, e.target.value)) e.target.value = c.name;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="h-9 min-w-0 flex-1 border border-transparent bg-transparent px-1 text-base font-semibold hover:border-line focus:border-ink focus:bg-white focus:outline-none"
                aria-label="Colour name"
                maxLength={60}
              />
              <span className="text-xs text-stone">{photos.length} photo{photos.length === 1 ? "" : "s"}</span>
              <button type="button" onClick={() => removeColour(c)} className={abtn("ghost", "sm")} aria-label={`Remove colour ${c.name}`}>
                <Trash2 className="size-3.5 text-sale" /> Remove
              </button>
            </div>

            <PhotoGrid
              photos={photos}
              allImages={images}
              setImages={setImages}
              onFiles={(files) => upload(files, c.name)}
              uploading={uploading}
              label={`Add ${c.name} photos`}
            />

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-charcoal">Stock for {c.name}</p>
              {rows.length ? (
                <div className="space-y-3">
                {groups.filter((g) => g.rows.length).map((g) => (
                <div key={g.fit}>
                {usedFits.length > 1 ? <p className="mb-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-ash">{FIT_LABEL[g.fit]} fit</p> : null}
                <div className="flex flex-wrap gap-2">
                  {g.rows.map((v) => (
                    <label key={v.key} className="flex w-20 flex-col border border-line p-2 text-center">
                      <span className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-ash">{v.size}</span>
                      {v.id ? (
                        <>
                          <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            value={v.editedStock ?? v.stock ?? 0}
                            onChange={(e) => setSavedStock(v.key, e.target.value)}
                            className={cn(
                              "mt-1 h-8 w-full border bg-white text-center text-sm tabular-nums focus:border-ink focus:outline-none",
                              v.editedStock != null && v.editedStock !== v.stock ? "border-ink font-semibold" : "border-line",
                            )}
                            aria-label={`${c.name} size ${v.size} ${FIT_LABEL[v.fit]} fit stock`}
                          />
                          {v.editedStock != null && v.editedStock !== v.stock ? (
                            <span className="mt-0.5 text-[0.5625rem] text-stone">was {v.stock ?? 0}</span>
                          ) : null}
                        </>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={v.initialStock ?? 0}
                          onChange={(e) => setStock(v.key, e.target.value)}
                          className="mt-1 h-8 w-full border border-line bg-white text-center text-sm tabular-nums focus:border-ink focus:outline-none"
                          aria-label={`${c.name} size ${v.size} ${FIT_LABEL[v.fit]} fit starting stock`}
                        />
                      )}
                    </label>
                  ))}
                </div>
                </div>
                ))}
                </div>
              ) : (
                <p className="text-xs text-stone">Pick at least one size above.</p>
              )}
              {rows.some((v) => v.id) ? (
                <p className="mt-2 text-[0.6875rem] text-stone">
                  Type the number you have in stock for each size. Changes are saved with the product and recorded in the stock history (see <Link href={`/admin/inventory?q=${encodeURIComponent(productTitle)}`} className="underline">Inventory</Link>). Sales made while this page is open are kept.
                </p>
              ) : null}
            </div>
          </section>
        );
      })}

      {/* Add a colour */}
      <div className="border border-dashed border-line bg-paper p-4">
        <p className="mb-2 text-xs font-medium text-charcoal">{colours.length ? "Add another colour" : "Add your first colour"}</p>
        <div className="flex flex-wrap items-center gap-2">
          {lib
            .filter(({ name }) => !colours.some((c) => c.name.toLowerCase() === name.toLowerCase()))
            .map(({ name, hex }) => (
              <button key={name} type="button" onClick={() => addColour(name, hex)} className="flex h-9 items-center gap-2 border border-line bg-white px-3 text-xs hover:border-ink">
                <span className="size-4 border border-line" style={{ background: swatchBackground(hex) }} aria-hidden />
                {name}
              </button>
            ))}
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              addColour(newColour, libFind(newColour) ? undefined : newHex);
            }}
          >
            <input type="color" value={newHex} onChange={(e) => setNewHex(e.target.value)} className="h-8 w-9 cursor-pointer border border-line" aria-label="Shade for the new colour" title="Pick the shade" />
            <input value={newColour} onChange={(e) => setNewColour(e.target.value)} placeholder="New colour, e.g. Olive" className={`${inputSm} w-44`} aria-label="New colour name" maxLength={60} />
            <button type="submit" className={abtn("secondary", "sm")}><Plus className="size-3.5" /> Add</button>
          </form>
        </div>
        <form
          className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs"
          onSubmit={(e) => {
            e.preventDefault();
            if (combo.upper === combo.lower) {
              setNotice("Pick two different colours for a two-tone combination.");
              return;
            }
            addColour(`${combo.upper} / ${combo.lower}`, comboHex);
          }}
        >
          <span className="font-medium text-charcoal">Two-tone combination:</span>
          <span className="size-6 border border-line" style={{ background: swatchBackground(comboHex) }} aria-hidden />
          <label className="flex items-center gap-1">
            Upper
            <select value={combo.upper} onChange={(e) => setCombo({ ...combo, upper: e.target.value })} className={inputSm}>
              {singles.map((c) => <option key={c.name}>{c.name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1">
            Lower
            <select value={combo.lower} onChange={(e) => setCombo({ ...combo, lower: e.target.value })} className={inputSm}>
              {singles.map((c) => <option key={c.name}>{c.name}</option>)}
            </select>
          </label>
          <button type="submit" className={abtn("secondary", "sm")}><Plus className="size-3.5" /> Add combination</button>
          <span className="w-full text-[0.6875rem] text-stone">Fine-tune either half afterwards with its colour picker, or turn on “Two-tone” on any colour.</span>
          {onLibraryAdd ? (
            <label className="flex w-full items-center gap-2 text-[0.6875rem] text-ash">
              <input type="checkbox" checked={saveToLibrary} onChange={(e) => setSaveToLibrary(e.target.checked)} className="size-3.5 accent-ink" />
              Save new colours to the colour library so they&apos;re one click away on other products (manage them in Admin → Colours)
            </label>
          ) : null}
        </form>
      </div>

      {/* Photos for every colour */}
      <section className="border border-line bg-white p-4" aria-label="Photos for all colours">
        <p className="mb-1 text-sm font-semibold">Photos for all colours</p>
        <p className="mb-3 text-xs text-ash">Shown whichever colour a shopper picks — e.g. detail shots, the back print or lifestyle photos.</p>
        <PhotoGrid
          photos={images.filter((i) => !i.color)}
          allImages={images}
          setImages={setImages}
          onFiles={(files) => upload(files, null)}
          uploading={uploading}
          label="Add photos"
        />
      </section>
    </div>
  );
}

/** Swatch editor: one colour, or upper + lower halves for a two-tone garment (stored as "#upper,#lower"). */
function SwatchPickers({ value, name, onChange }: { value: string; name: string; onChange: (value: string) => void }) {
  const [upper, lower] = splitHex(value);
  return (
    <div className="flex items-center gap-2">
      <span className="size-9 shrink-0 border border-line" style={{ background: swatchBackground(value) }} title="Swatch shown to shoppers" aria-hidden />
      <label className="flex flex-col items-center text-[0.5625rem] uppercase tracking-[0.08em] text-stone">
        <input type="color" value={upper} onChange={(e) => onChange(lower ? `${e.target.value},${lower}` : e.target.value)} className="h-7 w-9 cursor-pointer border border-line" aria-label={lower ? `Upper colour for ${name}` : `Colour for ${name}`} />
        {lower ? "Upper" : "Colour"}
      </label>
      {lower ? (
        <label className="flex flex-col items-center text-[0.5625rem] uppercase tracking-[0.08em] text-stone">
          <input type="color" value={lower} onChange={(e) => onChange(`${upper},${e.target.value}`)} className="h-7 w-9 cursor-pointer border border-line" aria-label={`Lower colour for ${name}`} />
          Lower
        </label>
      ) : null}
      <label className="flex items-center gap-1.5 text-xs text-ash">
        <input
          type="checkbox"
          checked={!!lower}
          onChange={(e) => onChange(e.target.checked ? `${upper},${upper === "#e8e0d0" || upper === "#E8E0D0" ? "#141414" : "#E8E0D0"}` : upper)}
          className="size-4 accent-ink"
        />
        Two-tone
      </label>
    </div>
  );
}

/** Thumbnails for one colour (or all colours) with upload, drag-and-drop, reorder, main photo and alt text. */
function PhotoGrid({
  photos,
  allImages,
  setImages,
  onFiles,
  uploading,
  label,
}: {
  photos: ColourImage[];
  allImages: ColourImage[];
  setImages: Props["setImages"];
  onFiles: (files: File[]) => void;
  uploading: boolean;
  label: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const mainKey = allImages[0]?.key;

  /** Swap with the nearest photo of the same group, so order within a colour is what staff see. */
  const move = (img: ColourImage, dir: -1 | 1) =>
    setImages((prev) => {
      const i = prev.findIndex((x) => x.key === img.key);
      let j = i + dir;
      while (j >= 0 && j < prev.length && prev[j].color !== img.color) j += dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
        if (files.length) onFiles(files);
      }}
      className={cn("flex flex-wrap gap-3 border border-dashed p-3 transition-colors", over ? "border-ink bg-cream/40" : "border-transparent")}
    >
      {photos.map((img, idx) => (
        <figure key={img.key} className="w-28">
          <div className="group relative aspect-[4/5] overflow-hidden bg-cream">
            {img.url ? <SmartImage src={img.url} alt={img.alt} fill sizes="112px" className="object-cover" showDemoTag={false} /> : null}
            {img.key === mainKey ? (
              <span className="absolute left-1 top-1 bg-ink px-1.5 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.08em] text-canvas">Main photo</span>
            ) : null}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/70 p-1 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
              <button type="button" disabled={idx === 0} onClick={() => move(img, -1)} className="grid size-6 place-items-center text-canvas disabled:opacity-30" aria-label="Move photo left"><ArrowLeft className="size-3.5" /></button>
              {img.key !== mainKey ? (
                <button
                  type="button"
                  onClick={() => setImages((prev) => [img, ...prev.filter((x) => x.key !== img.key)])}
                  className="grid size-6 place-items-center text-canvas"
                  aria-label="Make main photo"
                  title="Make this the main photo (shown on product cards)"
                >
                  <Star className="size-3.5" />
                </button>
              ) : null}
              <button type="button" disabled={idx === photos.length - 1} onClick={() => move(img, 1)} className="grid size-6 place-items-center text-canvas disabled:opacity-30" aria-label="Move photo right"><ArrowRight className="size-3.5" /></button>
              <button type="button" onClick={() => setImages((prev) => prev.filter((x) => x.key !== img.key))} className="grid size-6 place-items-center text-canvas" aria-label="Remove photo"><X className="size-3.5" /></button>
            </div>
          </div>
          <input
            value={img.alt}
            onChange={(e) => setImages((prev) => prev.map((x) => (x.key === img.key ? { ...x, alt: e.target.value } : x)))}
            placeholder="Describe the photo"
            className="mt-1 h-7 w-full border border-line bg-white px-1.5 text-[0.6875rem] focus:border-ink focus:outline-none"
            aria-label="Photo description (alt text)"
            maxLength={200}
          />
        </figure>
      ))}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex aspect-[4/5] w-28 flex-col items-center justify-center gap-1.5 border border-dashed border-line bg-paper px-2 text-center text-[0.6875rem] text-ash hover:border-ink hover:text-ink disabled:opacity-50"
      >
        <ImagePlus className="size-5" />
        {uploading ? "Uploading…" : label}
        <span className="text-[0.5625rem] text-stone">or drop files here</span>
      </button>
    </div>
  );
}
