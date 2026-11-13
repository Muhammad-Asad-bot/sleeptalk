"use client";

import dynamic from "next/dynamic";
import { useStore } from "@/components/providers/store-provider";

const CartDrawer = dynamic(() => import("@/components/cart/cart-drawer").then((module) => module.CartDrawer), { ssr: false });
const SearchOverlay = dynamic(() => import("@/components/layout/search-overlay").then((module) => module.SearchOverlay), { ssr: false });

export function StoreOverlays() {
  const { cartOpen, searchOpen } = useStore();
  return (
    <>
      {cartOpen ? <CartDrawer /> : null}
      {searchOpen ? <SearchOverlay /> : null}
    </>
  );
}
