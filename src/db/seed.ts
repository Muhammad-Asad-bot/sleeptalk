/**
 * Demo seed data for development. Everything created here is flagged isDemo and uses
 * clearly fictional copy and dummy GBP/CAD prices. No customer reviews, real business
 * details, material claims or social handles are invented.
 */
import { eq } from "drizzle-orm";
import type { Db } from "./client";
import * as s from "./schema";
import { DEFAULT_SETTINGS } from "@/content/defaults";
import {
  BRAND_IMAGES,
  DEMO_DETAIL_IMAGES,
  demoFlatLay,
  remoteDemoFor,
  type DemoColourway,
  type DemoGarment,
} from "@/content/demo-assets";
import { hashPassword } from "@/lib/password";

type Colour = { name: string; hex: string; cw: DemoColourway; code: string };
const C: Record<string, Colour> = {
  black: { name: "Black", hex: "#141414", cw: "black", code: "BLK" },
  cream: { name: "Cream", hex: "#E8E0D0", cw: "cream", code: "CRM" },
  charcoal: { name: "Charcoal", hex: "#404042", cw: "charcoal", code: "CHR" },
  block: { name: "Cream / Black", hex: "#E8E0D0,#141414", cw: "block", code: "CBK" },
};

const TOP_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const PANT_SIZES = ["XS", "S", "M", "L", "XL"];

type ProductSpec = {
  slug: string;
  title: string;
  category: string;
  garment: DemoGarment;
  code: string;
  colours: Colour[];
  sizes: string[];
  uk: [number, number?];
  ca: [number, number?];
  tags: string[];
  description: string;
  fitNotes: string;
  isNew?: boolean;
  featured?: boolean;
  salesCount?: number;
  isListed?: boolean;
  type?: "standard" | "set";
  components?: { slug: string; label: string }[];
};

const DEMO_FABRIC = "Fabric composition to be confirmed by SLEEP TALK. [Demo content]";
const DEMO_CARE = "Care instructions to be supplied with final product information. [Demo content]";
const DEMO_MODEL = "Model sizing details to be added with final photography. [Demo content]";
const DEMO_MEASUREMENTS = "Garment measurements to be supplied by SLEEP TALK. See the size guide for placeholder charts.";

const PRODUCTS: ProductSpec[] = [
  // ── Hoodies
  {
    slug: "signature-colour-block-hoodie",
    title: "Signature Colour-Block Hoodie",
    category: "hoodies",
    garment: "hoodie",
    code: "HD-SIG",
    colours: [C.block, C.black],
    sizes: TOP_SIZES,
    uk: [9500],
    ca: [16500],
    tags: ["signature", "graphic", "oversized"],
    description:
      "The piece the label started with. An oversized colour-block hoodie carrying the hand-drawn celestial emblem on the chest and the SLEEP TALK wordmark across the back. [Demo product copy]",
    fitNotes: "Oversized, dropped shoulder. Take your usual size for a relaxed fit.",
    isNew: true,
    featured: true,
    salesCount: 48,
  },
  {
    slug: "orbit-heavyweight-hoodie",
    title: "Orbit Heavyweight Graphic Hoodie",
    category: "hoodies",
    garment: "hoodie",
    code: "HD-ORB",
    colours: [C.black, C.charcoal, C.cream],
    sizes: TOP_SIZES,
    uk: [8500],
    ca: [15000],
    tags: ["graphic", "essentials"],
    description:
      "A heavyweight pullover with the orbit emblem front and centre. Built for late nights and early starts. [Demo product copy]",
    fitNotes: "Relaxed fit. Size down for a closer silhouette.",
    salesCount: 36,
  },
  {
    slug: "hush-minimal-pullover-hoodie",
    title: "Hush Minimal Pullover Hoodie",
    category: "hoodies",
    garment: "hoodie",
    code: "HD-HSH",
    colours: [C.cream, C.charcoal],
    sizes: TOP_SIZES,
    uk: [7500, 8500],
    ca: [13000, 15000],
    tags: ["minimal", "essentials", "sale"],
    description: "Quiet by design: a clean pullover hoodie with a tonal wordmark. [Demo product copy]",
    fitNotes: "Regular fit.",
    salesCount: 21,
  },
  // ── T-shirts
  {
    slug: "orbit-oversized-graphic-tee",
    title: "Orbit Oversized Graphic Tee",
    category: "t-shirts",
    garment: "tee",
    code: "TS-ORB",
    colours: [C.black, C.cream],
    sizes: TOP_SIZES,
    uk: [4500],
    ca: [8000],
    tags: ["graphic", "oversized"],
    description: "An oversized tee printed with the full emblem lockup and motto. [Demo product copy]",
    fitNotes: "Oversized, boxy body.",
    isNew: true,
    salesCount: 52,
  },
  {
    slug: "wordmark-minimal-logo-tee",
    title: "Wordmark Minimal Logo Tee",
    category: "t-shirts",
    garment: "tee",
    code: "TS-WMK",
    colours: [C.black, C.cream, C.charcoal],
    sizes: TOP_SIZES,
    uk: [3500],
    ca: [6000],
    tags: ["minimal", "essentials"],
    description: "Everyday tee finished with the SLEEP TALK serif wordmark. [Demo product copy]",
    fitNotes: "Regular fit, true to size.",
    salesCount: 64,
  },
  {
    slug: "low-light-heavyweight-boxy-tee",
    title: "Low Light Heavyweight Boxy Tee",
    category: "t-shirts",
    garment: "tee",
    code: "TS-LLB",
    colours: [C.charcoal, C.black],
    sizes: TOP_SIZES,
    uk: [4000, 5000],
    ca: [7000, 8500],
    tags: ["boxy", "sale"],
    description: "A cropped, boxy heavyweight tee with a structured hand. [Demo product copy]",
    fitNotes: "Boxy and slightly cropped.",
    salesCount: 18,
  },
  // ── Shirts
  {
    slug: "night-shift-oversized-graphic-shirt",
    title: "Night Shift Oversized Graphic Shirt",
    category: "shirts",
    garment: "shirt",
    code: "SH-NSH",
    colours: [C.black],
    sizes: TOP_SIZES,
    uk: [7000],
    ca: [12500],
    tags: ["graphic", "oversized"],
    description: "An oversized button-through shirt with the emblem lockup across the back. [Demo product copy]",
    fitNotes: "Oversized. Wear open as a layer or buttoned.",
    isNew: true,
    salesCount: 12,
  },
  {
    slug: "undertone-utility-overshirt",
    title: "Undertone Utility Overshirt",
    category: "shirts",
    garment: "shirt",
    code: "SH-UND",
    colours: [C.charcoal, C.cream],
    sizes: TOP_SIZES,
    uk: [8000],
    ca: [14000],
    tags: ["utility", "essentials"],
    description: "A workwear-inspired overshirt with a small emblem at the chest. [Demo product copy]",
    fitNotes: "Relaxed fit with room to layer.",
    salesCount: 15,
  },
  {
    slug: "quiet-hours-relaxed-button-up",
    title: "Quiet Hours Relaxed Button-Up",
    category: "shirts",
    garment: "shirt",
    code: "SH-QHR",
    colours: [C.cream, C.black],
    sizes: TOP_SIZES,
    uk: [6000, 7000],
    ca: [10500, 12500],
    tags: ["minimal", "sale"],
    description: "A relaxed button-up for warmer evenings. [Demo product copy]",
    fitNotes: "Relaxed, true to size.",
    salesCount: 9,
  },
  // ── Jackets
  {
    slug: "crescent-varsity-jacket",
    title: "Crescent Varsity Jacket",
    category: "jackets",
    garment: "jacket",
    code: "JK-CRV",
    colours: [C.block, C.black],
    sizes: TOP_SIZES,
    uk: [16000],
    ca: [28000],
    tags: ["signature", "varsity"],
    description: "A varsity-inspired jacket with a crescent moon at the chest and the full lockup on the back. [Demo product copy]",
    fitNotes: "Boxy fit. Take your usual size.",
    isNew: true,
    featured: true,
    salesCount: 22,
  },
  {
    slug: "afterdark-bomber-jacket",
    title: "Afterdark Bomber Jacket",
    category: "jackets",
    garment: "jacket",
    code: "JK-ADB",
    colours: [C.black, C.charcoal],
    sizes: TOP_SIZES,
    uk: [14000],
    ca: [24500],
    tags: ["bomber", "essentials"],
    description: "A clean bomber with ribbed trims and a tonal moon mark. [Demo product copy]",
    fitNotes: "Regular fit with ribbed hem.",
    salesCount: 27,
  },
  {
    slug: "driftline-lightweight-utility-jacket",
    title: "Driftline Lightweight Utility Jacket",
    category: "jackets",
    garment: "jacket",
    code: "JK-DRL",
    colours: [C.cream, C.charcoal],
    sizes: TOP_SIZES,
    uk: [11000, 13000],
    ca: [19500, 23000],
    tags: ["utility", "sale"],
    description: "A lightweight utility layer for in-between weather. [Demo product copy]",
    fitNotes: "Relaxed fit.",
    salesCount: 8,
  },
  // ── Pants
  {
    slug: "tideline-relaxed-cargo-pant",
    title: "Tideline Relaxed Cargo Pant",
    category: "pants",
    garment: "pants",
    code: "PT-TDC",
    colours: [C.black, C.charcoal],
    sizes: PANT_SIZES,
    uk: [8000],
    ca: [14000],
    tags: ["cargo", "utility"],
    description: "Relaxed cargo pants with low-profile utility pockets. [Demo product copy]",
    fitNotes: "Relaxed through the leg with an adjustable hem.",
    isNew: true,
    salesCount: 31,
  },
  {
    slug: "moonwalk-wide-leg-utility-pant",
    title: "Moonwalk Wide-Leg Utility Pant",
    category: "pants",
    garment: "pants",
    code: "PT-MWL",
    colours: [C.cream, C.black],
    sizes: PANT_SIZES,
    uk: [8500],
    ca: [15000],
    tags: ["wide-leg", "utility"],
    description: "A wide-leg utility trouser with a clean front. [Demo product copy]",
    fitNotes: "Wide leg, high rise.",
    salesCount: 14,
  },
  {
    slug: "rest-day-straight-leg-sweatpant",
    title: "Rest Day Straight-Leg Sweatpant",
    category: "pants",
    garment: "pants",
    code: "PT-RDS",
    colours: [C.charcoal, C.black, C.cream],
    sizes: PANT_SIZES,
    uk: [6500],
    ca: [11500],
    tags: ["essentials", "sweats"],
    description: "Straight-leg sweatpants with the wordmark at the back pocket. [Demo product copy]",
    fitNotes: "Straight leg, regular rise.",
    salesCount: 40,
  },
  // ── Tracksuit components
  {
    slug: "orbit-zip-track-jacket",
    title: "Orbit Zip Track Jacket",
    category: "tracksuits",
    garment: "jacket",
    code: "TR-OZJ",
    colours: [C.black, C.charcoal],
    sizes: TOP_SIZES,
    uk: [8500],
    ca: [15000],
    tags: ["tracksuit", "matching-set"],
    description: "The zip top from the Orbit tracksuit. Sold on its own or as part of the complete set. [Demo product copy]",
    fitNotes: "Regular fit.",
    salesCount: 11,
  },
  {
    slug: "orbit-track-pant",
    title: "Orbit Track Pant",
    category: "tracksuits",
    garment: "pants",
    code: "TR-OTP",
    colours: [C.black, C.charcoal],
    sizes: PANT_SIZES,
    uk: [7000],
    ca: [12500],
    tags: ["tracksuit", "matching-set"],
    description: "The track pant from the Orbit tracksuit. Sold on its own or as part of the complete set. [Demo product copy]",
    fitNotes: "Tapered leg with elasticated cuffs.",
    salesCount: 10,
  },
  {
    slug: "nocturne-set-hoodie",
    title: "Nocturne Set Hoodie",
    category: "tracksuits",
    garment: "hoodie",
    code: "TR-NSH",
    colours: [C.black, C.cream],
    sizes: TOP_SIZES,
    uk: [8500],
    ca: [15000],
    tags: ["tracksuit"],
    description: "Hoodie component of the Nocturne set (sold as a set only). [Demo product copy]",
    fitNotes: "Relaxed fit.",
    isListed: false,
  },
  {
    slug: "nocturne-set-jogger",
    title: "Nocturne Set Jogger",
    category: "tracksuits",
    garment: "pants",
    code: "TR-NSJ",
    colours: [C.black, C.cream],
    sizes: PANT_SIZES,
    uk: [7000],
    ca: [12500],
    tags: ["tracksuit"],
    description: "Jogger component of the Nocturne set (sold as a set only). [Demo product copy]",
    fitNotes: "Relaxed jogger fit.",
    isListed: false,
  },
  {
    slug: "colour-block-track-top",
    title: "Colour-Block Track Top",
    category: "tracksuits",
    garment: "jacket",
    code: "TR-CBT",
    colours: [C.block],
    sizes: TOP_SIZES,
    uk: [9000],
    ca: [16000],
    tags: ["tracksuit", "signature"],
    description: "Top component of the Colour-Block set (sold as a set only). [Demo product copy]",
    fitNotes: "Boxy fit.",
    isListed: false,
  },
  {
    slug: "colour-block-track-pant",
    title: "Colour-Block Track Pant",
    category: "tracksuits",
    garment: "pants",
    code: "TR-CBP",
    colours: [C.block],
    sizes: PANT_SIZES,
    uk: [7500],
    ca: [13000],
    tags: ["tracksuit", "signature"],
    description: "Pant component of the Colour-Block set (sold as a set only). [Demo product copy]",
    fitNotes: "Straight leg.",
    isListed: false,
  },
  // ── Tracksuit sets
  {
    slug: "orbit-zip-tracksuit-set",
    title: "Orbit Zip Tracksuit Set",
    category: "tracksuits",
    garment: "tracksuit",
    code: "SET-ORB",
    colours: [C.black, C.charcoal],
    sizes: [],
    uk: [14500],
    ca: [25500],
    tags: ["tracksuit", "matching-set"],
    description:
      "The complete Orbit tracksuit: zip track jacket and track pant. Choose your top and bottom sizes separately. Price is for the complete set. [Demo product copy]",
    fitNotes: "Top: regular fit. Pant: tapered leg.",
    type: "set",
    isNew: true,
    featured: true,
    salesCount: 19,
    components: [
      { slug: "orbit-zip-track-jacket", label: "Top" },
      { slug: "orbit-track-pant", label: "Bottom" },
    ],
  },
  {
    slug: "nocturne-hoodie-jogger-set",
    title: "Nocturne Hoodie + Jogger Set",
    category: "tracksuits",
    garment: "tracksuit",
    code: "SET-NOC",
    colours: [C.black, C.cream],
    sizes: [],
    uk: [15000],
    ca: [26500],
    tags: ["tracksuit", "essentials"],
    description:
      "A matching hoodie and jogger set. Sold as a complete set only; select top and bottom sizes separately. [Demo product copy]",
    fitNotes: "Relaxed fit throughout.",
    type: "set",
    salesCount: 25,
    components: [
      { slug: "nocturne-set-hoodie", label: "Top" },
      { slug: "nocturne-set-jogger", label: "Bottom" },
    ],
  },
  {
    slug: "colour-block-tracksuit-set",
    title: "Colour-Block Tracksuit Set",
    category: "tracksuits",
    garment: "tracksuit",
    code: "SET-CBK",
    colours: [C.block],
    sizes: [],
    uk: [15500, 16500],
    ca: [27000, 29000],
    tags: ["tracksuit", "signature", "sale"],
    description:
      "Cream and black colour-blocking taken from the signature hoodie, as a complete track set. Price is for the complete set. [Demo product copy]",
    fitNotes: "Top: boxy. Pant: straight leg.",
    type: "set",
    featured: true,
    salesCount: 17,
    components: [
      { slug: "colour-block-track-top", label: "Top" },
      { slug: "colour-block-track-pant", label: "Bottom" },
    ],
  },
];

const CATEGORIES = [
  { slug: "hoodies", name: "Hoodies", garment: "hoodie" as const, cw: "block" as const },
  { slug: "t-shirts", name: "T-shirts", garment: "tee" as const, cw: "black" as const },
  { slug: "shirts", name: "Shirts", garment: "shirt" as const, cw: "charcoal" as const },
  { slug: "jackets", name: "Jackets", garment: "jacket" as const, cw: "black" as const },
  { slug: "pants", name: "Pants", garment: "pants" as const, cw: "cream" as const },
  { slug: "tracksuits", name: "Tracksuits", garment: "tracksuit" as const, cw: "charcoal" as const },
];

/** Deterministic pseudo-random stock so demo data is stable between resets. */
function demoStock(sku: string) {
  let h = 0;
  for (const ch of sku) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const r = h % 20;
  if (r === 0) return 0; // some sizes sold out
  if (r < 3) return 2; // low stock
  return 6 + (h % 18);
}

const PAGES: { slug: string; title: string; body: string }[] = [
  {
    slug: "about",
    title: "About SLEEP TALK",
    body: `## Say it without saying it.

SLEEP TALK is a unisex streetwear label built around the things we mean but never quite say out loud. The hand-drawn orbit, the crescent moon and the quiet serif wordmark are the starting point for every piece.

> [Placeholder brand story — the client will supply final copy.]

## The emblem

A circle drawn over and over until it holds a crescent moon. It is the mark on our signature colour-block hoodie and the centre of the label.

## Made for the UK and Canada

We currently ship to the United Kingdom and Canada. Delivery details are set out on our Shipping page once carriers are confirmed.`,
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
    body: `All measurements are in **inches**, using standard Canadian (North American) unisex sizing. Not sure between two sizes? Pick the larger one for a relaxed fit, or go one size up for an oversized streetwear look.

## Find your size (body measurements)

| Size | Chest | Waist | Hips |
| --- | --- | --- | --- |
| XS | 31–34 | 26–28 | 32–35 |
| S (Small) | 34–37 | 28–31 | 35–38 |
| M (Medium) | 38–41 | 32–35 | 38–41 |
| L (Large) | 42–45 | 36–39 | 41–44 |
| XL | 46–49 | 40–43 | 44–47 |
| XXL | 50–53 | 44–47 | 47–50 |

## Hoodies & sweatshirts (garment measurements)

| Size | Chest width (pit to pit) | Body length | Sleeve (centre back) |
| --- | --- | --- | --- |
| XS | 18 | 26 | 32½ |
| S (Small) | 20 | 27 | 33½ |
| M (Medium) | 22 | 28 | 34½ |
| L (Large) | 24 | 29 | 35½ |
| XL | 26 | 30 | 36½ |
| XXL | 28 | 31 | 37½ |

## T-shirts & shirts (garment measurements)

| Size | Chest width (pit to pit) | Body length |
| --- | --- | --- |
| XS | 16½ | 27 |
| S (Small) | 18 | 28 |
| M (Medium) | 20 | 29 |
| L (Large) | 22 | 30 |
| XL | 24 | 31 |
| XXL | 26 | 32 |

## Pants, joggers & track pants

| Size | Waist (to fit) | Hips | Inseam |
| --- | --- | --- | --- |
| XS | 26–28 | 32–35 | 29 |
| S (Small) | 28–31 | 35–38 | 30 |
| M (Medium) | 32–35 | 38–41 | 30½ |
| L (Large) | 36–39 | 41–44 | 31 |
| XL | 40–43 | 44–47 | 31½ |
| XXL | 44–47 | 47–50 | 32 |

## How to measure
- **Chest:** around the fullest part of your chest, under the arms, keeping the tape level.
- **Waist:** around your natural waistline, just above the belly button.
- **Hips:** around the widest part of your hips.
- **Inseam:** from the crotch seam to the bottom of the ankle.
- **Garment chest width:** lay the item flat and measure straight across, armpit to armpit. Double it for the full chest.

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
    body: `Questions about an order, sizing or anything else? Send us a message and we'll get back to you.

> [Placeholder contact details are shown in demo mode. The client will supply official support details.]`,
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

    // Products
    const productIds: Record<string, string> = {};
    const now = Date.now();
    for (const [pi, p] of PRODUCTS.entries()) {
      const [row] = await tx
        .insert(s.products)
        .values({
          slug: p.slug,
          title: p.title,
          description: p.description,
          fitNotes: p.fitNotes,
          fabric: DEMO_FABRIC,
          care: DEMO_CARE,
          modelInfo: DEMO_MODEL,
          measurements: DEMO_MEASUREMENTS,
          type: p.type ?? "standard",
          categoryId: catIds[p.category],
          tags: p.tags,
          status: "active",
          isListed: p.isListed ?? true,
          isFeatured: p.featured ?? false,
          isNewArrival: p.isNew ?? false,
          salesCount: p.salesCount ?? 0,
          seoTitle: p.title,
          seoDescription: p.description.replace(" [Demo product copy]", "").slice(0, 155),
          isDemo: true,
          publishedAt: new Date(now - pi * 86_400_000),
          createdAt: new Date(now - pi * 86_400_000),
        })
        .returning({ id: s.products.id });
      productIds[p.slug] = row.id;

      await tx.insert(s.productPrices).values([
        { productId: row.id, market: "UK", amount: p.uk[0], compareAt: p.uk[1] ?? null },
        { productId: row.id, market: "CA", amount: p.ca[0], compareAt: p.ca[1] ?? null },
      ]);

      // Images: front/back flat-lay per colour, a detail shot, and (listed items) a remote demo photo
      const images: (typeof s.productImages.$inferInsert)[] = [];
      let pos = 0;
      for (const colour of p.colours) {
        images.push({
          productId: row.id,
          url: demoFlatLay(p.garment, colour.cw, "front"),
          alt: `${p.title} in ${colour.name}, front (demo illustration)`,
          color: colour.name,
          position: pos++,
          isDemo: true,
          sourceNote: "Generated demo flat-lay",
        });
        images.push({
          productId: row.id,
          url: demoFlatLay(p.garment, colour.cw, "back"),
          alt: `${p.title} in ${colour.name}, back (demo illustration)`,
          color: colour.name,
          position: pos++,
          isDemo: true,
          sourceNote: "Generated demo flat-lay",
        });
      }
      images.push({
        productId: row.id,
        url: pi % 2 === 0 ? DEMO_DETAIL_IMAGES.emblem : DEMO_DETAIL_IMAGES.wordmark,
        alt: "Close-up of SLEEP TALK embroidered artwork",
        position: pos++,
        isDemo: true,
        sourceNote: "Crop of client-supplied artwork photo",
      });
      const remote = (p.isListed ?? true) ? remoteDemoFor(p.category, pi) : undefined;
      if (remote) {
        images.push({
          productId: row.id,
          url: remote.url,
          alt: remote.alt,
          position: pos++,
          isDemo: true,
          sourceNote: "PRD temporary third-party image — rights unconfirmed, replace before launch",
        });
      }
      await tx.insert(s.productImages).values(images);

      // Variants (sets have none — they draw stock from their components)
      if ((p.type ?? "standard") === "standard") {
        let vpos = 0;
        for (const colour of p.colours) {
          for (const size of p.sizes) {
            const sku = `ST-${p.code}-${colour.code}-${size}`;
            const stock = demoStock(sku);
            const [v] = await tx
              .insert(s.variants)
              .values({
                productId: row.id,
                sku,
                color: colour.name,
                colorHex: colour.hex,
                size,
                stock,
                lowStockThreshold: 3,
                position: vpos++,
              })
              .returning({ id: s.variants.id });
            await tx.insert(s.stockMovements).values({
              variantId: v.id,
              delta: stock,
              stockAfter: stock,
              reason: "initial",
              note: "Demo seed stock",
            });
          }
        }
      }
    }

    // Set composition
    for (const p of PRODUCTS) {
      if (p.type !== "set" || !p.components) continue;
      for (const [i, comp] of p.components.entries()) {
        await tx.insert(s.setComponents).values({
          setProductId: productIds[p.slug],
          componentProductId: productIds[comp.slug],
          label: comp.label,
          position: i,
        });
      }
    }

    // Collections (examples only — fully editable in admin)
    const [signature] = await tx
      .insert(s.collections)
      .values({
        slug: "signature",
        title: "Signature",
        description:
          "Built around the original colour-block hoodie: the orbit emblem, the crescent moon and cream-on-black contrast. [Demo collection]",
        image: BRAND_IMAGES.garmentBack,
        mode: "manual",
        position: 0,
        isDemo: true,
      })
      .returning({ id: s.collections.id });
    const signatureSlugs = [
      "signature-colour-block-hoodie",
      "crescent-varsity-jacket",
      "colour-block-tracksuit-set",
      "orbit-oversized-graphic-tee",
      "night-shift-oversized-graphic-shirt",
    ];
    await tx.insert(s.collectionProducts).values(
      signatureSlugs.map((slug, i) => ({ collectionId: signature.id, productId: productIds[slug], position: i })),
    );

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
    const [limited] = await tx
      .insert(s.collections)
      .values({
        slug: "limited-drop",
        title: "Limited Drop",
        description: "Small-run pieces. When they're gone, they're gone. [Demo collection]",
        image: demoFlatLay("jacket", "block", "back"),
        mode: "manual",
        position: 3,
        isDemo: true,
      })
      .returning({ id: s.collections.id });
    await tx.insert(s.collectionProducts).values(
      ["crescent-varsity-jacket", "orbit-zip-tracksuit-set", "signature-colour-block-hoodie"].map((slug, i) => ({
        collectionId: limited.id,
        productId: productIds[slug],
        position: i,
      })),
    );

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
          image: "/images/urban-steps-hero.png",
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
