"use client";

import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { saveProductAction, type ProductPayload } from "@/app/admin/_actions/products";
import { SmartImage } from "@/components/ui/smart-image";
import { MARKETS, MARKET_CODES } from "@/lib/markets";
import { slugify } from "@/lib/utils";
import { abtn, adminInput, adminSelect, adminTextarea, AField, Card, inputSm } from "./ui";

type VariantRow = ProductPayload["variants"][number] & { stock?: number; key: string };
type ImageRow = ProductPayload["images"][number] & { key: string };

export type EditorInitial = Omit<ProductPayload, "variants" | "images"> & {
  variants: (ProductPayload["variants"][number] & { stock?: number })[];
  images: ProductPayload["images"];
};

const key = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_COLOURS: Record<string, string> = { Black: "#141414", Cream: "#E8E0D0", Charcoal: "#404042", White: "#FFFFFF", Grey: "#8A8A8A", Navy: "#1F2A44" };

export function ProductEditor({
  initial,
  categories,
  componentOptions,
}: {
  initial: EditorInitial;
  categories: { id: string; name: string }[];
  componentOptions: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [variants, setVariants] = useState<VariantRow[]>(() => initial.variants.map((v) => ({ ...v, key: key() })));
  const [images, setImages] = useState<ImageRow[]>(() => initial.images.map((i) => ({ ...i, key: key() })));
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [gen, setGen] = useState({ colours: "Black, Cream", sizes: "XS, S, M, L, XL, XXL", stock: "10" });
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof EditorInitial>(k: K, v: EditorInitial[K]) => {
    setSaved(false);
    setP((prev) => ({ ...prev, [k]: v }));
  };
  const colours = [...new Set(variants.map((v) => v.color).filter(Boolean))];

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of [...files]) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
        setImages((prev) => [...prev, { key: key(), url: data.url!, alt: p.title, color: null }]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const generate = () => {
    const cols = gen.colours.split(",").map((c) => c.trim()).filter(Boolean);
    const sizes = gen.sizes.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    const prefix = `ST-${slugify(p.title).split("-").map((w) => w[0]).join("").toUpperCase().slice(0, 5) || "NEW"}`;
    const stock = Math.max(0, Number(gen.stock) || 0);
    const rows: VariantRow[] = [];
    for (const c of cols) {
      for (const s of sizes) {
        const sku = `${prefix}-${c.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase()}-${s}`;
        if (variants.some((v) => v.sku === sku) || rows.some((v) => v.sku === sku)) continue;
        rows.push({ key: key(), sku, color: c, colorHex: DEFAULT_COLOURS[c] ?? "#111111", size: s, initialStock: stock, lowStockThreshold: 3, allowBackorder: false, active: true });
      }
    }
    setVariants((prev) => [...prev, ...rows]);
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const payload: ProductPayload = {
        ...p,
        slug: p.slug || slugify(p.title),
        images: images.map((i) => ({ url: i.url, alt: i.alt, color: i.color })),
        variants: variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          color: v.color,
          colorHex: v.colorHex,
          size: v.size,
          initialStock: v.initialStock,
          lowStockThreshold: v.lowStockThreshold,
          allowBackorder: v.allowBackorder,
          active: v.active,
        })),
      };
      const result = await saveProductAction(payload);
      if (!result.ok) {
        setError(result.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setSaved(true);
      if (!p.id) router.replace(`/admin/products/${result.id}?ok=Product+created`);
      else router.refresh();
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
          <Card title="Basics">
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
                <AField label="Category">
                  <select value={p.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value || null)} className={adminSelect}>
                    <option value="">— None —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </AField>
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

          <Card title="Pricing by market">
            <div className="grid gap-4 md:grid-cols-2">
              {MARKET_CODES.map((m) => {
                const price = p.prices[m] ?? { amount: "", compareAt: "", available: true };
                const update = (patch: Partial<typeof price>) => set("prices", { ...p.prices, [m]: { ...price, ...patch } });
                return (
                  <fieldset key={m} className="border border-line p-4">
                    <legend className="px-1 text-xs font-semibold">{MARKETS[m].label} ({MARKETS[m].currency})</legend>
                    <div className="grid grid-cols-2 gap-3">
                      <AField label={`Price ${MARKETS[m].currencySymbol}`}>
                        <input inputMode="decimal" value={price.amount} onChange={(e) => update({ amount: e.target.value })} placeholder="e.g. 85" className={adminInput} />
                      </AField>
                      <AField label="Compare-at (sale)" hint="Original price, if on sale">
                        <input inputMode="decimal" value={price.compareAt} onChange={(e) => update({ compareAt: e.target.value })} className={adminInput} />
                      </AField>
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

          <Card
            title={`Images (${images.length})`}
            actions={
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
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

          {p.type === "standard" ? (
            <Card title={`Sizes & colours (${variants.length})`}>
              <div className="mb-4 grid gap-2 border border-dashed border-line bg-paper p-3 md:grid-cols-[1fr_1fr_90px_auto]">
                <AField label="Colours"><input value={gen.colours} onChange={(e) => setGen({ ...gen, colours: e.target.value })} className={inputSm + " w-full"} /></AField>
                <AField label="Sizes"><input value={gen.sizes} onChange={(e) => setGen({ ...gen, sizes: e.target.value })} className={inputSm + " w-full"} /></AField>
                <AField label="Start stock"><input type="number" min={0} value={gen.stock} onChange={(e) => setGen({ ...gen, stock: e.target.value })} className={inputSm + " w-full"} /></AField>
                <div className="flex items-end"><button type="button" className={abtn("secondary", "sm")} onClick={generate}>Generate variants</button></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="text-[0.625rem] uppercase tracking-[0.1em] text-ash">
                    <tr>
                      <th className="py-2 pr-2">SKU</th><th className="pr-2">Colour</th><th className="pr-2">Hex</th><th className="pr-2">Size</th>
                      <th className="pr-2">Stock</th><th className="pr-2">Low at</th><th className="pr-2">Backorder</th><th className="pr-2">Active</th><th />
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v) => {
                      const upd = (patch: Partial<VariantRow>) => { setSaved(false); setVariants((prev) => prev.map((x) => (x.key === v.key ? { ...x, ...patch } : x))); };
                      return (
                        <tr key={v.key} className="border-t border-line">
                          <td className="py-1.5 pr-2"><input value={v.sku} onChange={(e) => upd({ sku: e.target.value.toUpperCase() })} className={`${inputSm} w-40 font-mono`} aria-label="SKU" /></td>
                          <td className="pr-2"><input value={v.color} onChange={(e) => upd({ color: e.target.value })} className={`${inputSm} w-28`} aria-label="Colour" /></td>
                          <td className="pr-2"><input type="color" value={v.colorHex} onChange={(e) => upd({ colorHex: e.target.value })} className="h-8 w-10 border border-line" aria-label="Colour swatch" /></td>
                          <td className="pr-2"><input value={v.size} onChange={(e) => upd({ size: e.target.value.toUpperCase() })} className={`${inputSm} w-16`} aria-label="Size" /></td>
                          <td className="pr-2">
                            {v.id ? (
                              <span className="font-semibold tabular-nums" title="Change stock in Inventory">{v.stock ?? 0}</span>
                            ) : (
                              <input type="number" min={0} value={v.initialStock ?? 0} onChange={(e) => upd({ initialStock: Math.max(0, Number(e.target.value) || 0) })} className={`${inputSm} w-16`} aria-label="Starting stock" />
                            )}
                          </td>
                          <td className="pr-2"><input type="number" min={0} value={v.lowStockThreshold} onChange={(e) => upd({ lowStockThreshold: Math.max(0, Number(e.target.value) || 0) })} className={`${inputSm} w-14`} aria-label="Low stock threshold" /></td>
                          <td className="pr-2"><input type="checkbox" checked={v.allowBackorder} onChange={(e) => upd({ allowBackorder: e.target.checked })} className="size-4 accent-ink" aria-label="Allow backorder" /></td>
                          <td className="pr-2"><input type="checkbox" checked={v.active} onChange={(e) => upd({ active: e.target.checked })} className="size-4 accent-ink" aria-label="Active" /></td>
                          <td>
                            <button type="button" className={abtn("ghost", "sm")} aria-label="Remove variant" onClick={() => setVariants((prev) => prev.filter((x) => x.key !== v.key))}>
                              <Trash2 className="size-3.5 text-sale" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button type="button" className={`${abtn("ghost", "sm")} mt-3`} onClick={() => setVariants((prev) => [...prev, { key: key(), sku: "", color: "", colorHex: "#111111", size: "", initialStock: 0, lowStockThreshold: 3, allowBackorder: false, active: true }])}>
                <Plus className="size-3.5" /> Add variant
              </button>
              <p className="mt-2 text-xs text-stone">Existing stock levels are changed in Inventory (so every change is logged). Removed variants are deactivated, not deleted, to keep order history intact.</p>
            </Card>
          ) : (
            <Card title="Set pieces">
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
          )}

          <Card title="Product details">
            <div className="grid gap-4 md:grid-cols-2">
              <AField label="Size & fit notes"><textarea value={p.fitNotes} onChange={(e) => set("fitNotes", e.target.value)} className={adminTextarea} /></AField>
              <AField label="Model info"><textarea value={p.modelInfo} onChange={(e) => set("modelInfo", e.target.value)} className={adminTextarea} /></AField>
              <AField label="Fabric / composition" hint="Only verified facts supplied by SLEEP TALK"><textarea value={p.fabric} onChange={(e) => set("fabric", e.target.value)} className={adminTextarea} /></AField>
              <AField label="Care instructions"><textarea value={p.care} onChange={(e) => set("care", e.target.value)} className={adminTextarea} /></AField>
              <AField label="Measurements" className="md:col-span-2"><textarea value={p.measurements} onChange={(e) => set("measurements", e.target.value)} className={adminTextarea} /></AField>
            </div>
          </Card>

          <Card title="Search engine listing">
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
