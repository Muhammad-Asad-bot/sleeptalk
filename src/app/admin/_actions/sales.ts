"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { contactMessages, discounts, reviews, sessions, users, type MarketAmounts } from "@/db/schema";
import { MARKET_CODES, parseMoneyInput, type MarketCode } from "@/lib/markets";
import { requireStaff } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { back, bool, int, str } from "@/lib/server/admin";

/* ───────── Discounts ───────── */

export async function saveDiscountAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const path = id ? `/admin/discounts/${id}` : "/admin/discounts/new";
  const code = str(formData, "code", 40).toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) back(path, { error: "Codes are 3–40 letters, numbers, dashes or underscores." });
  const type = str(formData, "type", 20) === "fixed" ? "fixed" : "percentage";
  const percentOff = int(formData, "percentOff");
  if (type === "percentage" && (percentOff == null || Number.isNaN(percentOff) || percentOff < 1 || percentOff > 100)) {
    back(path, { error: "Percentage must be between 1 and 100." });
  }
  const amounts = (prefix: string): MarketAmounts | null => {
    const out: MarketAmounts = {};
    for (const m of MARKET_CODES) {
      const v = parseMoneyInput(str(formData, `${prefix}_${m}`, 12));
      if (v == null) continue;
      if (Number.isNaN(v) || v <= 0) return null;
      out[m] = v;
    }
    return out;
  };
  const amountOff = amounts("amountOff");
  const minSpend = amounts("minSpend");
  if (!amountOff || !minSpend) back(path, { error: "Enter amounts like 20 or 19.99." });
  if (type === "fixed" && !Object.keys(amountOff).length) back(path, { error: "Enter a fixed amount for at least one market." });
  const markets = formData.getAll("markets").map(String).filter((m): m is MarketCode => (MARKET_CODES as string[]).includes(m));
  const scope = (["all", "categories", "collections", "products"] as const).find((s) => s === str(formData, "scope", 20)) ?? "all";
  const targetIds = formData.getAll(`targets_${scope}`).map(String).filter(Boolean);
  if (scope !== "all" && !targetIds.length) back(path, { error: "Choose at least one item the code applies to." });
  const date = (k: string) => {
    const v = str(formData, k, 40);
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const usageLimit = int(formData, "usageLimit");
  const values = {
    code,
    description: str(formData, "description", 200),
    type: type as "percentage" | "fixed",
    percentOff: type === "percentage" ? percentOff : null,
    amountOff: type === "fixed" ? amountOff : {},
    minSpend,
    markets,
    scope,
    targetIds: scope === "all" ? [] : targetIds,
    startsAt: date("startsAt"),
    endsAt: date("endsAt"),
    usageLimit: usageLimit != null && !Number.isNaN(usageLimit) && usageLimit > 0 ? usageLimit : null,
    active: bool(formData, "active"),
  };
  const db = await getDb();
  const [taken] = await db.select({ id: discounts.id }).from(discounts).where(id ? and(eq(discounts.code, code), ne(discounts.id, id)) : eq(discounts.code, code)).limit(1);
  if (taken) back(path, { error: `The code ${code} already exists.` });
  let savedId = id;
  if (id) await db.update(discounts).set(values).where(eq(discounts.id, id));
  else savedId = (await db.insert(discounts).values(values).returning({ id: discounts.id }))[0].id;
  await audit(user, id ? "discount.updated" : "discount.created", "discount", savedId, { code, type, percentOff: values.percentOff, amountOff: values.amountOff, active: values.active });
  revalidatePath("/admin/discounts");
  back("/admin/discounts", { ok: `Discount ${code} saved.` });
}

export async function toggleDiscountAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const db = await getDb();
  const [d] = await db.select().from(discounts).where(eq(discounts.id, id)).limit(1);
  if (!d) back("/admin/discounts", { error: "Discount not found." });
  await db.update(discounts).set({ active: !d.active }).where(eq(discounts.id, id));
  await audit(user, d.active ? "discount.deactivated" : "discount.activated", "discount", id, { code: d.code });
  revalidatePath("/admin/discounts");
  back("/admin/discounts", { ok: `${d.code} ${d.active ? "deactivated" : "activated"}.` });
}

/* ───────── Reviews ───────── */

export async function moderateReviewAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const status = str(formData, "status", 20);
  const ret = str(formData, "_return", 200) || "/admin/reviews";
  if (!["approved", "rejected", "hidden", "pending"].includes(status)) back(ret, { error: "Invalid status." });
  const db = await getDb();
  await db.update(reviews).set({ status: status as "approved", reported: status === "approved" ? false : undefined, adminNote: str(formData, "adminNote", 500) }).where(eq(reviews.id, id));
  await audit(user, `review.${status}`, "review", id, {});
  revalidatePath("/admin/reviews");
  back(ret.startsWith("/admin") ? ret : "/admin/reviews", { ok: `Review ${status}.` });
}

/* ───────── Customers ───────── */

export async function setCustomerDisabledAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const disabled = bool(formData, "disabled");
  const db = await getDb();
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) back("/admin/customers", { error: "Customer not found." });
  if (target.role !== "customer") back(`/admin/customers/${id}`, { error: "Staff accounts are managed in Users & roles." });
  await db.update(users).set({ disabled }).where(eq(users.id, id));
  if (disabled) await db.delete(sessions).where(eq(sessions.userId, id));
  await audit(user, disabled ? "customer.disabled" : "customer.enabled", "user", id, { email: target.email });
  revalidatePath(`/admin/customers/${id}`);
  back(`/admin/customers/${id}`, { ok: disabled ? "Account disabled and signed out." : "Account re-enabled." });
}

/* ───────── Messages ───────── */

export async function toggleMessageHandledAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const db = await getDb();
  const [m] = await db.select().from(contactMessages).where(eq(contactMessages.id, id)).limit(1);
  if (!m) back("/admin/messages", { error: "Message not found." });
  await db.update(contactMessages).set({ handled: !m.handled }).where(eq(contactMessages.id, id));
  await audit(user, m.handled ? "message.reopened" : "message.handled", "message", id, {});
  revalidatePath("/admin/messages");
  back("/admin/messages", { ok: m.handled ? "Marked as open." : "Marked as handled." });
}
