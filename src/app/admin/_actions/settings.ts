"use server";

import { revalidatePath } from "next/cache";
import { refreshStorefront } from "@/lib/server/store-cache";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { markets, sessions, shippingRates, users } from "@/db/schema";
import type { InventorySettings, SeoSettings, StoreSettings } from "@/content/defaults";
import { isMarketCode, parseMoneyInput } from "@/lib/markets";
import { emailSchema } from "@/lib/validation";
import { requireOwner, requireStaff } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { back, bool, int, str } from "@/lib/server/admin";
import { getSettings, saveSetting } from "@/lib/server/settings";

/* ───────── Shipping & markets (staff) ───────── */

export async function saveShippingRateAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const market = str(formData, "market", 4);
  if (!isMarketCode(market)) back("/admin/shipping", { error: "Choose a market." });
  const name = str(formData, "name", 80);
  if (!name) back("/admin/shipping", { error: "Rate name is required." });
  const price = parseMoneyInput(str(formData, "price", 12));
  const freeOver = parseMoneyInput(str(formData, "freeOver", 12));
  if (price == null || Number.isNaN(price) || price < 0) back("/admin/shipping", { error: "Enter a valid price (0 for free)." });
  if (freeOver != null && (Number.isNaN(freeOver) || freeOver <= 0)) back("/admin/shipping", { error: "Free-over amount must be positive (or empty)." });
  const minDays = int(formData, "minDays");
  const maxDays = int(formData, "maxDays");
  const days = (v: number | null) => (v == null || Number.isNaN(v) || v < 0 || v > 90 ? null : v);
  const values = {
    market,
    name,
    description: str(formData, "description", 200),
    price,
    freeOver,
    minDays: days(minDays),
    maxDays: days(maxDays),
    active: bool(formData, "active"),
    position: int(formData, "position") || 0,
  };
  const db = await getDb();
  if (id) await db.update(shippingRates).set(values).where(eq(shippingRates.id, id));
  else await db.insert(shippingRates).values(values);
  await audit(user, id ? "shipping.rate_updated" : "shipping.rate_created", "shipping_rate", id || name, values);
  revalidatePath("/", "layout");
  refreshStorefront();
  back("/admin/shipping", { ok: `Rate “${name}” saved.` });
}

export async function deleteShippingRateAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const db = await getDb();
  const [r] = await db.select().from(shippingRates).where(eq(shippingRates.id, id)).limit(1);
  if (!r) back("/admin/shipping", { error: "Rate not found." });
  await db.delete(shippingRates).where(eq(shippingRates.id, id));
  await audit(user, "shipping.rate_deleted", "shipping_rate", id, { name: r.name, market: r.market });
  revalidatePath("/", "layout");
  refreshStorefront();
  back("/admin/shipping", { ok: `Deleted “${r.name}”.` });
}

export async function saveMarketAction(formData: FormData) {
  const user = await requireStaff();
  const code = str(formData, "code", 4);
  if (!isMarketCode(code)) back("/admin/shipping", { error: "Unknown market." });
  const isDefault = bool(formData, "isDefault");
  const active = bool(formData, "active");
  const db = await getDb();
  if (!active) {
    const others = await db.select().from(markets).where(and(ne(markets.code, code), eq(markets.active, true)));
    if (!others.length) back("/admin/shipping", { error: "At least one market must stay active." });
  }
  if (isDefault) await db.update(markets).set({ isDefault: false }).where(ne(markets.code, code));
  await db
    .update(markets)
    .set({
      name: str(formData, "name", 60),
      active,
      isDefault,
      taxNote: str(formData, "taxNote", 300),
      shippingSummary: str(formData, "shippingSummary", 400),
      returnsSummary: str(formData, "returnsSummary", 400),
    })
    .where(eq(markets.code, code));
  await audit(user, "market.updated", "market", code, { active, isDefault });
  revalidatePath("/", "layout");
  refreshStorefront();
  back("/admin/shipping", { ok: `${code} market saved.` });
}

/* ───────── Store settings (owner) ───────── */

export async function saveStoreSettingsAction(formData: FormData) {
  const user = await requireOwner();
  const { store, seo, inventory } = await getSettings();
  const email = emailSchema.safeParse(str(formData, "supportEmail", 200));
  if (!email.success) back("/admin/settings", { error: "Enter a valid support email." });
  const nextStore: StoreSettings = {
    ...store,
    name: str(formData, "name", 80) || store.name,
    motto: str(formData, "motto", 120),
    supportEmail: email.data,
    phone: str(formData, "phone", 40),
    address: str(formData, "address", 300),
    businessHours: str(formData, "businessHours", 200),
    demoMode: bool(formData, "demoMode"),
    logoLight: str(formData, "logoLight", 300) || store.logoLight,
    logoDark: str(formData, "logoDark", 300) || store.logoDark,
  };
  const nextSeo: SeoSettings = {
    ...seo,
    defaultTitle: str(formData, "defaultTitle", 140) || seo.defaultTitle,
    titleTemplate: str(formData, "titleTemplate", 80).includes("%s") ? str(formData, "titleTemplate", 80) : seo.titleTemplate,
    defaultDescription: str(formData, "defaultDescription", 320),
    ogImage: str(formData, "ogImage", 300) || seo.ogImage,
  };
  const nextInventory: InventorySettings = { ...inventory, showLowStock: bool(formData, "showLowStock") };
  await saveSetting("store", nextStore);
  await saveSetting("seo", nextSeo);
  await saveSetting("inventory", nextInventory);
  await audit(user, "settings.store_updated", "settings", "store", { demoMode: nextStore.demoMode, supportEmail: nextStore.supportEmail });
  revalidatePath("/", "layout");
  refreshStorefront();
  back("/admin/settings", { ok: "Store settings saved." });
}

/* ───────── Users & roles (owner) ───────── */

export async function updateStaffAction(formData: FormData) {
  const user = await requireOwner();
  const id = str(formData, "id", 64);
  const role = str(formData, "role", 10);
  const disabled = bool(formData, "disabled");
  if (!["owner", "staff", "customer"].includes(role)) back("/admin/users", { error: "Invalid role." });
  if (id === user.id && (role !== "owner" || disabled)) back("/admin/users", { error: "You can't remove your own owner access." });
  const db = await getDb();
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) back("/admin/users", { error: "User not found." });
  if (target.role === "owner" && role !== "owner") {
    const owners = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "owner"), eq(users.disabled, false)));
    if (owners.length <= 1) back("/admin/users", { error: "There must always be at least one owner." });
  }
  await db.update(users).set({ role: role as "staff", disabled }).where(eq(users.id, id));
  if (disabled || role === "customer") await db.delete(sessions).where(eq(sessions.userId, id));
  await audit(user, "user.access_changed", "user", id, { email: target.email, role: [target.role, role], disabled: [target.disabled, disabled] });
  revalidatePath("/admin/users");
  back("/admin/users", { ok: `${target.email} updated.` });
}
