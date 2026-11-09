"use server";

import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { homeSections, pages } from "@/db/schema";
import type { AnnouncementSettings, SocialSettings } from "@/content/defaults";
import { requireStaff } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { back, bool, str } from "@/lib/server/admin";
import { getSettings, saveSetting } from "@/lib/server/settings";

/* ───────── Homepage sections ───────── */

export async function moveSectionAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const dir = str(formData, "dir", 5) === "up" ? -1 : 1;
  const db = await getDb();
  const rows = await db.select().from(homeSections).orderBy(asc(homeSections.position));
  const i = rows.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) back("/admin/content", {});
  const order = [...rows];
  [order[i], order[j]] = [order[j], order[i]];
  await db.transaction(async (tx) => {
    for (const [pos, r] of order.entries()) await tx.update(homeSections).set({ position: pos }).where(eq(homeSections.id, r.id));
  });
  await audit(user, "homepage.reordered", "home_section", id, { type: rows[i].type, dir });
  revalidatePath("/");
  back("/admin/content", { ok: "Homepage order updated." });
}

export async function toggleSectionAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const db = await getDb();
  const [s] = await db.select().from(homeSections).where(eq(homeSections.id, id)).limit(1);
  if (!s) back("/admin/content", { error: "Section not found." });
  await db.update(homeSections).set({ visible: !s.visible }).where(eq(homeSections.id, id));
  await audit(user, s.visible ? "homepage.section_hidden" : "homepage.section_shown", "home_section", id, { type: s.type });
  revalidatePath("/");
  back("/admin/content", { ok: `Section ${s.visible ? "hidden" : "shown"}.` });
}

/**
 * Generic section editor. Fields are posted as f_<key> with a type hint t_<key>:
 * string | text | lines (string[]) | images ("src | alt | href" per line) | number | bool
 */
export async function saveSectionAction(formData: FormData) {
  const user = await requireStaff();
  const id = str(formData, "id", 64);
  const path = `/admin/content/sections/${id}`;
  const db = await getDb();
  const [s] = await db.select().from(homeSections).where(eq(homeSections.id, id)).limit(1);
  if (!s) back("/admin/content", { error: "Section not found." });
  const data: Record<string, unknown> = { ...s.data };
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("t_")) continue;
    const key = k.slice(2);
    if (!/^[a-zA-Z0-9]{1,40}$/.test(key)) continue;
    const raw = String(formData.get(`f_${key}`) ?? "");
    switch (String(v)) {
      case "number": {
        const n = Number(raw);
        if (Number.isFinite(n)) data[key] = Math.max(0, Math.min(48, Math.round(n)));
        break;
      }
      case "bool":
        data[key] = bool(formData, `f_${key}`);
        break;
      case "lines":
        data[key] = raw.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 30);
        break;
      case "images":
        data[key] = raw
          .split("\n")
          .map((l) => l.split("|").map((x) => x.trim()))
          .filter((parts) => parts[0])
          .slice(0, 24)
          .map(([src, alt = "", href = ""]) => ({ src, alt, href }));
        break;
      default:
        data[key] = raw.slice(0, 4000);
    }
  }
  for (const key of Object.keys(data)) {
    if (/(href|Href)$/.test(key) && typeof data[key] === "string" && data[key] && !/^(\/|https:\/\/)/.test(data[key] as string)) {
      back(path, { error: `Links must start with / or https:// (${key}).` });
    }
  }
  await db.update(homeSections).set({ data }).where(eq(homeSections.id, id));
  await audit(user, "homepage.section_updated", "home_section", id, { type: s.type });
  revalidatePath("/");
  back(path, { ok: "Section saved. Changes are live on the homepage." });
}

/* ───────── Pages ───────── */

export async function savePageAction(formData: FormData) {
  const user = await requireStaff();
  const slug = str(formData, "slug", 80);
  const path = `/admin/content/pages/${slug}`;
  const title = str(formData, "title", 140);
  if (!title) back(path, { error: "Title is required." });
  const db = await getDb();
  const [p] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
  if (!p) back("/admin/content/pages", { error: "Page not found." });
  await db
    .update(pages)
    .set({
      title,
      body: str(formData, "body", 50_000),
      seoTitle: str(formData, "seoTitle", 140),
      seoDescription: str(formData, "seoDescription", 320),
      isPlaceholder: bool(formData, "isPlaceholder"),
    })
    .where(eq(pages.slug, slug));
  await audit(user, "page.updated", "page", slug, { title });
  revalidatePath(`/${slug}`);
  back(path, { ok: "Page saved." });
}

/* ───────── Announcement & social ───────── */

export async function saveAnnouncementAction(formData: FormData) {
  const user = await requireStaff();
  const link = str(formData, "link", 300);
  if (link && !/^(\/|https:\/\/)/.test(link)) back("/admin/content/announcement", { error: "Link must start with / or https://" });
  const value: AnnouncementSettings = {
    enabled: bool(formData, "enabled"),
    messages: str(formData, "messages", 2000).split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 6),
    link,
    dismissible: bool(formData, "dismissible"),
  };
  await saveSetting("announcement", value);
  await audit(user, "settings.announcement_updated", "settings", "announcement", { messages: value.messages.length, enabled: value.enabled });
  revalidatePath("/", "layout");
  back("/admin/content/announcement", { ok: "Announcement bar saved." });
}

export async function saveSocialAction(formData: FormData) {
  const user = await requireStaff();
  const keys: (keyof SocialSettings)[] = ["instagram", "tiktok", "facebook", "pinterest", "youtube"];
  const current = (await getSettings()).social;
  const value = { ...current };
  for (const k of keys) {
    const url = str(formData, k, 300);
    if (url && !/^https:\/\/[^\s]+\.[^\s]+/.test(url)) back("/admin/social-links", { error: `${k} must be a full https:// link (or empty).` });
    value[k] = url;
  }
  await saveSetting("social", value);
  await audit(user, "settings.social_updated", "settings", "social", value);
  revalidatePath("/", "layout");
  back("/admin/social-links", { ok: "Social links saved. Icons without a link are hidden once demo mode is off." });
}
