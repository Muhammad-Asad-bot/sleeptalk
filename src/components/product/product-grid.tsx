"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import type { ProductCardData } from "@/lib/server/catalog";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";

export function ProductGrid({
  products,
  listName,
  columns = 4,
  priorityCount = 4,
  className,
}: {
  products: ProductCardData[];
  listName: string;
  columns?: 3 | 4;
  priorityCount?: number;
  className?: string;
}) {
  const ids = products.map((p) => p.id).join(",");
  useEffect(() => {
    if (!products.length) return;
    track("view_item_list", {
      item_list_name: listName,
      items: products.slice(0, 20).map((p, i) => ({ item_id: p.id, item_name: p.title, index: i, price: p.price / 100 })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per distinct list
  }, [ids, listName]);

  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5",
        columns === 4 ? "md:grid-cols-3 xl:grid-cols-4" : "md:grid-cols-3",
        className,
      )}
    >
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < priorityCount} listName={listName} index={i} />
        </li>
      ))}
    </ul>
  );
}
