/**
 * DEMO ASSET MANIFEST — single place to find and replace every temporary image.
 *
 * Two kinds of placeholder imagery are used until the client supplies approved photography:
 *
 * 1. GENERATED flat-lays (public/images/demo/*.jpg) built by scripts/generate-demo-images.py
 *    from the client's own logo artwork. Safe to use in development; still replace with real
 *    product photography before launch.
 *
 * 2. REMOTE third-party photos listed in the PRD (section 18). Usage rights are NOT confirmed,
 *    so they are referenced remotely (not downloaded/redistributed), shown with a "Demo image"
 *    tag, and must be removed before production. Two of the PRD links were unreachable when
 *    checked on 2026-11-09 and fall back to a branded placeholder automatically.
 *
 * When real photography arrives: upload it in Admin → Products, then delete the remote entries
 * below and the matching hosts in next.config.ts.
 */

export type DemoGarment = "tee" | "hoodie" | "jacket" | "shirt" | "pants" | "tracksuit";
export type DemoColourway = "black" | "cream" | "charcoal" | "block";

export function demoFlatLay(garment: DemoGarment, colourway: DemoColourway, view: "front" | "back") {
  return `/images/demo/${garment}-${colourway}-${view}.jpg`;
}

export const DEMO_DETAIL_IMAGES = {
  emblem: "/images/demo/detail-emblem.jpg",
  wordmark: "/images/demo/detail-wordmark.jpg",
};

export const BRAND_IMAGES = {
  wordmarkLight: "/brand/wordmark-light.png",
  wordmarkDark: "/brand/wordmark-dark.png",
  lockupLight: "/brand/emblem-lockup-light.png",
  lockupDark: "/brand/emblem-lockup-dark.png",
  emblemLight: "/brand/emblem-light.png",
  emblemDark: "/brand/emblem-dark.png",
  moonLight: "/brand/moon-mark-light.png",
  moonDark: "/brand/moon-mark-dark.png",
  garmentBack: "/brand/garment-back-artwork.jpg",
  garmentFront: "/brand/garment-front-wordmark.jpg",
  moonReflection: "/brand/moon-reflection.jpg",
  ogDefault: "/brand/og-default.jpg",
};

export type RemoteDemoImage = {
  category: string;
  url: string;
  alt: string;
  reachableOnCheck: boolean;
};

/** PRD section 18 — temporary public image URLs (third-party; rights unconfirmed). */
export const REMOTE_DEMO_IMAGES: RemoteDemoImage[] = [
  {
    category: "pants",
    url: "https://bluorng.com/cdn/shop/files/DSC08597.jpg?v=1688450386&width=1200",
    alt: "Demo placeholder: relaxed trousers styled on model",
    reachableOnCheck: true,
  },
  {
    category: "pants",
    url: "https://images.squarespace-cdn.com/content/v1/58d6f8f646c3c4bebcacf90e/1736332411947-U0OZJC9GEZNCJ56LATK4/DSC_9670.jpg?format=2500w",
    alt: "Demo placeholder: streetwear outfit with wide trousers",
    reachableOnCheck: true,
  },
  {
    category: "shirts",
    url: "https://greenwich-showroom.com/cdn/shop/files/whiting-navy-and-ecru-block-check-overshirt-2_1440x1800_01a5742c-3887-454b-8ccd-6a5b00c5db64_800x.webp?v=1744801171",
    alt: "Demo placeholder: block check overshirt",
    reachableOnCheck: true,
  },
  {
    category: "hoodies",
    url: "https://sonderstories.es/cdn/shop/files/HOODIE_INSTINCT_SONDERSORIES_CHICO_I.png?crop=center&height=1400&v=1736094253&width=1000",
    alt: "Demo placeholder: hoodie on model",
    reachableOnCheck: false,
  },
  {
    category: "hoodies",
    url: "https://derschutze.com/cdn/shop/files/20_c6e673a9-3f71-458d-9888-d8cf841687d5.jpg?v=1701038400&width=1440",
    alt: "Demo placeholder: heavyweight hoodie styled on model",
    reachableOnCheck: true,
  },
  {
    category: "jackets",
    url: "https://www.trueprodigy.de/cdn/shop/articles/Generated_with_Kive.ai_-_male_fashion_model_between_25-30_years_is_wearing_the_oversized_jacket_._the_jacket_is_closed_he_also_wears_blue_baggy_jeans_und_and_white_oversized_t-shirt_b.png?v=1769707671",
    alt: "Demo placeholder: oversized jacket on model",
    reachableOnCheck: false,
  },
  {
    category: "jackets",
    url: "https://image-cdn.hypb.st/https%3A/hypebeast.com/image/2025/08/27/no-problemo-alpha-industries-ma-1-bomber-collaboration-release-info-000.jpg?cbr=1&fit=max&h=750&q=90&w=1125",
    alt: "Demo placeholder: bomber jacket editorial",
    reachableOnCheck: true,
  },
  {
    category: "t-shirts",
    url: "https://images.complex.com/complex/image/upload/v1750785356/sanity-new/epic-kid-1-lead_sbuab6.jpg",
    alt: "Demo placeholder: graphic t-shirt editorial",
    reachableOnCheck: true,
  },
  {
    category: "t-shirts",
    url: "https://baseec-img-mng.akamaized.net/images/item/origin/a16c319abce74b7ecfb021dbc3c7191b.jpg?imformat=generic",
    alt: "Demo placeholder: boxy t-shirt",
    reachableOnCheck: true,
  },
  {
    category: "tracksuits",
    url: "https://youngfashionmind.de/cdn/shop/files/IMG_9176_Kopie.jpg?v=1743608284",
    alt: "Demo placeholder: matching tracksuit set",
    reachableOnCheck: true,
  },
  {
    category: "tracksuits",
    url: "https://images.squarespace-cdn.com/content/v1/609093abb694f42c8fba3d4e/1cc122db-a88b-4f0d-943c-ce6353fe4d22/A7301059.jpeg",
    alt: "Demo placeholder: tracksuit editorial",
    reachableOnCheck: true,
  },
];

/** Picks a reachable remote demo image for a category (round-robin by index). */
export function remoteDemoFor(category: string, index = 0): RemoteDemoImage | undefined {
  const pool = REMOTE_DEMO_IMAGES.filter((i) => i.category === category && i.reachableOnCheck);
  return pool.length ? pool[index % pool.length] : undefined;
}

export function isRemoteDemoUrl(url: string) {
  return REMOTE_DEMO_IMAGES.some((i) => i.url === url);
}
