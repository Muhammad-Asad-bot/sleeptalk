"use client";

import Link from "next/link";
import { ChevronDown, Truck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setMarketAction } from "@/app/actions/store";
import type { AnnouncementSettings } from "@/content/defaults";
import { MARKETS, type MarketCode } from "@/lib/markets";
import { cn } from "@/lib/utils";

/**
 * Three-part top bar: free-shipping note (derived from the configured shipping thresholds),
 * rotating admin-managed announcement, and the UK / Canada currency switch.
 * Transparent over the homepage hero, solid black elsewhere.
 */
export function AnnouncementBar({
  settings,
  freeShippingText,
  market,
  markets,
}: {
  settings: AnnouncementSettings;
  freeShippingText: string | null;
  market: MarketCode;
  markets: MarketCode[];
}) {
  const isHome = usePathname() === "/";
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const messages = settings.enabled ? settings.messages.filter(Boolean) : [];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % messages.length), 6000);
    return () => window.clearInterval(t);
  }, [messages.length]);

  const text = messages.length ? messages[index % messages.length] : "";

  const choose = (code: MarketCode) => {
    if (code === market) return;
    startTransition(async () => {
      await setMarketAction(code);
      router.refresh();
    });
  };

  return (
    <div className={cn("on-dark relative z-50 border-b text-canvas", isHome ? "border-canvas/15 bg-transparent" : "border-transparent bg-night")}>
      <div className="container-wide grid h-9 grid-cols-1 items-center text-[0.625rem] font-medium uppercase tracking-[0.08em] md:grid-cols-[1fr_auto_1fr] lg:h-12 lg:text-[0.75rem]">
        {/* Left: free shipping */}
        <p className="hidden items-center gap-3 md:flex">
          {freeShippingText ? (
            <>
              <Truck className="size-[18px] shrink-0" strokeWidth={1.5} aria-hidden />
              <span className="truncate pr-4">{freeShippingText}</span>
            </>
          ) : null}
        </p>

        {/* Centre: announcement */}
        <div className="flex items-center justify-center gap-6">
          <span className="hidden h-4 w-px bg-canvas/30 md:block" aria-hidden />
          <p className="truncate text-center xl:min-w-[22rem]" aria-live="polite">
            {settings.link && text ? (
              <Link href={settings.link} className="link-underline">
                {text}
              </Link>
            ) : (
              text
            )}
          </p>
          <span className="hidden h-4 w-px bg-canvas/30 md:block" aria-hidden />
        </div>

        {/* Right: market / currency (plain label when the store sells in one country only) */}
        <div className="hidden items-center justify-end md:flex" role="group" aria-label="Country and currency">
          {markets.length <= 1 ? (
            <span className="uppercase">
              {MARKETS[market].label} <span className="ml-1.5">{MARKETS[market].currencySymbol} {MARKETS[market].currency}</span>
            </span>
          ) : null}
          {markets.length > 1 && markets.map((code, i) => (
            <span key={code} className="flex items-center">
              {i > 0 ? <span className="mx-3 h-3.5 w-px bg-canvas/30" aria-hidden /> : null}
              <button
                type="button"
                onClick={() => choose(code)}
                disabled={pending}
                aria-pressed={code === market}
                aria-label={`${MARKETS[code].label}, ${MARKETS[code].currency}`}
                className={cn(
                  "inline-flex items-center gap-1.5 uppercase transition-opacity",
                  code === market ? "opacity-100" : "opacity-60 hover:opacity-100",
                )}
              >
                {MARKETS[code].shortLabel}
                <span className="ml-1.5">
                  {MARKETS[code].currencySymbol} {MARKETS[code].currency}
                </span>
                <ChevronDown className="size-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
