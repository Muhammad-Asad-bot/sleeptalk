"use server";

import { revalidatePath } from "next/cache";
import { refreshStorefront } from "@/lib/server/store-cache";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { stockMovements, variants } from "@/db/schema";
import { requireStaff } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { back, bool, int, returnPath, str } from "@/lib/server/admin";

/**
 * Stock adjustment.
 *  mode "add": quantity is a +/- delta (deliveries, damages, corrections)
 *  mode "set": quantity is the counted stock level (stock-take); the delta is calculated
 * Every change is recorded in stock_movements with the resulting level and the admin who made it.
 */
export async function adjustStockAction(formData: FormData) {
  const user = await requireStaff();
  const path = returnPath(formData, "/admin/inventory");
  const variantId = str(formData, "variantId", 64);
  const mode = str(formData, "mode", 10) === "set" ? "set" : "add";
  const qty = int(formData, "quantity");
  const reasonRaw = str(formData, "reason", 20);
  const reason = reasonRaw === "restock" ? "restock" : "adjustment";
  const note = str(formData, "note", 300);

  if (qty == null || Number.isNaN(qty) || Math.abs(qty) > 100_000) back(path, { error: "Enter a whole number." });
  if (mode === "set" && qty < 0) back(path, { error: "Stock count can't be negative." });
  if (mode === "add" && qty === 0) back(path, { error: "Enter a quantity other than 0." });

  const db = await getDb();
  const result = await db.transaction(async (tx) => {
    const [v] = await tx.select().from(variants).where(eq(variants.id, variantId)).for("update");
    if (!v) return { error: "Variant not found." } as const;
    const delta = mode === "set" ? qty - v.stock : qty;
    if (delta === 0) return { error: `Stock is already ${v.stock}.` } as const;
    if (v.stock + delta < 0 && !v.allowBackorder) return { error: `That would take ${v.sku} below zero (current stock ${v.stock}).` } as const;
    const [updated] = await tx
      .update(variants)
      .set({ stock: sql`${variants.stock} + ${delta}` })
      .where(eq(variants.id, variantId))
      .returning({ stock: variants.stock });
    await tx.insert(stockMovements).values({
      variantId,
      delta,
      stockAfter: updated.stock,
      reason: mode === "set" ? "adjustment" : reason,
      note: mode === "set" ? `Stock count${note ? `: ${note}` : ""}` : note,
      userId: user.id,
    });
    return { sku: v.sku, from: v.stock, to: updated.stock, delta } as const;
  });
  if ("error" in result) back(path, { error: result.error });
  await audit(user, "inventory.adjusted", "variant", variantId, { ...result, mode, reason, note });
  revalidatePath("/admin/inventory");
  refreshStorefront();
  back(path, { ok: `${result.sku}: ${result.from} → ${result.to}` });
}

export async function updateVariantSettingsAction(formData: FormData) {
  const user = await requireStaff();
  const path = returnPath(formData, "/admin/inventory");
  const variantId = str(formData, "variantId", 64);
  const threshold = int(formData, "lowStockThreshold");
  if (threshold == null || Number.isNaN(threshold) || threshold < 0 || threshold > 1000) back(path, { error: "Low-stock threshold must be 0–1000." });
  const allowBackorder = bool(formData, "allowBackorder");
  const active = bool(formData, "active");
  const db = await getDb();
  const [v] = await db.select().from(variants).where(eq(variants.id, variantId)).limit(1);
  if (!v) back(path, { error: "Variant not found." });
  await db.update(variants).set({ lowStockThreshold: threshold, allowBackorder, active }).where(eq(variants.id, variantId));
  await audit(user, "inventory.settings_updated", "variant", variantId, {
    sku: v.sku,
    lowStockThreshold: [v.lowStockThreshold, threshold],
    allowBackorder: [v.allowBackorder, allowBackorder],
    active: [v.active, active],
  });
  revalidatePath("/admin/inventory");
  refreshStorefront();
  back(path, { ok: `${v.sku} settings saved.` });
}
