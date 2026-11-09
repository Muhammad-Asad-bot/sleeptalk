"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

export function SearchTracker({ term }: { term: string }) {
  useEffect(() => {
    if (term) track("search", { search_term: term });
  }, [term]);
  return null;
}
