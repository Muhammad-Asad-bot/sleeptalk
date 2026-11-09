"use client";

import { Heart } from "lucide-react";
import { useStore } from "@/components/providers/store-provider";
import { cn } from "@/lib/utils";

/** Signed-in: synced to the account. Guests: kept locally and merged into the account on sign-in. */
export function WishlistButton({ productId, title, className, withLabel = false }: { productId: string; title: string; className?: string; withLabel?: boolean }) {
  const { wishlist, toggleWishlist } = useStore();
  const saved = wishlist.has(productId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggleWishlist(productId);
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from wishlist` : `Save ${title} to wishlist`}
      className={cn("inline-flex items-center justify-center gap-2 transition-colors", className)}
    >
      <Heart className={cn("size-[18px] transition-transform", saved && "scale-110 fill-current")} strokeWidth={1.5} />
      {withLabel ? <span className="text-xs font-semibold uppercase tracking-[0.12em]">{saved ? "Saved" : "Save"}</span> : null}
    </button>
  );
}
