"use client";

import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { setMarketAction } from "@/app/actions/store";
import { MARKETS, type MarketCode } from "@/lib/markets";
import { cn } from "@/lib/utils";

export function MarketSelector({
  market,
  available,
  variant = "header",
}: {
  market: MarketCode;
  available: MarketCode[];
  variant?: "header" | "footer" | "drawer";
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = MARKETS[market];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Selling in one country only: nothing to choose.
  const single = available.length <= 1;

  const choose = (code: MarketCode) => {
    setOpen(false);
    if (code === market) return;
    startTransition(async () => {
      await setMarketAction(code);
      router.refresh();
    });
  };

  if (single) return null;

  if (variant === "drawer" || variant === "footer") {
    return (
      <fieldset className={cn(variant === "footer" && "text-canvas")}>
        <legend className="label mb-3 opacity-70">Country / currency</legend>
        <div className="flex gap-2">
          {available.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => choose(code)}
              aria-pressed={code === market}
              disabled={pending}
              className={cn(
                "h-10 border px-4 text-xs font-medium transition-colors",
                variant === "footer"
                  ? code === market
                    ? "border-canvas bg-canvas text-ink"
                    : "border-canvas/30 hover:border-canvas"
                  : code === market
                    ? "border-ink bg-ink text-canvas"
                    : "border-line hover:border-ink",
              )}
            >
              {MARKETS[code].label} · {MARKETS[code].currency} {MARKETS[code].currencySymbol}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Country and currency: ${current.label}, ${current.currency}. Change`}
        className="flex h-10 items-center gap-1 px-2 text-[0.6875rem] font-semibold tracking-[0.1em] hover:bg-ink/5"
        disabled={pending}
      >
        {current.shortLabel} <span className="text-stone">·</span> {current.currencySymbol} {current.currency}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <ul
          id={listId}
          className="absolute right-0 top-full z-50 mt-1 w-60 border border-line bg-paper py-1 shadow-xl animate-fade-in"
        >
          {available.map((code) => (
            <li key={code}>
              <button
                type="button"
                onClick={() => choose(code)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-canvas"
                aria-current={code === market ? "true" : undefined}
              >
                <span>
                  {MARKETS[code].label}
                  <span className="ml-2 text-stone">
                    {MARKETS[code].currency} {MARKETS[code].currencySymbol}
                  </span>
                </span>
                {code === market ? <Check className="size-4" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
