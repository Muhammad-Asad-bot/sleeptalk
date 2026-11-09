import "server-only";
import { getDb } from "@/db/client";
import { auditLogs } from "@/db/schema";
import type { CurrentUser } from "./auth";

/** Records an admin action (product/price/stock/order/status/settings changes). */
export async function audit(
  user: CurrentUser | null,
  action: string,
  entityType: string,
  entityId = "",
  details: Record<string, unknown> = {},
) {
  try {
    const db = await getDb();
    await db.insert(auditLogs).values({
      userId: user?.id ?? null,
      userEmail: user?.email ?? "system",
      action,
      entityType,
      entityId,
      details,
    });
  } catch (error) {
    console.error("[audit] failed to record", action, error);
  }
}
