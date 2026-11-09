import { NextResponse } from "next/server";
import { cartQuoteSchema } from "@/lib/cart-types";
import { resolveCart } from "@/lib/server/cart";
import { getMarket } from "@/lib/server/market";
import { isSameOrigin, limitByIp } from "@/lib/server/security";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limited = await limitByIp("quote", 120, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const parsed = cartQuoteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
  const market = await getMarket();
  const quote = await resolveCart({ ...parsed.data, market });
  return NextResponse.json(quote, { headers: { "Cache-Control": "no-store" } });
}
