"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/providers/store-provider";
import type { ProductCardData } from "@/lib/server/catalog";
import { ProductCard } from "./product-card";

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const { recentIds, market } = useStore();
  const [cards, setCards] = useState<ProductCardData[]>([]);

  useEffect(() => {
    const ids = recentIds().filter((id) => id !== excludeId).slice(0, 4);
    if (!ids.length) return;
    fetch(`/api/products/cards?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((d: { cards: ProductCardData[] }) => setCards(d.cards))
      .catch(() => null);
  }, [excludeId, recentIds, market]);

  if (!cards.length) return null;
  return (
    <section className="container-site py-12" aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="display mb-8 text-3xl md:text-4xl">Recently viewed</h2>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-5">
        {cards.map((c, i) => (
          <li key={c.id}>
            <ProductCard product={c} listName="Recently viewed" index={i} />
          </li>
        ))}
      </ul>
    </section>
  );
}
