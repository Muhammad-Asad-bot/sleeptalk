import { NextResponse } from "next/server";
import { getMarket } from "@/lib/server/market";
import { getCardsByIds } from "@/lib/server/catalog";

/** Product cards by id — used for "recently viewed" and the guest wishlist. */
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 24);
  if (!ids.length) return NextResponse.json({ cards: [] });
  const market = await getMarket();
  return NextResponse.json({ cards: await getCardsByIds(ids, market), market });
}
