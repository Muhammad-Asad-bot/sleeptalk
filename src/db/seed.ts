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

const PAGES: { slug: string; title: string; body: string }[] = [
  {
    slug: "about",
    title: "About SLEEP TALK",
    body: ABOUT_BODY,
  },
  {
    slug: "faq",
    title: "Frequently asked questions",
    body: `> [Placeholder answers — final wording to be supplied and reviewed by SLEEP TALK.]

## Which countries do you ship to?
We sell to the United Kingdom and Canada at launch. Prices are shown in GBP (£) for the UK and CAD ($) for Canada.

## How do I choose my size?
Every product page links to our Size Guide. Our pieces are unisex; fit notes on each product describe how it is intended to sit.

## Can I buy tracksuit pieces separately?
Some tracksuits are available as a complete set and as individual matching pieces. Each product page states clearly whether the price is for the full set or a single piece.

## How do returns work?
Our returns policy will be published on the Returns page once confirmed.

## Do I need an account to order?
No. Guest checkout is available. An account lets you track orders, save addresses and keep a wishlist.

## How can I track my order?
Use the Track Order page with your order number and email address, or view it in your account.`,
  },
  {
    slug: "size-guide",
    title: "Size guide",
    body: `## Standard or oversized?

Every piece is unisex, and our size chart covers two fits. **Standard fit** is our relaxed everyday cut: take your usual size. **Oversized fit** has a wider body, dropped shoulder and extra length for a roomier streetwear look. Want the oversized length without as much width? Try one size down. Compare both fits for S to XL in the chart above.

## Find your size (body measurements)

Body measurements in inches.

| Size | Chest | Waist | Hips |
| --- | --- | --- | --- |
| XS | 31–34 | 26–28 | 32–35 |
| S (Small) | 34–37 | 28–31 | 35–38 |
| M (Medium) | 38–41 | 32–35 | 38–41 |
| L (Large) | 42–45 | 36–39 | 41–44 |
| XL | 46–49 | 40–43 | 44–47 |
| XXL | 50–53 | 44–47 | 47–50 |

## How to measure
- **Chest:** around the fullest part of your chest, under the arms, keeping the tape level.
- **Waist:** around your natural waistline, just above the belly button.
- **Hips:** around the widest part of your hips.
- **Inseam:** from the crotch seam to the bottom of the ankle.
- **Garment measurements:** lay the item flat without stretching. Widths marked ½ in the chart are measured straight across; double them for the full measurement.

Measurements can vary by about ½ inch between pieces. Questions about fit? [Contact us](/contact) and we'll help you choose.`,
  },
  {
    slug: "shipping",
    title: "Shipping & delivery",
    body: `> [Placeholder policy — shipping carriers, rates, delivery estimates and free-shipping thresholds are pending client confirmation. No delivery times are promised.]

## United Kingdom
Shipping options and rates are shown at checkout. Delivery estimates will be published once carriers are confirmed.

## Canada
Shipping options and rates are shown at checkout. Information on duties and taxes will be published once the fulfilment model is confirmed.`,
  },
  {
    slug: "returns",
    title: "Returns & refunds",
    body: `> [Placeholder policy — the returns/exchange policy and return address are to be supplied by the client and legally reviewed.]

## Returns window
To be confirmed.

## How to start a return
To be confirmed. Please contact us via the Contact page in the meantime.

## Refunds
Refunds are issued to the original payment method once a return has been received and inspected.`,
  },
  {
    slug: "privacy-policy",
    title: "Privacy policy",
    body: `> [Placeholder — final privacy notice to be supplied and approved by the client and legal counsel, covering UK GDPR and Canadian (PIPEDA) requirements.]

## What we collect
Order, account and contact details you provide, and — only with your consent — analytics cookies.

## How we use it
To process orders, provide customer service, and (if you opt in) send marketing emails.

## Your rights
You can request access to or deletion of your data. Data retention and deletion processes are to be confirmed.`,
  },
  {
    slug: "terms",
    title: "Terms & conditions",
    body: `> [Placeholder — terms and conditions to be supplied and approved by the client and legal counsel.]

## Orders
Orders are confirmed only after successful payment.

## Pricing
Prices are shown per market in GBP or CAD.`,
  },
  {
    slug: "cookie-policy",
    title: "Cookie policy",
    body: `> [Placeholder — final cookie wording to be reviewed by the client/legal counsel.]

## Essential cookies
Used to keep your bag, session, selected market and cookie preferences. These are required for the store to work.

## Analytics cookies
Only set if you accept them in the cookie banner. You can change your choice anytime via "Cookie preferences" in the footer.`,
  },
  {
    slug: "contact",
    title: "Contact us",
    body: `Questions about an order, sizing or anything else? Send us a message and we'll get back to you.`,
  },
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
          description: `Unisex ${c.name.toLowerCase()} from SLEEP TALK. [Demo category copy]`,
          image: demoFlatLay(c.garment, c.cw, "front"),
          position: i,
          seoTitle: `${c.name}`,
          seoDescription: `Shop SLEEP TALK unisex ${c.name.toLowerCase()} in the UK and Canada.`,
        })
        .returning({ id: s.categories.id });
      catIds[c.slug] = row.id;
    }

    // Product listings are added manually after real product details are available.

    // Collections (examples only — fully editable in admin)
    await tx.insert(s.collections).values([
      {
        slug: "new-season",
        title: "New Season",
        description: "The latest pieces from SLEEP TALK. [Demo collection]",
        image: demoFlatLay("tracksuit", "black", "front"),
        mode: "rule",
        rules: { newArrivals: true },
        position: 1,
        isDemo: true,
      },
      {
        slug: "essentials",
        title: "Essentials",
        description: "Everyday staples in black, cream and charcoal. [Demo collection]",
        image: demoFlatLay("tee", "cream", "front"),
        mode: "rule",
        rules: { tags: ["essentials"] },
        position: 2,
        isDemo: true,
      },
    ]);
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
    // UK-streetwear homepage: hero (+ ticker), latest drop, categories, campaign collection.
    // Other sections are seeded hidden so admins can switch them on later.
    const HOME_LAYOUT: s.HomeSectionType[] = ["hero", "new_arrivals", "editorial", "categories", "featured_collection"];
    await tx.insert(s.homeSections).values(
      sections.map((sec, i) => {
        const pos = HOME_LAYOUT.indexOf(sec.type);
        return { ...sec, position: pos === -1 ? HOME_LAYOUT.length + i : pos, visible: pos !== -1 };
      }),
    );

    // Content pages
    await tx.insert(s.pages).values(
      PAGES.map((p) => ({
        slug: p.slug,
        title: p.title,
        body: p.body,
        seoTitle: p.title,
        seoDescription: `${p.title} — SLEEP TALK`,
        isPlaceholder: true,
      })),
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
