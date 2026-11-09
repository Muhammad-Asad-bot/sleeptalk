"use client";

/**
 * Consent-aware analytics (GA4 event names). Events are dropped unless the visitor has
 * accepted analytics cookies. GA is only loaded after consent (see ConsentManager).
 */
export type AnalyticsEvent =
  | "view_item"
  | "view_item_list"
  | "search"
  | "select_item"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "add_payment_info"
  | "purchase";

export const CONSENT_COOKIE = "st_consent";

export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_variant?: string;
  item_category?: string;
  price?: number; // major units
  quantity?: number;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function readConsent(): "all" | "essential" | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)st_consent=([^;]+)/);
  const value = match?.[1];
  return value === "all" || value === "essential" ? value : null;
}

export function track(event: AnalyticsEvent, params: Record<string, unknown> = {}) {
  if (readConsent() !== "all") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...params });
  window.gtag?.("event", event, params);
}
