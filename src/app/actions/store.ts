"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { contactMessages, newsletterSubscribers, orders } from "@/db/schema";
import { NEWSLETTER_CONSENT_TEXT } from "@/content/defaults";
import { isMarketCode, MARKET_COOKIE } from "@/lib/markets";
import { emailSchema } from "@/lib/validation";
import { getMarket } from "@/lib/server/market";
import { limitByIp, randomToken, safeEqual } from "@/lib/server/security";
import { sendEmail } from "@/lib/server/email";
import { getSettings } from "@/lib/server/settings";
import { absoluteUrl } from "@/lib/utils";
import { z } from "zod";

export async function setMarketAction(code: string) {
  if (!isMarketCode(code)) return { ok: false };
  const store = await cookies();
  // Preference cookie (strictly necessary: determines currency/prices shown)
  store.set(MARKET_COOKIE, code, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365, httpOnly: false });
  return { ok: true };
}

export type FormState = { ok: boolean; message?: string; errors?: Record<string, string> } | null;

export async function subscribeNewsletterAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const limited = await limitByIp("newsletter", 8, 10 * 60_000);
  if (!limited.ok) return { ok: false, message: "Too many attempts. Please try again later." };
  if (formData.get("website")) return { ok: true, message: "Thanks — you're on the list." }; // honeypot
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { ok: false, errors: { email: "Enter a valid email address" } };
  if (formData.get("consent") !== "on") return { ok: false, errors: { consent: "Please tick the box to agree to receive emails." } };
  const db = await getDb();
  const market = await getMarket();
  const [existing] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email.data)).limit(1);
  if (existing && !existing.unsubscribedAt) {
    return { ok: true, message: "You're already subscribed — thanks for being here." };
  }
  const token = randomToken(18);
  if (existing) {
    await db
      .update(newsletterSubscribers)
      .set({ unsubscribedAt: null, consentAt: new Date(), consentText: NEWSLETTER_CONSENT_TEXT, market, unsubscribeToken: token })
      .where(eq(newsletterSubscribers.id, existing.id));
  } else {
    await db.insert(newsletterSubscribers).values({ email: email.data, market, consentText: NEWSLETTER_CONSENT_TEXT, unsubscribeToken: token });
  }
  await sendEmail({
    to: email.data,
    subject: "You're on the SLEEP TALK list",
    text: `Thanks for subscribing to SLEEP TALK.\n\nUnsubscribe anytime: ${absoluteUrl(`/unsubscribe?t=${token}`)}`,
  });
  return { ok: true, message: "Thanks — you're on the list." };
}

export async function unsubscribeAction(token: string) {
  if (!token || token.length > 64) return false;
  const db = await getDb();
  const [row] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.unsubscribeToken, token)).limit(1);
  if (!row) return false;
  await db.update(newsletterSubscribers).set({ unsubscribedAt: new Date() }).where(eq(newsletterSubscribers.id, row.id));
  return true;
}

const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: emailSchema,
  subject: z.string().trim().max(120).optional().default(""),
  orderNumber: z.string().trim().max(30).optional().default(""),
  message: z.string().trim().min(10, "Tell us a little more (10+ characters)").max(4000),
});

export async function contactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const limited = await limitByIp("contact", 5, 10 * 60_000);
  if (!limited.ok) return { ok: false, message: "Too many messages. Please try again later." };
  if (formData.get("website")) return { ok: true, message: "Thanks — we'll be in touch." };
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, errors };
  }
  const db = await getDb();
  await db.insert(contactMessages).values(parsed.data);
  const { store } = await getSettings();
  await sendEmail({
    to: store.supportEmail,
    subject: `Contact form: ${parsed.data.subject || "New message"}`,
    text: `From: ${parsed.data.name} <${parsed.data.email}>\nOrder: ${parsed.data.orderNumber || "—"}\n\n${parsed.data.message}`,
  });
  return { ok: true, message: "Thanks — your message has been sent. We'll reply by email." };
}

/** Guest order tracking: order number + email (rate limited). */
export async function trackOrderAction(_prev: FormState, formData: FormData): Promise<FormState & { redirect?: string }> {
  const limited = await limitByIp("track", 10, 10 * 60_000);
  if (!limited.ok) return { ok: false, message: "Too many attempts. Please try again later." };
  const number = String(formData.get("orderNumber") ?? "").trim().toUpperCase();
  const email = emailSchema.safeParse(formData.get("email"));
  if (!number || !email.success) return { ok: false, message: "Enter your order number and the email used at checkout." };
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.number, number)).limit(1);
  if (!order || !safeEqual(order.email.toLowerCase(), email.data)) {
    return { ok: false, message: "We couldn't find an order with those details." };
  }
  return { ok: true, redirect: `/order-confirmation/${order.number}?t=${order.accessToken}&view=track` };
}
