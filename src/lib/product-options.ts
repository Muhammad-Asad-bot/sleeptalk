import type { CatalogProduct, CatalogVariant } from "@/lib/server/catalog";
import { fitsOf, isFit, type FitCode } from "@/lib/fits";
import { sortSizes } from "@/lib/utils";

/** Serializable variant data sent to the client for size/colour selection. */
export type OptionVariant = { id: string; color: string; size: string; fit: string; available: boolean; lowStock: number | null };

export type ProductOptions = {
  id: string;
  slug: string;
  title: string;
  type: "standard" | "set";
  price: number;
  compareAt: number | null;
  categoryName: string | null;
  colours: { name: string; hex: string; available: boolean }[];
  imagesByColour: Record<string, string>;
  variants: OptionVariant[];
  components: { productId: string; label: string; title: string; slug: string; isListed: boolean; sizes: string[]; variants: OptionVariant[] }[];
  sizes: string[];
  /** Fits on sale. More than one → shoppers pick a fit (sets: the fit every piece shares). */
  fits: FitCode[];
};

function toOption(v: CatalogVariant, showLowStock: boolean): OptionVariant {
  const available = v.active && (v.allowBackorder || v.stock > 0);
  const low = showLowStock && available && !v.allowBackorder && v.stock <= v.lowStockThreshold ? v.stock : null;
  return { id: v.id, color: v.color, size: v.size, fit: isFit(v.fit) ? v.fit : "standard", available, lowStock: low };
}

export function buildProductOptions(p: CatalogProduct, showLowStock: boolean): ProductOptions {
  const imagesByColour: Record<string, string> = {};
  for (const img of p.images) if (img.color && !imagesByColour[img.color]) imagesByColour[img.color] = img.url;

  const components = p.components.map((c) => {
    const variants = c.variants.filter((v) => v.active).map((v) => toOption(v, showLowStock));
    return {
      productId: c.productId,
      label: c.label,
      title: c.title,
      slug: c.slug,
      isListed: c.isListed,
      sizes: sortSizes([...new Set(variants.map((v) => v.size))]),
      variants,
    };
  });
  const variants = p.variants.filter((v) => v.active).map((v) => toOption(v, showLowStock));
  // Sets: only fits every piece is made in (jacket and pants always share a fit).
  const fits =
    p.type === "set"
      ? fitsOf(components.flatMap((c) => c.variants)).filter((f) => components.every((c) => c.variants.some((v) => v.fit === f)))
      : fitsOf(variants);

  const colours = p.colours.map((c) => ({
    ...c,
    available:
      p.type === "set"
        ? components.every((comp) => comp.variants.some((v) => v.color === c.name && v.available))
        : variants.some((v) => v.color === c.name && v.available),
  }));

  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    type: p.type,
    price: p.price,
    compareAt: p.compareAt,
    categoryName: p.categoryName,
    colours,
    imagesByColour,
    variants,
    components,
    sizes: p.sizes,
    fits,
  };
}
