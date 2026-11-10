"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/components/providers/store-provider";
import { track } from "@/lib/analytics";

/** Runs once per paid order: clears the bag, ends the checkout attempt, sends the purchase event. */
export function PaidOrderEffects({ orderNumber, currency, value, items }: { orderNumber: string; currency: string; value: number; items: { id: string; name: string; variant: string; price: number; quantity: number }[] }) {
  const { clearCart } = useStore();
  useEffect(() => {
    const key = `st_purchase_${orderNumber}`;
    try {
      sessionStorage.removeItem("st_checkout_token");
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    clearCart();
    track("purchase", {
      transaction_id: orderNumber,
      currency,
      value,
      items: items.map((i) => ({ item_id: i.id, item_name: i.name, item_variant: i.variant, price: i.price, quantity: i.quantity })),
    });
  }, [orderNumber, currency, value, items, clearCart]);
  return null;
}

/** Bank payment submitted (not yet cleared): the bag is done with and this checkout attempt is over. */
export function SubmittedOrderEffects() {
  const { clearCart } = useStore();
  useEffect(() => {
    try {
      sessionStorage.removeItem("st_checkout_token");
    } catch {}
    clearCart();
  }, [clearCart]);
  return null;
}

/** Pending payment: poll by refreshing the server component until the provider confirms. */
export function PendingRefresher() {
  const router = useRouter();
  useEffect(() => {
    let count = 0;
    const t = window.setInterval(() => {
      count += 1;
      if (count > 20) window.clearInterval(t);
      router.refresh();
    }, 3000);
    return () => window.clearInterval(t);
  }, [router]);
  return null;
}

/** A failed attempt ends that checkout token so the next attempt creates a fresh order. */
export function ResetCheckoutToken() {
  useEffect(() => {
    try {
      sessionStorage.removeItem("st_checkout_token");
    } catch {}
  }, []);
  return null;
}
