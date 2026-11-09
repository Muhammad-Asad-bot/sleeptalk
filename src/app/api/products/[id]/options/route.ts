import { NextResponse } from "next/server";
import { getMarket } from "@/lib/server/market";
import { loadCatalog } from "@/lib/server/catalog";
import { getSettings } from "@/lib/server/settings";
import { buildProductOptions } from "@/lib/product-options";

/** Variant options for Quick Add (size/colour selection from listing pages). */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const market = await getMarket();
  const [catalog, settings] = await Promise.all([loadCatalog(market), getSettings()]);
  const product = catalog.find((p) => p.id === id && p.isListed);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(buildProductOptions(product, settings.inventory.showLowStock), {
    headers: { "Cache-Control": "no-store" },
  });
}
