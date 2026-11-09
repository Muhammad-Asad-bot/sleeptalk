"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/components/providers/store-provider";
import { ProductCard } from "@/components/product/product-card";
import { buttonClass } from "@/components/ui/button";
import type { ProductCardData } from "@/lib/server/catalog";

/**
 * Wishlist page. Works for guests (saved in this browser) and signed-in customers (saved to
 * the account; guest items are merged in on sign-in). Removing = tapping the heart on a card;
 * adding to the bag = Quick add (size/colour choice is required).
 */
export function WishlistView({ signedIn }: { signedIn: boolean }) {
  const { wishlist, wishlistReady, market } = useStore();
  const [cards, setCards] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedKey = useRef<string | null>(null);

  const ids = useMemo(() => [...wishlist], [wishlist]);

  useEffect(() => {
    if (!wishlistReady) return;
    // Only fetch when items are added (or market changes); removals just filter locally.
    const missing = ids.filter((id) => !cards.some((c) => c.id === id));
    const key = `${market}:${ids.join(",")}`;
    if (!missing.length || fetchedKey.current === key) {
      setLoading(false);
      return;
    }
    fetchedKey.current = key;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/products/cards?ids=${encodeURIComponent(ids.join(","))}`)
      .then((r) => r.json())
      .then((d: { cards: ProductCardData[] }) => {
        if (!cancelled) setCards(d.cards);
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ids, wishlistReady, market, cards]);

  const visible = cards.filter((c) => wishlist.has(c.id));
  const unavailable = wishlistReady && !loading ? ids.length - visible.length : 0;

  return (
    <div className="container-wide pt-8 md:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-4">
        <div>
          <p className="mb-2 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-stone">Saved for later</p>
          <h1 className="hero-title text-4xl md:text-6xl">Wishlist</h1>
        </div>
        {wishlistReady && visible.length ? (
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ash" aria-live="polite">
            {visible.length} {visible.length === 1 ? "item" : "items"}
          </p>
        ) : null}
      </div>

      {!signedIn ? (
        <div className="mt-6 flex flex-col gap-3 bg-paper px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-charcoal">Your wishlist is saved in this browser. Sign in to keep it on every device.</p>
          <div className="flex shrink-0 gap-4 text-xs font-semibold uppercase tracking-[0.08em]">
            <Link href="/login?next=/account/wishlist" className="link-underline">Sign in</Link>
            <Link href="/register?next=/account/wishlist" className="link-underline">Create account</Link>
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        {!wishlistReady || (loading && !visible.length && ids.length) ? (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5 xl:grid-cols-4" aria-busy>
            {Array.from({ length: Math.min(4, Math.max(ids.length, 2)) }).map((_, i) => (
              <li key={i}>
                <div className="skeleton aspect-[4/5]" />
                <div className="skeleton mt-3 h-4 w-2/3" />
                <div className="skeleton mt-2 h-3 w-1/4" />
              </li>
            ))}
          </ul>
        ) : visible.length ? (
          <>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5 xl:grid-cols-4">
              {visible.map((p, i) => (
                <li key={p.id}>
                  <ProductCard product={p} listName="Wishlist" index={i} />
                </li>
              ))}
            </ul>
            <p className="mt-10 text-xs text-stone">
              Tap the heart to remove an item. Use <strong className="font-semibold text-ash">+ Quick add</strong> to choose a size and add it to your bag.
            </p>
            {unavailable > 0 ? (
              <p className="mt-2 text-xs text-stone">
                {unavailable} saved {unavailable === 1 ? "item is" : "items are"} not currently available in your selected country.
              </p>
            ) : null}
          </>
        ) : (
          <div className="border border-dashed border-line px-6 py-20 text-center">
            <Heart className="mx-auto size-8 text-stone" strokeWidth={1.25} aria-hidden />
            <p className="hero-title mt-5 text-3xl">Nothing saved yet</p>
            <p className="mx-auto mt-3 max-w-sm text-sm text-ash">Tap the heart on any piece to save it here for later.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/new-arrivals" className={buttonClass("primary", "lg")}>New arrivals</Link>
              <Link href="/shop" className={buttonClass("secondary", "lg")}>Shop all</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
