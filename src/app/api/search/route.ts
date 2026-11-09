import { NextResponse } from "next/server";
import { getMarket } from "@/lib/server/market";
import { searchProducts, toCard } from "@/lib/server/catalog";
import { limitByIp } from "@/lib/server/security";

/** Autocomplete suggestions for the search overlay. */
export async function GET(request: Request) {
  const limited = await limitByIp("search", 120, 60_000);
  if (!limited.ok) return NextResponse.json({ results: [] }, { status: 429 });
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ results: [] });
  const market = await getMarket();
  const results = (await searchProducts(q, market)).slice(0, 6).map((p) => {
    const card = toCard(p);
    return {
      id: card.id,
      slug: card.slug,
      title: card.title,
      price: card.price,
      compareAt: card.compareAt,
      image: card.image?.url ?? null,
      category: p.categoryName,
    };
  });
  return NextResponse.json({ results, market });
}
