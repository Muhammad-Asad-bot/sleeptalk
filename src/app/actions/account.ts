"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { addresses } from "@/db/schema";
import { addressSchema } from "@/lib/validation";
import { requireUser } from "@/lib/server/auth";
import type { AuthState } from "./auth";

export async function saveAddressAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const user = await requireUser("/account/addresses");
  const raw = Object.fromEntries(formData);
  const parsed = addressSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }
  const db = await getDb();
  const id = typeof raw.id === "string" && raw.id ? raw.id : null;
  const isDefault = raw.isDefault === "on";
  if (isDefault) await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  const values = { ...parsed.data, line2: parsed.data.line2 ?? "", region: parsed.data.region ?? "", phone: parsed.data.phone ?? "", isDefault };
  if (id) {
    await db.update(addresses).set(values).where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
  } else {
    const existing = await db.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, user.id));
    await db.insert(addresses).values({ ...values, userId: user.id, isDefault: isDefault || existing.length === 0 });
  }
  revalidatePath("/account/addresses");
  return { ok: true, message: "Address saved." };
}

export async function deleteAddressAction(formData: FormData) {
  const user = await requireUser("/account/addresses");
  const id = String(formData.get("id") ?? "");
  const db = await getDb();
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
  revalidatePath("/account/addresses");
}

export async function setDefaultAddressAction(formData: FormData) {
  const user = await requireUser("/account/addresses");
  const id = String(formData.get("id") ?? "");
  const db = await getDb();
  await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  await db.update(addresses).set({ isDefault: true }).where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
  revalidatePath("/account/addresses");
}
