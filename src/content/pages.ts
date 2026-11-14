/**
 * Storefront content pages (About, FAQ, Contact, Size guide, Shipping, Returns and legal pages).
 * Edit the wording here: bodies are Markdown. Update `updatedAt` when you change a page, since the
 * page shows it as "Last updated". Legal wording must be approved by the client/legal counsel.
 */

export type ContentPage = {
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  updatedAt: Date;
  body: string;
};

export const CONTENT_PAGES: Record<string, ContentPage> = {
  "about": {
    slug: "about",
    title: "About SLEEP TALK",
    seoTitle: "About SLEEP TALK",
    seoDescription: "SLEEP TALK is a unisex streetwear label for the things you mean but never quite say. Quiet by design, made to be lived in. Shipping to the UK and Canada.",
    updatedAt: new Date("2026-11-10T16:44:58.207Z"),
    body: "## Say it without saying it.\r\n\r\nSome things are too heavy to say out loud. So we wear them instead.\r\n\r\nSLEEP TALK is a unisex streetwear label for the thoughts that surface at 3am: the half-finished sentences, the names you almost said, the feelings you never quite found the words for. Every piece is a way of saying something without having to explain it.\r\n\r\n> Say less. Mean more.\r\n\r\n## Quiet by design\r\n\r\nNo shouting logos. No slogans fighting for attention across the street. We build around clean lines, considered colour and a fit that sits exactly right. These are clothes that speak softly and still get noticed.\r\n\r\nWear them on the last train home, in the studio, at the corner shop, or on the long walk back when the city finally goes quiet.\r\n\r\n## The emblem\r\n\r\nA circle, drawn over and over, until it holds a crescent moon. Hand-drawn and imperfect on purpose, it is the heart of the label and the mark on our signature colour-block hoodie. It's a small sign for anyone who has ever lain awake with too much on their mind.\r\n\r\n## Made to be lived in\r\n\r\nHoodies, tees, shirts, jackets, trousers and tracksuits, designed for everyday rotation rather than one-off wear. Every piece is unisex, cut to be worn your way: sized up for an oversized drape, or true to size for a sharper line. Not sure? Our [Size Guide](/size-guide) has you covered.\r\n\r\n## What we stand for\r\n\r\n- **Fewer, better pieces.** We release in considered drops, not endless noise.\r\n- **Unisex by default.** Good clothes don't need a label telling you who they're for.\r\n- **Built for the everyday.** Pieces you reach for again and again, season after season.\r\n- **Feeling first.** If it doesn't mean something, we don't make it.\r\n\r\n## From the UK to Canada\r\n\r\nWe ship across the United Kingdom and Canada, with prices shown in pounds and Canadian dollars so you always know exactly what you're paying. Find delivery options on our [Shipping](/shipping) page.\r\n\r\n## Stay up late with us\r\n\r\nJoin the newsletter for early access to drops and restocks, and follow us on [Instagram](https://www.instagram.com/sleeptalkofficial) and [TikTok](https://www.tiktok.com/@sleeptallk1) for what we're working on next.\r\n\r\nSleep on it. Then say it without saying it.",
  },
  "contact": {
    slug: "contact",
    title: "Contact us",
    seoTitle: "Contact us",
    seoDescription: "Contact us — SLEEP TALK",
    updatedAt: new Date("2026-11-10T16:41:54.977Z"),
    body: "Questions about an order, sizing or anything else? Send us a message and we'll get back to you.",
  },
  "cookie-policy": {
    slug: "cookie-policy",
    title: "Cookie policy",
    seoTitle: "Cookie policy",
    seoDescription: "Cookie policy — SLEEP TALK",
    updatedAt: new Date("2026-11-09T18:42:28.289Z"),
    body: "> [Placeholder — final cookie wording to be reviewed by the client/legal counsel.]\n\n## Essential cookies\nUsed to keep your bag, session, selected market and cookie preferences. These are required for the store to work.\n\n## Analytics cookies\nOnly set if you accept them in the cookie banner. You can change your choice anytime via \"Cookie preferences\" in the footer.",
  },
  "faq": {
    slug: "faq",
    title: "Frequently asked questions",
    seoTitle: "Frequently asked questions",
    seoDescription: "Frequently asked questions — SLEEP TALK",
    updatedAt: new Date("2026-11-09T18:42:28.289Z"),
    body: "> [Placeholder answers — final wording to be supplied and reviewed by SLEEP TALK.]\n\n## Which countries do you ship to?\nWe sell to the United Kingdom and Canada at launch. Prices are shown in GBP (£) for the UK and CAD ($) for Canada.\n\n## How do I choose my size?\nEvery product page links to our Size Guide. Our pieces are unisex; fit notes on each product describe how it is intended to sit.\n\n## Can I buy tracksuit pieces separately?\nSome tracksuits are available as a complete set and as individual matching pieces. Each product page states clearly whether the price is for the full set or a single piece.\n\n## How do returns work?\nOur returns policy will be published on the Returns page once confirmed.\n\n## Do I need an account to order?\nNo. Guest checkout is available. An account lets you track orders, save addresses and keep a wishlist.\n\n## How can I track my order?\nUse the Track Order page with your order number and email address, or view it in your account.",
  },
  "privacy-policy": {
    slug: "privacy-policy",
    title: "Privacy policy",
    seoTitle: "Privacy policy",
    seoDescription: "Privacy policy — SLEEP TALK",
    updatedAt: new Date("2026-11-09T18:42:28.289Z"),
    body: "> [Placeholder — final privacy notice to be supplied and approved by the client and legal counsel, covering UK GDPR and Canadian (PIPEDA) requirements.]\n\n## What we collect\nOrder, account and contact details you provide, and — only with your consent — analytics cookies.\n\n## How we use it\nTo process orders, provide customer service, and (if you opt in) send marketing emails.\n\n## Your rights\nYou can request access to or deletion of your data. Data retention and deletion processes are to be confirmed.",
  },
  "returns": {
    slug: "returns",
    title: "Returns & refunds",
    seoTitle: "Returns & refunds",
    seoDescription: "Returns & refunds — SLEEP TALK",
    updatedAt: new Date("2026-11-09T18:42:28.289Z"),
    body: "> [Placeholder policy — the returns/exchange policy and return address are to be supplied by the client and legally reviewed.]\n\n## Returns window\nTo be confirmed.\n\n## How to start a return\nTo be confirmed. Please contact us via the Contact page in the meantime.\n\n## Refunds\nRefunds are issued to the original payment method once a return has been received and inspected.",
  },
  "shipping": {
    slug: "shipping",
    title: "Shipping & delivery",
    seoTitle: "Shipping & delivery",
    seoDescription: "Shipping & delivery — SLEEP TALK",
    updatedAt: new Date("2026-11-09T18:42:28.289Z"),
    body: "> [Placeholder policy — shipping carriers, rates, delivery estimates and free-shipping thresholds are pending client confirmation. No delivery times are promised.]\n\n## United Kingdom\nShipping options and rates are shown at checkout. Delivery estimates will be published once carriers are confirmed.\n\n## Canada\nShipping options and rates are shown at checkout. Information on duties and taxes will be published once the fulfilment model is confirmed.",
  },
  "size-guide": {
    slug: "size-guide",
    title: "Size guide",
    seoTitle: "Size guide",
    seoDescription: "Size guide — SLEEP TALK",
    updatedAt: new Date("2026-11-11T05:49:23.492Z"),
    body: "## Standard or oversized?\n\nEvery piece is unisex, and our size chart covers two fits. **Standard fit** is our relaxed everyday cut: take your usual size. **Oversized fit** has a wider body, dropped shoulder and extra length for a roomier streetwear look. Want the oversized length without as much width? Try one size down. Compare both fits for S to XL in the chart above.\n\n## Find your size (body measurements)\n\nBody measurements in inches.\n\n| Size | Chest | Waist | Hips |\n| --- | --- | --- | --- |\n| XS | 31–34 | 26–28 | 32–35 |\n| S (Small) | 34–37 | 28–31 | 35–38 |\n| M (Medium) | 38–41 | 32–35 | 38–41 |\n| L (Large) | 42–45 | 36–39 | 41–44 |\n| XL | 46–49 | 40–43 | 44–47 |\n| XXL | 50–53 | 44–47 | 47–50 |\n\n## How to measure\n- **Chest:** around the fullest part of your chest, under the arms, keeping the tape level.\n- **Waist:** around your natural waistline, just above the belly button.\n- **Hips:** around the widest part of your hips.\n- **Inseam:** from the crotch seam to the bottom of the ankle.\n- **Garment measurements:** lay the item flat without stretching. Widths marked ½ in the chart are measured straight across; double them for the full measurement.\n\nMeasurements can vary by about ½ inch between pieces. Questions about fit? [Contact us](/contact) and we'll help you choose.",
  },
  "terms": {
    slug: "terms",
    title: "Terms & conditions",
    seoTitle: "Terms & conditions",
    seoDescription: "Terms & conditions — SLEEP TALK",
    updatedAt: new Date("2026-11-09T18:42:28.289Z"),
    body: "> [Placeholder — terms and conditions to be supplied and approved by the client and legal counsel.]\n\n## Orders\nOrders are confirmed only after successful payment.\n\n## Pricing\nPrices are shown per market in GBP or CAD.",
  },
};
