"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cartLineKey, type CartLineInput, type CartQuote } from "@/lib/cart-types";
import type { MarketCode } from "@/lib/markets";
import { track } from "@/lib/analytics";

const CART_KEY = "st_cart_v1";
const WISHLIST_KEY = "st_wishlist_v1";
const RECENT_KEY = "st_recent_v1";

type AddedInfo = { title: string; variantLabel: string; image: string | null; price: number };

type StoreContextValue = {
  market: MarketCode;
  isAuthed: boolean;
  // cart
  lines: CartLineInput[];
  count: number;
  hydrated: boolean;
  addToCart: (line: CartLineInput, info?: AddedInfo) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
  discountCode: string | null;
  setDiscountCode: (code: string | null) => void;
  quote: CartQuote | null;
  quoteLoading: boolean;
  refreshQuote: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  lastAdded: AddedInfo | null;
  // wishlist
  wishlist: Set<string>;
  /** true once the wishlist has been read from storage / the account */
  wishlistReady: boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  // recently viewed
  recordView: (productId: string) => void;
  recentIds: () => string[];
  // UI
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode) — cart still works for this page view
  }
}

export function StoreProvider({
  market,
  isAuthed,
  children,
}: {
  market: MarketCode;
  isAuthed: boolean;
  children: React.ReactNode;
}) {
  const [lines, setLines] = useState<CartLineInput[]>([]);
  const [discountCode, setDiscountCodeState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<AddedInfo | null>(null);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [wishlistReady, setWishlistReady] = useState(false);
  const quoteSeq = useRef(0);

  // Hydrate from storage
  useEffect(() => {
    const stored = readJson<{ lines: CartLineInput[]; discountCode: string | null }>(CART_KEY, { lines: [], discountCode: null });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
    setLines(Array.isArray(stored.lines) ? stored.lines : []);
    // Discount codes are switched off: drop any code saved in a shopper's cart from before.
    setDiscountCodeState(null);
    setHydrated(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY && e.newValue) {
        const next = JSON.parse(e.newValue) as { lines: CartLineInput[]; discountCode: string | null };
        setLines(next.lines ?? []);
        setDiscountCodeState(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (hydrated) writeJson(CART_KEY, { lines, discountCode });
  }, [lines, discountCode, hydrated]);

  // Wishlist: server for signed-in users (local items merged on sign-in), local storage for guests
  useEffect(() => {
    const local = readJson<string[]>(WISHLIST_KEY, []);
    if (!isAuthed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration from localStorage
      setWishlist(new Set(local));
      setWishlistReady(true);
      // Keep guest wishlists in sync across tabs
      const onStorage = (e: StorageEvent) => {
        if (e.key === WISHLIST_KEY) setWishlist(new Set(readJson<string[]>(WISHLIST_KEY, [])));
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }
    let cancelled = false;
    (async () => {
      if (local.length) {
        await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: local }),
        }).catch(() => null);
        writeJson(WISHLIST_KEY, []);
      }
      const res = await fetch("/api/wishlist").catch(() => null);
      if (res?.ok && !cancelled) {
        const data = (await res.json()) as { productIds: string[] };
        setWishlist(new Set(data.productIds));
      }
      if (!cancelled) setWishlistReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthed]);

  const refreshQuote = useCallback(async () => {
    const seq = ++quoteSeq.current;
    if (!lines.length) {
      setQuote(null);
      return;
    }
    setQuoteLoading(true);
    try {
      const res = await fetch("/api/cart/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines, discountCode }),
      });
      if (res.ok && seq === quoteSeq.current) setQuote((await res.json()) as CartQuote);
    } finally {
      if (seq === quoteSeq.current) setQuoteLoading(false);
    }
  }, [lines, discountCode]);

  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(refreshQuote, 120);
    return () => window.clearTimeout(t);
  }, [hydrated, refreshQuote, market]);

  const addToCart = useCallback((line: CartLineInput, info?: AddedInfo) => {
    setLines((prev) => {
      const key = cartLineKey(line);
      const existing = prev.find((l) => cartLineKey(l) === key);
      if (existing) {
        return prev.map((l) => (cartLineKey(l) === key ? { ...l, quantity: Math.min(20, l.quantity + line.quantity) } : l));
      }
      return [...prev, line];
    });
    if (info) {
      setLastAdded(info);
      track("add_to_cart", {
        currency: market === "UK" ? "GBP" : "CAD",
        value: (info.price * line.quantity) / 100,
        items: [{ item_id: line.productId, item_name: info.title, item_variant: info.variantLabel, price: info.price / 100, quantity: line.quantity }],
      });
    }
    setCartOpen(true);
  }, [market]);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) =>
      prev.map((l) => (cartLineKey(l) === key ? { ...l, quantity: Math.max(1, Math.min(20, Math.floor(quantity))) } : l)),
    );
  }, []);

  const removeLine = useCallback(
    (key: string) => {
      const line = quote?.lines.find((l) => l.key === key);
      if (line) {
        track("remove_from_cart", {
          currency: quote?.currency,
          value: line.lineTotal / 100,
          items: [{ item_id: line.productId, item_name: line.title, item_variant: line.variantLabel, price: line.unitPrice / 100, quantity: line.quantity }],
        });
      }
      setLines((prev) => prev.filter((l) => cartLineKey(l) !== key));
    },
    [quote],
  );

  const clearCart = useCallback(() => {
    setLines([]);
    setDiscountCodeState(null);
    setQuote(null);
  }, []);

  // Always toggle against the latest set (rapid clicks must not overwrite each other).
  const wishlistRef = useRef(wishlist);
  useEffect(() => {
    wishlistRef.current = wishlist;
  }, [wishlist]);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      const current = wishlistRef.current;
      const has = current.has(productId);
      const next = new Set(current);
      if (has) next.delete(productId);
      else next.add(productId);
      wishlistRef.current = next;
      setWishlist(next);
      if (!isAuthed) {
        writeJson(WISHLIST_KEY, [...next]);
        return;
      }
      const res = await fetch("/api/wishlist", {
        method: has ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [productId] }),
      }).catch(() => null);
      if (!res?.ok) {
        // Roll back just this item on failure
        const rollback = new Set(wishlistRef.current);
        if (has) rollback.add(productId);
        else rollback.delete(productId);
        wishlistRef.current = rollback;
        setWishlist(rollback);
      }
    },
    [isAuthed],
  );

  const recordView = useCallback((productId: string) => {
    const prev = readJson<string[]>(RECENT_KEY, []);
    writeJson(RECENT_KEY, [productId, ...prev.filter((id) => id !== productId)].slice(0, 12));
  }, []);

  const recentIds = useCallback(() => readJson<string[]>(RECENT_KEY, []), []);

  const value = useMemo<StoreContextValue>(
    () => ({
      market,
      isAuthed,
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      hydrated,
      addToCart,
      setQuantity,
      removeLine,
      clearCart,
      discountCode,
      setDiscountCode: setDiscountCodeState,
      quote,
      quoteLoading,
      refreshQuote,
      cartOpen,
      setCartOpen,
      lastAdded,
      wishlist,
      wishlistReady,
      toggleWishlist,
      recordView,
      recentIds,
      searchOpen,
      setSearchOpen,
    }),
    [market, isAuthed, lines, hydrated, addToCart, setQuantity, removeLine, clearCart, discountCode, quote, quoteLoading, refreshQuote, cartOpen, lastAdded, wishlist, wishlistReady, toggleWishlist, recordView, recentIds, searchOpen],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
