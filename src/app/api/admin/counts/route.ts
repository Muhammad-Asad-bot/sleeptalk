import { NextResponse } from "next/server";
import { getAdminCounts } from "@/lib/server/admin-counts";
import { getCurrentUser, isStaff } from "@/lib/server/auth";

/** Live sidebar badges (orders to fulfil, open messages, pending reviews, low stock). Staff only. */
export async function GET() {
  const user = await getCurrentUser();
  if (!isStaff(user)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  return NextResponse.json(await getAdminCounts(), { headers: { "Cache-Control": "no-store" } });
}
