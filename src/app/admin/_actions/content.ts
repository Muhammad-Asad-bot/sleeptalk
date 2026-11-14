"use server";

import { revalidatePath } from "next/cache";
import { refreshStorefront } from "@/lib/server/store-cache";
import type { AnnouncementSettings, SocialSettings } from "@/content/defaults";
import { requireStaff } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { back, bool, str } from "@/lib/server/admin";
import { getSettings, saveSetting } from "@/lib/server/settings";

/* ───────── Announcement & social ───────── */

export async function saveAnnouncementAction(formData: FormData) {
  const user = await requireStaff();
  const link = str(formData, "link", 300);
  if (link && !/^(\/|https:\/\/)/.test(link)) back("/admin/content/announcement", { error: "Link must start with / or https://" });
  const value: AnnouncementSettings = {
    enabled: bool(formData, "enabled"),
    messages: str(formData, "messages", 2000).split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 6),
    link,
    freeShippingText: str(formData, "freeShippingText", 160),
    dismissible: bool(formData, "dismissible"),
  };
  await saveSetting("announcement", value);
  await audit(user, "settings.announcement_updated", "settings", "announcement", { messages: value.messages.length, enabled: value.enabled });
  revalidatePath("/", "layout");
  refreshStorefront();
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
  refreshStorefront();
  back("/admin/social-links", { ok: "Social links saved. Icons without a link are hidden once demo mode is off." });
}
