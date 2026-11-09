import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { products, wishlistItems } from "@/db/schema";
import { getCurrentUser } from "@/lib/server/auth";
import { isSameOrigin } from "@/lib/server/security";

const bodySchema = z.object({ productIds: z.array(z.string().min(1).max(64)).min(1).max(100) });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ productIds: [] }, { status: 401 });
  const db = await getDb();
  const rows = await db.select({ productId: wishlistItems.productId }).from(wishlistItems).where(eq(wishlistItems.userId, user.id));
  return NextResponse.json({ productIds: rows.map((r) => r.productId) }, { headers: { "Cache-Control": "no-store" } });
}

async function mutate(request: Request, mode: "add" | "remove") {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const db = await getDb();
  if (mode === "add") {
    const valid = await db.select({ id: products.id }).from(products).where(inArray(products.id, parsed.data.productIds));
    if (valid.length) {
      await db
        .insert(wishlistItems)
        .values(valid.map((p) => ({ userId: user.id, productId: p.id })))
        .onConflictDoNothing();
    }
  } else {
    await db
      .delete(wishlistItems)
      .where(and(eq(wishlistItems.userId, user.id), inArray(wishlistItems.productId, parsed.data.productIds)));
  }
  return NextResponse.json({ ok: true });
}

export const POST = (request: Request) => mutate(request, "add");
export const DELETE = (request: Request) => mutate(request, "remove");
