import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/*
 * SLEEP TALK data model (PostgreSQL dialect; runs on PGlite in local dev).
 * Money is stored as integer minor units (pence / cents) per market.
 * Rows created by the seed script carry isDemo = true so they are clearly labelled in admin.
 */

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const marketCodeEnum = pgEnum("market_code", ["UK", "CA"]);
export const roleEnum = pgEnum("role", ["customer", "staff", "owner"]);
export const productStatusEnum = pgEnum("product_status", ["draft", "active", "archived"]);
export const productTypeEnum = pgEnum("product_type", ["standard", "set"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "payment_failed",
  "cancelled",
  "refunded",
]);
export const fulfillmentStatusEnum = pgEnum("fulfillment_status", [
  "unfulfilled",
  "processing",
  "shipped",
  "delivered",
  "returned",
]);
export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected", "hidden"]);
export const discountTypeEnum = pgEnum("discount_type", ["percentage", "fixed"]);
export const discountScopeEnum = pgEnum("discount_scope", ["all", "categories", "collections", "products"]);
export const collectionModeEnum = pgEnum("collection_mode", ["manual", "rule"]);

export type MarketCode = (typeof marketCodeEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];

/* ───────────────────────── Accounts ───────────────────────── */

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  role: roleEnum("role").notNull().default("customer"),
  disabled: boolean("disabled").notNull().default(false),
  marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // SHA-256 hash of the session token (raw token only lives in the cookie)
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export type AddressFields = {
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  city: string;
  region: string; // UK county (optional) / Canadian province
  postcode: string;
  country: "GB" | "CA";
  phone?: string;
};

export const addresses = pgTable("addresses", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2").notNull().default(""),
  city: text("city").notNull(),
  region: text("region").notNull().default(""),
  postcode: text("postcode").notNull(),
  country: text("country").$type<"GB" | "CA">().notNull(),
  phone: text("phone").notNull().default(""),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: createdAt(),
});

/* ───────────────────────── Catalogue ───────────────────────── */

export const categories = pgTable("categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  image: text("image").notNull().default(""),
  parentId: text("parent_id"),
  position: integer("position").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  seoTitle: text("seo_title").notNull().default(""),
  seoDescription: text("seo_description").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const products = pgTable(
  "products",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    fitNotes: text("fit_notes").notNull().default(""),
    fabric: text("fabric").notNull().default(""),
    care: text("care").notNull().default(""),
    modelInfo: text("model_info").notNull().default(""),
    measurements: text("measurements").notNull().default(""),
    type: productTypeEnum("type").notNull().default("standard"),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    tags: text("tags").array().notNull().default([]),
    status: productStatusEnum("status").notNull().default("draft"),
    /** false = not shown in listings/search (e.g. a tracksuit piece only sold as part of a set) */
    isListed: boolean("is_listed").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    isNewArrival: boolean("is_new_arrival").notNull().default(false),
    salesCount: integer("sales_count").notNull().default(0),
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
    isDemo: boolean("is_demo").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("products_category_idx").on(t.categoryId), index("products_status_idx").on(t.status)],
);

/** Per-market retail price. Absence of a row (or available=false) means not sold in that market. */
export const productPrices = pgTable(
  "product_prices",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    market: marketCodeEnum("market").notNull(),
    amount: integer("amount").notNull(),
    compareAt: integer("compare_at"),
    available: boolean("available").notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.productId, t.market] })],
);

export const productImages = pgTable(
  "product_images",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt").notNull().default(""),
    color: text("color"),
    position: integer("position").notNull().default(0),
    isDemo: boolean("is_demo").notNull().default(false),
    sourceNote: text("source_note").notNull().default(""),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const variants = pgTable(
  "variants",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    color: text("color").notNull(),
    colorHex: text("color_hex").notNull().default("#111111"),
    size: text("size").notNull(),
    stock: integer("stock").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(3),
    /** Oversell setting: allow orders when stock reaches zero */
    allowBackorder: boolean("allow_backorder").notNull().default(false),
    position: integer("position").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("variants_product_idx").on(t.productId)],
);

/**
 * Tracksuit set composition. A set product (type = "set") has no stock of its own:
 * purchasing one deducts one unit from the chosen variant of each component product.
 */
export const setComponents = pgTable(
  "set_components",
  {
    setProductId: text("set_product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    componentProductId: text("component_product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    label: text("label").notNull(), // e.g. "Top", "Bottom"
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.setProductId, t.componentProductId] })],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: id(),
    variantId: text("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    stockAfter: integer("stock_after"),
    reason: text("reason")
      .$type<"initial" | "adjustment" | "restock" | "order" | "order_released" | "order_reinstated">()
      .notNull(),
    note: text("note").notNull().default(""),
    orderId: text("order_id"),
    userId: text("user_id"),
    createdAt: createdAt(),
  },
  (t) => [index("stock_movements_variant_idx").on(t.variantId)],
);

export const slugRedirects = pgTable("slug_redirects", {
  fromSlug: text("from_slug").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
});

export type CollectionRules = {
  categoryIds?: string[];
  tags?: string[];
  newArrivals?: boolean;
  onSale?: boolean;
  featured?: boolean;
};

export const collections = pgTable("collections", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  image: text("image").notNull().default(""),
  mode: collectionModeEnum("mode").notNull().default("manual"),
  rules: jsonb("rules").$type<CollectionRules>().notNull().default({}),
  visible: boolean("visible").notNull().default(true),
  publishAt: timestamp("publish_at", { withTimezone: true }),
  unpublishAt: timestamp("unpublish_at", { withTimezone: true }),
  position: integer("position").notNull().default(0),
  seoTitle: text("seo_title").notNull().default(""),
  seoDescription: text("seo_description").notNull().default(""),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const collectionProducts = pgTable(
  "collection_products",
  {
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.productId] })],
);

/* ───────────────────────── Orders ───────────────────────── */

export type ShippingMethodSnapshot = { id: string; name: string; price: number; description: string };
export type OrderComponentSnapshot = { variantId: string; productId: string; label: string; title: string; sku: string; size: string; color: string };

export const orders = pgTable(
  "orders",
  {
    id: id(),
    number: text("number").notNull().unique(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    phone: text("phone").notNull().default(""),
    market: marketCodeEnum("market").notNull(),
    currency: text("currency").notNull(),
    status: orderStatusEnum("status").notNull().default("pending_payment"),
    fulfillmentStatus: fulfillmentStatusEnum("fulfillment_status").notNull().default("unfulfilled"),
    subtotal: integer("subtotal").notNull(),
    discountTotal: integer("discount_total").notNull().default(0),
    shippingTotal: integer("shipping_total").notNull().default(0),
    taxTotal: integer("tax_total").notNull().default(0),
    total: integer("total").notNull(),
    discountCode: text("discount_code"),
    discountId: text("discount_id"),
    shippingAddress: jsonb("shipping_address").$type<AddressFields>().notNull(),
    billingAddress: jsonb("billing_address").$type<AddressFields>().notNull(),
    shippingMethod: jsonb("shipping_method").$type<ShippingMethodSnapshot>().notNull(),
    /** Client-generated idempotency key for a checkout attempt: prevents duplicate orders on resubmit */
    checkoutToken: text("checkout_token").notNull().unique(),
    /** Secret used to view confirmation/failure pages for guest orders */
    accessToken: text("access_token").notNull(),
    paymentProvider: text("payment_provider").notNull(),
    paymentRef: text("payment_ref"),
    /** Set when a Canadian bank debit (pre-authorized debit) was submitted and is waiting to clear (3–5 business days). */
    bankDebitSubmittedAt: timestamp("bank_debit_submitted_at", { withTimezone: true }),
    stockReleased: boolean("stock_released").notNull().default(false),
    trackingNumber: text("tracking_number").notNull().default(""),
    carrier: text("carrier").notNull().default(""),
    internalNotes: text("internal_notes").notNull().default(""),
    isTest: boolean("is_test").notNull().default(false),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("orders_user_idx").on(t.userId), index("orders_email_idx").on(t.email)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id"),
    variantId: text("variant_id"),
    title: text("title").notNull(),
    variantLabel: text("variant_label").notNull().default(""),
    sku: text("sku").notNull().default(""),
    image: text("image").notNull().default(""),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotal: integer("line_total").notNull(),
    components: jsonb("components").$type<OrderComponentSnapshot[]>().notNull().default([]),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/* ───────────────────────── Engagement ───────────────────────── */

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
);

export const reviews = pgTable(
  "reviews",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull(),
    rating: integer("rating").notNull(),
    title: text("title").notNull().default(""),
    body: text("body").notNull(),
    status: reviewStatusEnum("status").notNull().default("pending"),
    verifiedPurchase: boolean("verified_purchase").notNull().default(false),
    reported: boolean("reported").notNull().default(false),
    adminNote: text("admin_note").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("reviews_product_idx").on(t.productId)],
);

export type MarketAmounts = Partial<Record<MarketCode, number>>;

export const discounts = pgTable("discounts", {
  id: id(),
  code: text("code").notNull().unique(),
  description: text("description").notNull().default(""),
  type: discountTypeEnum("type").notNull(),
  percentOff: integer("percent_off"),
  amountOff: jsonb("amount_off").$type<MarketAmounts>().notNull().default({}),
  minSpend: jsonb("min_spend").$type<MarketAmounts>().notNull().default({}),
  markets: text("markets").array().$type<MarketCode[]>().notNull().default([]),
  scope: discountScopeEnum("scope").notNull().default("all"),
  targetIds: text("target_ids").array().notNull().default([]),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: id(),
  email: text("email").notNull().unique(),
  market: marketCodeEnum("market"),
  consentText: text("consent_text").notNull(),
  consentAt: timestamp("consent_at", { withTimezone: true }).notNull().defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  unsubscribeToken: text("unsubscribe_token").notNull().unique(),
});

export const contactMessages = pgTable("contact_messages", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull().default(""),
  orderNumber: text("order_number").notNull().default(""),
  message: text("message").notNull(),
  handled: boolean("handled").notNull().default(false),
  createdAt: createdAt(),
});

/* ───────────────────────── Content & settings ───────────────────────── */

export const pages = pgTable("pages", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  seoTitle: text("seo_title").notNull().default(""),
  seoDescription: text("seo_description").notNull().default(""),
  isPlaceholder: boolean("is_placeholder").notNull().default(true),
  updatedAt: updatedAt(),
});

export const homeSectionTypes = [
  "hero",
  "categories",
  "new_arrivals",
  "best_sellers",
  "featured_collection",
  "brand_story",
  "editorial",
  "social_gallery",
  "newsletter",
] as const;
export type HomeSectionType = (typeof homeSectionTypes)[number];

export const homeSections = pgTable("home_sections", {
  id: id(),
  type: text("type").$type<HomeSectionType>().notNull(),
  position: integer("position").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: updatedAt(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedAt: updatedAt(),
});

export const markets = pgTable("markets", {
  code: marketCodeEnum("code").primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").notNull(),
  locale: text("locale").notNull(),
  active: boolean("active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  taxNote: text("tax_note").notNull().default(""),
  shippingSummary: text("shipping_summary").notNull().default(""),
  returnsSummary: text("returns_summary").notNull().default(""),
});

export const shippingRates = pgTable("shipping_rates", {
  id: id(),
  market: marketCodeEnum("market").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  price: integer("price").notNull(),
  /** Free shipping when (subtotal - discount) >= freeOver. Null = never free. */
  freeOver: integer("free_over"),
  /** Delivery estimate in business days. Leave null until carrier arrangements are confirmed. */
  minDays: integer("min_days"),
  maxDays: integer("max_days"),
  active: boolean("active").notNull().default(true),
  position: integer("position").notNull().default(0),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    userId: text("user_id"),
    userEmail: text("user_email").notNull().default(""),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull().default(""),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt)],
);

/* ───────────────────────── Relations ───────────────────────── */

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
  wishlist: many(wishlistItems),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  prices: many(productPrices),
  images: many(productImages),
  variants: many(variants),
  components: many(setComponents, { relationName: "set" }),
  partOfSets: many(setComponents, { relationName: "component" }),
  reviews: many(reviews),
}));

export const productPricesRelations = relations(productPrices, ({ one }) => ({
  product: one(products, { fields: [productPrices.productId], references: [products.id] }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const variantsRelations = relations(variants, ({ one, many }) => ({
  product: one(products, { fields: [variants.productId], references: [products.id] }),
  movements: many(stockMovements),
}));

export const setComponentsRelations = relations(setComponents, ({ one }) => ({
  set: one(products, { fields: [setComponents.setProductId], references: [products.id], relationName: "set" }),
  component: one(products, {
    fields: [setComponents.componentProductId],
    references: [products.id],
    relationName: "component",
  }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  variant: one(variants, { fields: [stockMovements.variantId], references: [variants.id] }),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  products: many(collectionProducts),
}));

export const collectionProductsRelations = relations(collectionProducts, ({ one }) => ({
  collection: one(collections, { fields: [collectionProducts.collectionId], references: [collections.id] }),
  product: one(products, { fields: [collectionProducts.productId], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, { fields: [wishlistItems.userId], references: [users.id] }),
  product: one(products, { fields: [wishlistItems.productId], references: [products.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));
