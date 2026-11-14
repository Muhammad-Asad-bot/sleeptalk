/**
 * Development seed data for placeholder content and settings. Product listings are
 * intentionally not seeded; add real products from Admin.
 */
import { eq } from "drizzle-orm";
import type { Db } from "./client";
import * as s from "./schema";
import { DEFAULT_SETTINGS } from "@/content/defaults";
import {
  BRAND_IMAGES,
  DEMO_DETAIL_IMAGES,
  demoFlatLay,
} from "@/content/demo-assets";
import { hashPassword } from "@/lib/password";

/** About page copy — exported so it can be pushed to an existing database without re-seeding. */
export const ABOUT_BODY = `## Say it without saying it.

Some things are too heavy to say out loud. So we wear them instead.

SLEEP TALK is a unisex streetwear label for the thoughts that surface at 3am: the half-finished sentences, the names you almost said, the feelings you never quite found the words for. Every piece is a way of saying something without having to explain it.

> Say less. Mean more.

## Quiet by design

No shouting logos. No slogans fighting for attention across the street. We build around clean lines, considered colour and a fit that sits exactly right. These are clothes that speak softly and still get noticed.

Wear them on the last train home, in the studio, at the corner shop, or on the long walk back when the city finally goes quiet.

## The emblem

A circle, drawn over and over, until it holds a crescent moon. Hand-drawn and imperfect on purpose, it is the heart of the label and the mark on our signature colour-block hoodie. It's a small sign for anyone who has ever lain awake with too much on their mind.

## Made to be lived in

Hoodies, tees, shirts, jackets, trousers and tracksuits, designed for everyday rotation rather than one-off wear. Every piece is unisex, cut to be worn your way: sized up for an oversized drape, or true to size for a sharper line. Not sure? Our [Size Guide](/size-guide) has you covered.

## What we stand for

- **Fewer, better pieces.** We release in considered drops, not endless noise.
- **Unisex by default.** Good clothes don't need a label telling you who they're for.
- **Built for the everyday.** Pieces you reach for again and again, season after season.
- **Feeling first.** If it doesn't mean something, we don't make it.

## From the UK to Canada

We ship across the United Kingdom and Canada, with prices shown in pounds and Canadian dollars so you always know exactly what you're paying. Find delivery options on our [Shipping](/shipping) page.

## Stay up late with us

Join the newsletter for early access to drops and restocks, and follow us on [Instagram](https://www.instagram.com/sleeptalkofficial) and [TikTok](https://www.tiktok.com/@sleeptallk1) for what we're working on next.

Sleep on it. Then say it without saying it.`;

const CATEGORIES = [
  { slug: "hoodies", name: "Hoodies", garment: "hoodie" as const, cw: "block" as const },
  { slug: "t-shirts", name: "T-shirts", garment: "tee" as const, cw: "black" as const },
  { slug: "shirts", name: "Shirts", garment: "shirt" as const, cw: "charcoal" as const },
  { slug: "jackets", name: "Jackets", garment: "jacket" as const, cw: "black" as const },
  { slug: "pants", name: "Pants", garment: "pants" as const, cw: "cream" as const },
  { slug: "tracksuits", name: "Tracksuits", garment: "tracksuit" as const, cw: "charcoal" as const },
];

/** Homepage tracksuit spotlight (section type "editorial"), editable in admin. */
export const SPOTLIGHT_DATA = {
  eyebrow: "Front to back",
  heading: "Quiet on the front. Loud on the back.",
  body: "Some things are better left unsaid, so we stitched them on instead. Made for late nights, early starts and everything in between.",
  points: ["Unisex by design", "Built for late nights and early starts", "Made to be worn, not explained"],
  image: "/images/signature-tracksuit-studio.jpg",
  imageAlt: "Model wearing a SLEEP TALK cream and black colour-block hoodie with the wordmark on the front",
  image2: "/images/hoodie-back-view-studio.jpg",
  image2Alt: "Back of the SLEEP TALK colour-block hoodie showing the embroidered orbit emblem and wordmark",
  ctaLabel: "Shop now",
  ctaHref: "/shop",
  secondaryLabel: "New arrivals",
  secondaryHref: "/new-arrivals",
};

export async function seed(db: Db) {
  console.info("[seed] Seeding SLEEP TALK demo data…");

  await db.transaction(async (tx) => {
    // Markets
    await tx.insert(s.markets).values([
      {
        code: "UK",
        name: "United Kingdom",
        currency: "GBP",
        locale: "en-GB",
        // The store sells in Canada (CAD) only for now; re-enable under Admin → Shipping & markets.
        active: false,
        taxNote: "Tax treatment to be confirmed. Prices shown are demo prices.",
        shippingSummary: "UK shipping options and rates are shown at checkout. Delivery estimates to be confirmed.",
        returnsSummary: "Returns policy to be confirmed. See our Returns page.",
      },
      {
        code: "CA",
        name: "Canada",
        currency: "CAD",
        locale: "en-CA",
        isDefault: true,
        taxNote: "Taxes and duties to be confirmed. Prices shown are demo prices.",
        shippingSummary: "Canadian shipping options and rates are shown at checkout. Delivery estimates to be confirmed.",
        returnsSummary: "Returns policy to be confirmed. See our Returns page.",
      },
    ]);

    // Shipping (placeholder rates — pending client confirmation, no delivery promises)
    await tx.insert(s.shippingRates).values([
      { market: "UK", name: "Standard delivery", description: "Placeholder rate — pending carrier confirmation", price: 495, freeOver: null, position: 0 },
      { market: "UK", name: "Express delivery", description: "Placeholder rate — pending carrier confirmation", price: 995, position: 1 },
      { market: "CA", name: "Standard delivery", description: "Placeholder rate — pending carrier confirmation", price: 1500, freeOver: 50000, position: 0 },
      { market: "CA", name: "Express delivery", description: "Placeholder rate — pending carrier confirmation", price: 2900, position: 1 },
    ]);

    // Settings
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await tx.insert(s.settings).values({ key, value: value as Record<string, unknown> });
    }

    // Categories
    const catIds: Record<string, string> = {};
    for (const [i, c] of CATEGORIES.entries()) {
      const [row] = await tx
        .insert(s.categories)
        .values({
          slug: c.slug,
          name: c.name,
          description: `Unisex ${c.name.toLowerCase()} from SLEEP TALK.`,
          image: demoFlatLay(c.garment, c.cw, "front"),
          position: i,
          seoTitle: `${c.name}`,
          seoDescription: `Shop SLEEP TALK unisex ${c.name.toLowerCase()} in the UK and Canada.`,
        })
        .returning({ id: s.categories.id });
      catIds[c.slug] = row.id;
    }

    // Product listings are added manually after real product details are available.

    // Homepage sections (reorderable / toggleable / editable in admin)
    const sections: { type: s.HomeSectionType; data: Record<string, unknown> }[] = [
      {
        type: "hero",
        data: {
          eyebrow: "New collection",
          heading: "Sleep Talk",
          subheading: "Say it without saying it.",
          ctaLabel: "Shop the collection",
          ctaHref: "/shop",
          image: "/images/urban-steps-hero.webp",
          imageAlt: "Model wearing a SLEEP TALK hoodie on an urban concrete staircase",
          video: "",
        },
      },
      { type: "categories", data: { heading: "Shop by category" } },
      { type: "new_arrivals", data: { eyebrow: "New collection", heading: "Latest drop", limit: 8, ctaLabel: "View all", ctaHref: "/new-arrivals" } },
      {
        type: "brand_story",
        data: {
          heading: "SAY IT WITHOUT SAYING IT.",
          body: "Some things are easier worn than spoken. SLEEP TALK makes clothes for the thoughts you keep to yourself: a hand-drawn orbit, a crescent moon, and a wordmark that doesn't need to shout.",
          image: BRAND_IMAGES.moonReflection,
          imageAlt: "Crescent moon reflected on water — SLEEP TALK moon mark",
          ctaLabel: "Our story",
          ctaHref: "/about",
        },
      },
      { type: "best_sellers", data: { heading: "Best sellers", limit: 4, ctaLabel: "View all", ctaHref: "/best-sellers" } },
      {
        type: "editorial",
        data: SPOTLIGHT_DATA,
      },
      {
        type: "social_gallery",
        data: {
          heading: "Follow along",
          handle: "",
          note: "Social profiles will be linked once official accounts are supplied.",
          images: [
            { src: DEMO_DETAIL_IMAGES.emblem, alt: "Emblem embroidery close-up", href: "" },
            { src: demoFlatLay("hoodie", "block", "front"), alt: "Signature colour-block hoodie (demo)", href: "" },
            { src: BRAND_IMAGES.moonReflection, alt: "Moon mark", href: "" },
            { src: demoFlatLay("tee", "black", "back"), alt: "Wordmark tee back (demo)", href: "" },
            { src: DEMO_DETAIL_IMAGES.wordmark, alt: "Wordmark embroidery close-up", href: "" },
            { src: demoFlatLay("jacket", "block", "back"), alt: "Crescent varsity jacket back (demo)", href: "" },
          ],
        },
      },
      {
        type: "newsletter",
        data: {
          heading: "Hear it first",
          body: "Drops, restocks and the occasional quiet announcement.",
        },
      },
    ];
    // UK-streetwear homepage: hero (+ ticker), latest drop, editorial, categories.
    // Other sections are seeded hidden so admins can switch them on later.
    const HOME_LAYOUT: s.HomeSectionType[] = ["hero", "new_arrivals", "editorial", "categories"];
    await tx.insert(s.homeSections).values(
      sections.map((sec, i) => {
        const pos = HOME_LAYOUT.indexOf(sec.type);
        return { ...sec, position: pos === -1 ? HOME_LAYOUT.length + i : pos, visible: pos !== -1 };
      }),
    );

    // Demo discount codes
    await tx.insert(s.discounts).values([
      {
        code: "WELCOME10",
        description: "Demo: 10% off your first order",
        type: "percentage",
        percentOff: 10,
        isDemo: true,
      },
      {
        code: "SET20",
        description: "Demo: £20 / $35 off tracksuits over £120 / $200",
        type: "fixed",
        amountOff: { UK: 2000, CA: 3500 },
        minSpend: { UK: 12000, CA: 20000 },
        scope: "categories",
        targetIds: [catIds["tracksuits"]],
        isDemo: true,
      },
    ]);
  });

  await ensureAdmin(db);
  console.info("[seed] Done.");
}

/** Local development owner login (requested by the client). Production must set ADMIN_EMAIL / ADMIN_PASSWORD. */
export const DEV_DEFAULT_ADMIN_EMAIL = "asad@gmail.com";
export const DEV_DEFAULT_ADMIN_PASSWORD = "123";

/** Creates the first owner account from ADMIN_EMAIL / ADMIN_PASSWORD. */
export async function ensureAdmin(db: Db) {
  const email = (process.env.ADMIN_EMAIL || DEV_DEFAULT_ADMIN_EMAIL).toLowerCase();
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === "production" || (process.env.DATABASE_URL ?? "").startsWith("postgres")) {
      throw new Error("ADMIN_PASSWORD must be set to create the first admin account on PostgreSQL/production.");
    }
    password = DEV_DEFAULT_ADMIN_PASSWORD;
  }
  const existing = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, email)).limit(1);
  if (existing.length) return;
  await db.insert(s.users).values({
    email,
    passwordHash: await hashPassword(password),
    firstName: "Store",
    lastName: "Owner",
    role: "owner",
  });
  console.info(
    `[seed] Owner account created: ${email}${process.env.ADMIN_PASSWORD ? "" : ` / ${DEV_DEFAULT_ADMIN_PASSWORD} (development default — change it)`}`,
  );
}
