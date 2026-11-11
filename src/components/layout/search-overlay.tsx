"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/components/providers/store-provider";
import { SmartImage } from "@/components/ui/smart-image";
import { formatMoney } from "@/lib/markets";

type Suggestion = { id: string; slug: string; title: string; price: number; image: string | null; category: string | null };

const POPULAR = ["Hoodie", "Tracksuit", "Graphic tee", "Cargo", "Varsity"];

export function SearchOverlay() {
  const { searchOpen, setSearchOpen, market } = useStore();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!searchOpen) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSearchOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [searchOpen, setSearchOpen]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale suggestions
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        const data = (await res.json()) as { results: Suggestion[] };
        setResults(data.results);
      } catch {
        // aborted
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(t);
    };
  }, [q]);

  const submit = (term: string) => {
    if (!term.trim()) return;
    setSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(term.trim())}`);
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {searchOpen ? (
        <motion.div
          className="fixed inset-0 z-[70] bg-canvas"
          role="dialog"
          aria-modal="true"
          aria-label="Search products"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="container-site pt-6 md:pt-10">
            <div className="flex items-center justify-between">
              <p className="label text-stone">Search</p>
              <button type="button" onClick={() => setSearchOpen(false)} className="grid size-10 place-items-center hover:bg-ink/5" aria-label="Close search">
                <X className="size-5" />
              </button>
            </div>
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                submit(q);
              }}
              className="mt-6 flex items-center gap-3 border-b-2 border-ink pb-3"
            >
              <Search className="size-6 shrink-0" strokeWidth={1.5} aria-hidden />
              <label htmlFor="site-search" className="sr-only">Search products</label>
              <input
                ref={inputRef}
                id="site-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search hoodies, tracksuits, SKUs…"
                autoComplete="off"
                className="display w-full bg-transparent text-4xl placeholder:text-stone/50 focus:outline-none md:text-6xl"
                aria-controls="search-suggestions"
              />
            </form>

            <div id="search-suggestions" className="mt-8 grid gap-10 md:grid-cols-12" aria-live="polite">
              <div className="md:col-span-3">
                <p className="label mb-4 text-stone">Popular</p>
                <ul className="flex flex-wrap gap-2 md:block md:space-y-2">
                  {POPULAR.map((term) => (
                    <li key={term}>
                      <button type="button" className="link-underline text-sm" onClick={() => submit(term)}>
                        {term}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="md:col-span-9">
                {q.trim().length >= 2 ? (
                  <>
                    <p className="label mb-4 text-stone">{loading ? "Searching…" : results.length ? "Products" : "No matches"}</p>
                    {results.length ? (
                      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        {results.map((r) => (
                          <li key={r.id}>
                            <Link href={`/products/${r.slug}`} onClick={() => setSearchOpen(false)} className="group block">
                              <div className="relative aspect-[4/5] overflow-hidden bg-product">
                                <SmartImage src={r.image} alt="" fill sizes="(min-width:1024px) 14vw, 45vw" className="object-contain object-center block" showDemoTag={false} />
                              </div>
                              <p className="mt-2 text-xs font-medium leading-snug group-hover:underline">{r.title}</p>
                              <p className="text-xs text-stone">{formatMoney(r.price, market)}</p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : !loading ? (
                      <p className="text-sm text-ash">Try a different word, a category like &ldquo;jackets&rdquo;, or browse <Link className="underline" href="/shop" onClick={() => setSearchOpen(false)}>all products</Link>.</p>
                    ) : null}
                    {results.length ? (
                      <button type="button" onClick={() => submit(q)} className="label mt-6 underline underline-offset-4">
                        See all results for &ldquo;{q.trim()}&rdquo;
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
