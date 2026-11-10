/**
 * Default store settings. Values are stored in the `settings` table and editable in
 * Admin → Store settings / Social links / Content. These defaults are placeholders:
 * no real business details are invented here.
 */

export type StoreSettings = {
  name: string;
  motto: string;
  supportEmail: string;
  phone: string;
  address: string;
  businessHours: string;
  /** Demo mode shows "demo" labels and enables placeholder contact details. */
  demoMode: boolean;
  logoLight: string;
  logoDark: string;
};

export type SocialSettings = {
  instagram: string;
  tiktok: string;
  facebook: string;
  pinterest: string;
  youtube: string;
};

export type AnnouncementSettings = {
  enabled: boolean;
  messages: string[];
  link: string;
  dismissible: boolean;
};

export type SeoSettings = {
  defaultTitle: string;
  titleTemplate: string;
  defaultDescription: string;
  ogImage: string;
};

export type InventorySettings = {
  showLowStock: boolean;
  lowStockMessage: string;
};

/** Shop colour library: quick picks in the product editor. `hex` is "#rrggbb" or "#upper,#lower" (two-tone). */
export type ColourLibrary = { list: { name: string; hex: string }[] };

export type SettingsMap = {
  store: StoreSettings;
  social: SocialSettings;
  announcement: AnnouncementSettings;
  seo: SeoSettings;
  inventory: InventorySettings;
  colours: ColourLibrary;
};

export const DEFAULT_SETTINGS: SettingsMap = {
  store: {
    name: "SLEEP TALK",
    motto: "SAY IT WITHOUT SAYING IT.",
    supportEmail: "sleeptalktoronto@proton.me",
    phone: "+1 (647) 512-6054",
    address: "North York, Canada",
    businessHours: "",
    demoMode: true,
    logoLight: "/brand/wordmark-light.png",
    logoDark: "/brand/wordmark-dark.png",
  },
  social: {
    // Empty links are hidden on the live site.
    instagram: "https://www.instagram.com/sleeptalkofficial",
    tiktok: "https://www.tiktok.com/@sleeptallk1",
    facebook: "https://www.facebook.com/letsflexJuice",
    pinterest: "",
    youtube: "",
  },
  announcement: {
    enabled: true,
    messages: [
      "Say it without saying it.",
      "Preview store — demo products and prices. Orders are not fulfilled.",
    ],
    link: "",
    dismissible: true,
  },
  seo: {
    defaultTitle: "SLEEP TALK — Say it without saying it.",
    titleTemplate: "%s | SLEEP TALK",
    defaultDescription:
      "SLEEP TALK is a unisex streetwear label. Hoodies, tees, shirts, jackets, pants and tracksuits for the UK and Canada.",
    ogImage: "/brand/og-default.jpg",
  },
  inventory: {
    showLowStock: true,
    lowStockMessage: "Only {count} left",
  },
  colours: {
    list: [
      { name: "Black", hex: "#141414" },
      { name: "Cream", hex: "#E8E0D0" },
      { name: "Charcoal", hex: "#404042" },
      { name: "White", hex: "#FFFFFF" },
      { name: "Grey", hex: "#8A8A8A" },
      { name: "Navy", hex: "#1F2A44" },
      { name: "Cream / Black", hex: "#E8E0D0,#141414" },
    ],
  },
};

export const NEWSLETTER_CONSENT_TEXT =
  "I agree to receive SLEEP TALK emails about drops and offers. Unsubscribe anytime. See our Privacy Policy.";
