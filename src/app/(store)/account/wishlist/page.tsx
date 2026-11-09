import type { Metadata } from "next";
import { WishlistView } from "@/components/account/wishlist-view";
import { getCurrentUser } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

/** Open to guests (browser-saved wishlist) as well as signed-in customers (account wishlist). */
export default async function WishlistPage() {
  const user = await getCurrentUser();
  return <WishlistView signedIn={!!user} />;
}
