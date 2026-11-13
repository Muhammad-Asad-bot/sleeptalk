"use client";

import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveProductAction, type ProductPayload } from "@/app/admin/_actions/products";
import { addLibraryColourAction, quickCreateCategoryAction, removeLibraryColourAction } from "@/app/admin/_actions/catalog";
import { SmartImage } from "@/components/ui/smart-image";
import { compressImage } from "@/lib/compress-image";
import { variantLabel } from "@/lib/fits";
import { MARKETS, MARKET_CODES, type MarketCode } from "@/lib/markets";
import { slugify, swatchBackground } from "@/lib/utils";
import { ColoursSection, gridFromVariants, newKey as key, type ColourImage, type ColourVariant } from "./product-colours";
import { abtn, adminInput, adminSelect, adminTextarea, AField, Card, inputSm } from "./ui";

type VariantRow = ColourVariant;
type ImageRow = ColourImage;

export type EditorInitial = Omit<ProductPayload, "variants" | "images"> & {
  variants: (ProductPayload["variants"][number] & { stock?: number })[];
  images: ProductPayload["images"];
};

/** SKUs for new variants nobody typed by hand: ST-<title initials>-<colour>-<size>[-OS for oversized], unique within the product. */
function fillAutoSkus(title: string, variants: VariantRow[]) {
  const prefix = `ST-${slugify(title).split("-").map((w) => w[0]).join("").toUpperCase().slice(0, 5) || "NEW"}`;
  const taken = new Set(variants.filter((v) => !v.autoSku && v.sku).map((v) => v.sku));
  return variants.map((v) => {
    if (!v.autoSku) return v;
    const fitSuffix = v.fit === "oversized" ? "-OS" : "";
    const base = `${prefix}-${v.color.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "COL"}-${v.size.replace(/[^A-Za-z0-9]/g, "")}${fitSuffix}`;
    let sku = base;
    for (let n = 2; taken.has(sku); n++) sku = `${base}-${n}`;
    taken.add(sku);
    return { ...v, sku };
  });
}

export function ProductEditor({
  initial,
  categories,
  componentOptions,
  markets = MARKET_CODES,
  colourLibrary = [],
}: {
  initial: EditorInitial;
  categories: { id: string; name: string }[];
  componentOptions: { id: string; title: string }[];
  /** Markets the store sells in; prices for other markets are kept but not shown. */
  markets?: MarketCode[];
  /** Shop colour library (Admin → Colours). */
  colourLibrary?: { name: string; hex: string }[];
}) {
  const router = useRouter();
  const [p, setP] = useState({
    ...initial,
    preorder: initial.preorder ?? false,
    preorderMessage: initial.preorderMessage ?? "Ships as soon as possible",
  });
  const [categoryList, setCategoryList] = useState(categories);
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [library, setLibrary] = useState(colourLibrary);
  const [saleMarkets, setSaleMarkets] = useState<Record<MarketCode, boolean>>(() =>
    Object.fromEntries(MARKET_CODES.map((market) => [market, Boolean(initial.prices[market]?.compareAt.trim())])) as Record<MarketCode, boolean>,
  );

  const createCategory = async () => {
    if (!newCategory?.trim()) return;
    setCreatingCategory(true);
    setError(null);
    const result = await quickCreateCategoryAction(newCategory);
    setCreatingCategory(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCategoryList((prev) => (prev.some((c) => c.id === result.id) ? prev : [...prev, { id: result.id, name: result.name }]));
    set("categoryId", result.id);
    setNewCategory(null);
  };

  const addToLibrary = async (colour: { name: string; hex: string }) => {
    const result = await addLibraryColourAction(colour);
    if (!result.ok) return result.error;
    setLibrary(result.list);
    return null;
  };
  const removeFromLibrary = async (name: string) => {
    const result = await removeLibraryColourAction(name);
    if (!result.ok) return result.error;
    setLibrary(result.list);
    return null;
  };
  const [variants, setVariants] = useState<VariantRow[]>(() => {
    // Saved variants whose colour/size is switched off stay in the list (hidden) so they can be switched back on.
    const grid = gridFromVariants(initial.variants);
    const onColours = new Set(grid.colours.map((c) => c.name));
    const onFit = (v: { size: string; fit: string }) => (grid.fitsBySize[v.size] ?? []).includes(v.fit as never);
    return initial.variants.map((v) => ({ ...v, key: key(), hiddenByGrid: initial.type === "standard" && (!onColours.has(v.color) || !onFit(v)) }));
  });
  const visibleVariants = variants.filter((v) => !v.hiddenByGrid);
  const [images, setImages] = useState<ImageRow[]>(() => initial.images.map((i) => ({ ...i, key: key() })));
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof EditorInitial>(k: K, v: EditorInitial[K]) => {
    setSaved(false);
    setP((prev) => ({ ...prev, [k]: v }));
  };
  const colours = [...new Set(variants.map((v) => v.color).filter(Boolean))];

  // Warn before leaving the page with unsaved edits (it's a long form).
  const strip = (row: { key: string; autoSku?: boolean }) => {
    const copy: Record<string, unknown> = { ...row };
    delete copy.key;
    delete copy.autoSku;
    delete copy.hiddenByGrid;
    return copy;
  };
  const snapshotOf = (prod: EditorInitial, vs: object[], is: object[], sale: Record<MarketCode, boolean>) =>
    JSON.stringify({ prod, vs, is, sale });
  const [initialSnapshot] = useState(() => snapshotOf(initial, variants.map(strip), images.map(strip), saleMarkets));
  const dirty = !saved && !pending && snapshotOf(p, variants.map(strip), images.map(strip), saleMarkets) !== initialSnapshot;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** Uploads photos; `colour` tags them so they show when shoppers pick that colour (null = all colours). */
  const upload = async (files: File[], colour: string | null = null) => {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", await compressImage(file));
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(`${file.name}: ${data.error ?? "Upload failed"}`);
        const alt = [p.title, colour].filter(Boolean).join(" — ");
        setImages((prev) => [...prev, { key: key(), url: data.url!, alt, color: colour }]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = () => {
    setError(null);
    if (p.preorder && !p.preorderMessage.trim()) {
      setError("Enter the shipping message for pre-orders.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const incompleteSale = (markets.length ? markets : MARKET_CODES).find(
      (market) => saleMarkets[market] && !p.prices[market]?.compareAt.trim(),
    );
    if (incompleteSale) {
      setError(`Enter the original ${MARKETS[incompleteSale].currency} price to add this product to Sale.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (p.type === "standard" && !visibleVariants.length) {
      setError("Add at least one colour and one size before saving.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    startTransition(async () => {
      const withSkus = fillAutoSkus(p.title, variants);
      const payload: ProductPayload = {
        ...p,
        slug: p.slug || slugify(p.title),
        images: images.map((i) => ({ url: i.url, alt: i.alt, color: i.color })),
        variants: withSkus.map((v) => ({
          id: v.id,
          sku: v.sku,
          color: v.color,
          colorHex: v.colorHex,
          size: v.size,
          fit: v.fit,
          initialStock: v.initialStock,
          stockDelta: v.id && v.editedStock != null && v.editedStock !== (v.stock ?? 0) ? v.editedStock - (v.stock ?? 0) : undefined,
          lowStockThreshold: v.lowStockThreshold,
          allowBackorder: v.allowBackorder,
          active: v.active && !v.hiddenByGrid,
        })),
      };
      const result = await saveProductAction(payload);
      if (!result.ok) {
        setError(result.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setSaved(true);
      // Stock edits are now saved: show them as the current count so a second save doesn't apply them twice.
      setVariants((prev) => prev.map((v) => (v.editedStock != null ? { ...v, stock: v.editedStock, editedStock: undefined } : v)));
      // Existing products: the action revalidates this page, so the fresh data arrives with the save response.
      // (A second router.refresh() here would cancel that stream mid-write.)
      if (!p.id) router.replace(`/admin/products/${result.id}?ok=Product+created`);
    });
  };

  const move = <T,>(list: T[], i: number, dir: -1 | 1) => {
    const next = [...list];
    const j = i + dir;
    if (j < 0 || j >= next.length) return list;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };

  return (
    <div className="pb-24">
      {error ? <div role="alert" className="mb-5 border border-sale/40 bg-sale/5 px-4 py-3 text-sm text-sale">{error}</div> : null}
      {saved ? <div role="status" className="mb-5 border border-success/40 bg-success/5 px-4 py-3 text-sm text-success">Saved.</div> : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="1 · Basics">
            <div className="grid gap-4">
              <AField label="Title">
                <input
                  value={p.title}
                  onChange={(e) => {
                    set("title", e.target.value);
                    if (!slugTouched) setP((prev) => ({ ...prev, title: e.target.value, slug: slugify(e.target.value) }));
                  }}
                  className={adminInput}
                  maxLength={140}
                />
              </AField>
              <AField label="URL slug" hint={`Shown at /products/${p.slug || "…"} — changing it keeps the old URL redirecting here.`}>
                <input value={p.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} className={adminInput} />
              </AField>
              <AField label="Description">
                <textarea value={p.description} onChange={(e) => set("description", e.target.value)} className={`${adminTextarea} min-h-32`} maxLength={5000} />
              </AField>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <span className="mb-1 block text-xs font-medium text-charcoal">Category</span>
                  {newCategory === null ? (
                    <select
                      value={p.categoryId ?? ""}
                      onChange={(e) => (e.target.value === "__new" ? setNewCategory("") : set("categoryId", e.target.value || null))}
                      className={adminSelect}
                      aria-label="Category"
                    >
                      <option value="">— None —</option>
                      {categoryList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      <option value="__new">+ New category…</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            createCategory();
                          } else if (e.key === "Escape") setNewCategory(null);
                        }}
                        placeholder="New category, e.g. Caps"
                        className={adminInput}
                        aria-label="New category name"
                        maxLength={80}
                      />
                      <button type="button" onClick={createCategory} disabled={creatingCategory || !newCategory.trim()} className={abtn("primary")}>
                        {creatingCategory ? "Adding…" : "Add"}
                      </button>
                      <button type="button" onClick={() => setNewCategory(null)} className={abtn("ghost")}>Cancel</button>
                    </div>
                  )}
                  <span className="mt-1 block text-[0.6875rem] text-stone">
                    New categories appear in the shop menu straight away. Add an image or reorder them in <a href="/admin/categories" target="_blank" rel="noreferrer" className="underline">Categories</a>.
                  </span>
                </div>
                <AField label="Tags" hint="Comma separated, e.g. essentials, graphic">
                  <input
                    defaultValue={p.tags.join(", ")}
                    onBlur={(e) => set("tags", e.target.value.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))}
                    className={adminInput}
                  />
                </AField>
              </div>
            </div>
          </Card>

          <Card title={markets.length === 1 ? `2 · Price (${MARKETS[markets[0]].currency})` : "2 · Pricing by market"}>
            <div className="grid gap-4 md:grid-cols-2">
              {(markets.length ? markets : MARKET_CODES).map((m) => {
                const price = p.prices[m] ?? { amount: "", compareAt: "", available: true };
                const update = (patch: Partial<typeof price>) => set("prices", { ...p.prices, [m]: { ...price, ...patch } });
                const onSale = saleMarkets[m];
                return (
                  <fieldset key={m} className="border border-line p-4">
                    <legend className="px-1 text-xs font-semibold">{MARKETS[m].label} ({MARKETS[m].currency})</legend>
                    <div className="grid grid-cols-2 gap-3">
                      <AField label={`Price ${MARKETS[m].currencySymbol}`}>
                        <input inputMode="decimal" value={price.amount} onChange={(e) => update({ amount: e.target.value })} placeholder="e.g. 85" className={adminInput} />
                      </AField>
                      <div className="flex items-center">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={onSale}
                            onChange={(e) => {
                              setSaleMarkets((prev) => ({ ...prev, [m]: e.target.checked }));
                              if (!e.target.checked) update({ compareAt: "" });
                            }}
                            className="size-4 accent-ink"
                          />
                          Add to Sale
                        </label>
                      </div>
                      {onSale ? (
                        <AField label="Compare-at price" hint="Enter the original price; it must be higher than the sale price." className="col-span-2">
                          <input inputMode="decimal" value={price.compareAt} onChange={(e) => update({ compareAt: e.target.value })} className={adminInput} />
                        </AField>
                      ) : null}
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={price.available} onChange={(e) => update({ available: e.target.checked })} className="size-4 accent-ink" />
                      Sell in {MARKETS[m].label} (leave the price empty to hide from this market)
                    </label>
                  </fieldset>
                );
              })}
            </div>
          </Card>

          {p.type === "standard" ? (
            <Card title="3 · Colours, photos & sizes">
              <p className="mb-4 text-xs text-ash">
                Add each colour you sell, upload its photos, and set how many of each size you have. Shoppers see a colour&apos;s photos when they pick it.
              </p>
              <ColoursSection
                variants={variants}
                setVariants={(fn) => {
                  setSaved(false);
                  setVariants(fn);
                }}
                images={images}
                setImages={(fn) => {
                  setSaved(false);
                  setImages(fn);
                }}
                upload={upload}
                uploading={uploading}
                productTitle={p.title}
                library={library}
                onLibraryAdd={addToLibrary}
                onLibraryRemove={removeFromLibrary}
              />
              {visibleVariants.length ? (
                <details className="mt-6 border-t border-line pt-4">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.08em] text-ash hover:text-ink">
                    Advanced: SKUs, low-stock alerts & backorders ({visibleVariants.length} variants)
                  </summary>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[620px] text-left text-xs">
                      <thead className="text-[0.625rem] uppercase tracking-[0.1em] text-ash">
                        <tr>
                          <th className="py-2 pr-2">Colour / size</th><th className="pr-2">SKU</th><th className="pr-2">Low-stock alert at</th><th className="pr-2">Allow backorder</th><th className="pr-2">For sale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleVariants.map((v) => {
                          const upd = (patch: Partial<VariantRow>) => { setSaved(false); setVariants((prev) => prev.map((x) => (x.key === v.key ? { ...x, ...patch } : x))); };
                          return (
                            <tr key={v.key} className="border-t border-line">
                              <td className="py-1.5 pr-2">
                                <span className="inline-flex items-center gap-1.5"><span className="size-3 border border-line" style={{ background: swatchBackground(v.colorHex) }} aria-hidden />{variantLabel(v, true)}</span>
                              </td>
                              <td className="pr-2">
                                <input
                                  value={v.autoSku ? "" : v.sku}
                                  placeholder="Automatic"
                                  onChange={(e) => upd({ sku: e.target.value.toUpperCase(), autoSku: e.target.value.trim() === "" && !v.id })}
                                  className={`${inputSm} w-44 font-mono`}
                                  aria-label={`SKU for ${variantLabel(v, true)}`}
                                />
                              </td>
                              <td className="pr-2"><input type="number" min={0} value={v.lowStockThreshold} onChange={(e) => upd({ lowStockThreshold: Math.max(0, Number(e.target.value) || 0) })} className={`${inputSm} w-16`} aria-label="Low stock threshold" /></td>
                              <td className="pr-2"><input type="checkbox" checked={v.allowBackorder} onChange={(e) => upd({ allowBackorder: e.target.checked })} className="size-4 accent-ink" aria-label="Allow backorder" /></td>
                              <td className="pr-2"><input type="checkbox" checked={v.active} onChange={(e) => upd({ active: e.target.checked })} className="size-4 accent-ink" aria-label="For sale" /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-stone">SKUs left on “Automatic” are created from the product name when you save. Untick “For sale” to hide one size of one colour without removing it.</p>
                </details>
              ) : null}
            </Card>
          ) : (
            <>
              <Card
                title={`3 · Photos (${images.length})`}
                actions={
                  <div className="flex gap-2">
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={(e) => upload([...(e.target.files ?? [])])} />
                    <button type="button" className={abtn("secondary", "sm")} onClick={() => fileRef.current?.click()} disabled={uploading}>
                      <ImagePlus className="size-3.5" /> {uploading ? "Uploading…" : "Upload"}
                    </button>
                    <button type="button" className={abtn("ghost", "sm")} onClick={() => setImages((prev) => [...prev, { key: key(), url: "", alt: p.title, color: null }])}>
                      <Plus className="size-3.5" /> Add by URL
                    </button>
                  </div>
                }
              >
                {images.length ? (
                  <ul className="space-y-3">
                    {images.map((img, i) => (
                      <li key={img.key} className="flex gap-3 border border-line p-2">
                        <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-cream">
                          {img.url ? <SmartImage src={img.url} alt="" fill sizes="80px" className="object-cover" showDemoTag={false} /> : null}
                        </div>
                        <div className="grid flex-1 gap-2 md:grid-cols-2">
                          <input value={img.url} onChange={(e) => setImages((prev) => prev.map((x) => (x.key === img.key ? { ...x, url: e.target.value } : x)))} placeholder="/uploads/… or https://…" className={`${inputSm} md:col-span-2`} aria-label="Image URL" />
                          <input value={img.alt} onChange={(e) => setImages((prev) => prev.map((x) => (x.key === img.key ? { ...x, alt: e.target.value } : x)))} placeholder="Alt text (describe the image)" className={inputSm} aria-label="Alt text" />
                          <select value={img.color ?? ""} onChange={(e) => setImages((prev) => prev.map((x) => (x.key === img.key ? { ...x, color: e.target.value || null } : x)))} className={inputSm} aria-label="Colour">
                            <option value="">All colours</option>
                            {colours.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button type="button" aria-label="Move up" className={abtn("ghost", "sm")} onClick={() => setImages((l) => move(l, i, -1))}><ArrowUp className="size-3.5" /></button>
                          <button type="button" aria-label="Move down" className={abtn("ghost", "sm")} onClick={() => setImages((l) => move(l, i, 1))}><ArrowDown className="size-3.5" /></button>
                          <button type="button" aria-label="Remove image" className={abtn("ghost", "sm")} onClick={() => setImages((l) => l.filter((x) => x.key !== img.key))}><Trash2 className="size-3.5 text-sale" /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ash">No images yet. The first image is the main product image; tag images with a colour to show them when that colour is selected.</p>
                )}
              </Card>
            <Card title="4 · Set pieces">
              <p className="mb-4 text-xs text-ash">
                A set has no stock of its own: buying one deducts one unit from the chosen size of each piece. Shoppers pick top and bottom sizes separately; set colours are those offered by every piece.
              </p>
              <ul className="space-y-2">
                {p.components.map((c, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2">
                    <input value={c.label} onChange={(e) => set("components", p.components.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className={`${inputSm} w-24`} aria-label="Label" placeholder="Top" />
                    <select value={c.productId} onChange={(e) => set("components", p.components.map((x, j) => (j === i ? { ...x, productId: e.target.value } : x)))} className={`${inputSm} min-w-64 flex-1`} aria-label="Piece">
                      <option value="">Choose a product…</option>
                      {componentOptions.filter((o) => o.id !== p.id).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                    </select>
                    <button type="button" className={abtn("ghost", "sm")} aria-label="Remove piece" onClick={() => set("components", p.components.filter((_, j) => j !== i))}><Trash2 className="size-3.5 text-sale" /></button>
                  </li>
                ))}
              </ul>
              <button type="button" className={`${abtn("ghost", "sm")} mt-3`} onClick={() => set("components", [...p.components, { productId: "", label: p.components.length ? "Bottom" : "Top" }])}>
                <Plus className="size-3.5" /> Add piece
              </button>
            </Card>
            </>
          )}

          <Card title={p.type === "set" ? "5 · Product details" : "4 · Product details"}>
            <div className="grid gap-4 md:grid-cols-2">
              <AField label="Size & fit notes"><textarea value={p.fitNotes} onChange={(e) => set("fitNotes", e.target.value)} className={adminTextarea} /></AField>
              <AField label="Model info"><textarea value={p.modelInfo} onChange={(e) => set("modelInfo", e.target.value)} className={adminTextarea} /></AField>
              <AField label="Fabric / composition" hint="Only verified facts supplied by SLEEP TALK"><textarea value={p.fabric} onChange={(e) => set("fabric", e.target.value)} className={adminTextarea} /></AField>
              <AField label="Care instructions"><textarea value={p.care} onChange={(e) => set("care", e.target.value)} className={adminTextarea} /></AField>
              <AField label="Measurements" className="md:col-span-2"><textarea value={p.measurements} onChange={(e) => set("measurements", e.target.value)} className={adminTextarea} /></AField>
            </div>
          </Card>

          <Card title={p.type === "set" ? "6 · Search engine listing" : "5 · Search engine listing"}>
            <div className="grid gap-4">
              <AField label="SEO title" hint={`${p.seoTitle.length}/60 recommended`}><input value={p.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} className={adminInput} maxLength={140} /></AField>
              <AField label="Meta description" hint={`${p.seoDescription.length}/155 recommended`}><textarea value={p.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} className={adminTextarea} maxLength={320} /></AField>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Status">
            <div className="space-y-3 text-sm">
              <AField label="Visibility">
                <select value={p.status} onChange={(e) => set("status", e.target.value as EditorInitial["status"])} className={adminSelect}>
                  <option value="draft">Draft (hidden)</option>
                  <option value="active">Active (on sale)</option>
                  <option value="archived">Archived</option>
                </select>
              </AField>
              <AField label="Product type">
                <select value={p.type} onChange={(e) => set("type", e.target.value as EditorInitial["type"])} className={adminSelect} disabled={!!p.id}>
                  <option value="standard">Standard (own sizes & stock)</option>
                  <option value="set">Tracksuit set (made of pieces)</option>
                </select>
              </AField>
              <label className="flex items-center gap-2"><input type="checkbox" checked={p.isListed} onChange={(e) => set("isListed", e.target.checked)} className="size-4 accent-ink" /> Show in listings & search</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={p.isNewArrival} onChange={(e) => set("isNewArrival", e.target.checked)} className="size-4 accent-ink" /> New arrival</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={p.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} className="size-4 accent-ink" /> Featured (sorted first)</label>
              <p className="text-xs text-stone">Untick “Show in listings” for pieces only sold as part of a set.</p>
              <div className="border-t border-line pt-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(p.preorder)} onChange={(e) => set("preorder", e.target.checked)} className="size-4 accent-ink" />
                  Enable pre-orders
                </label>
                <p className="mt-1 text-xs text-stone">Accept orders for this product even when stock is zero. Customers pay at checkout.</p>
                {p.preorder ? (
                  <AField label="Pre-order shipping message" className="mt-3">
                    <input
                      value={p.preorderMessage ?? ""}
                      onChange={(e) => set("preorderMessage", e.target.value)}
                      className={adminInput}
                      maxLength={180}
                      placeholder="Ships as soon as possible"
                    />
                  </AField>
                ) : null}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-[1400px] items-center justify-end gap-3 px-4 py-3 md:px-8">
          {p.id && p.status === "active" ? (
            <a href={`/products/${p.slug}`} target="_blank" rel="noreferrer" className={abtn("ghost")}>View in store</a>
          ) : null}
          <button type="button" onClick={save} disabled={pending || uploading} className={abtn("primary")}>
            {pending ? "Saving…" : p.id ? "Save changes" : "Create product"}
          </button>
        </div>
      </div>
    </div>
  );
}
