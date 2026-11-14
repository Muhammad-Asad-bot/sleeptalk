"use client";

import Link from "next/link";
import { useStore } from "@/components/providers/store-provider";
import { buttonClass } from "@/components/ui/button";
import { CartLines } from "./cart-lines";
import { TotalsTable } from "./cart-summary";

export function CartPageView() {
  const { lines, quote, hydrated, quoteLoading } = useStore();
  const loading = !hydrated || (lines.length > 0 && !quote);
  return (
    <div className="container-site pt-8 md:pt-12">
      <h1 className="display text-5xl md:text-7xl">Your bag</h1>
      {loading ? (
        <div className="mt-10 grid gap-10 lg:grid-cols-12" aria-busy>
          <div className="space-y-6 lg:col-span-8">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="skeleton h-36 w-28" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/2" />
                  <div className="skeleton h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
          <div className="skeleton h-64 lg:col-span-4" />
        </div>
      ) : !lines.length || !quote ? (
        <div className="mt-10 border border-dashed border-line px-6 py-20 text-center">
          <p className="display text-3xl">Your bag is empty</p>
          <p className="mt-3 text-sm text-ash">Find something to say without saying it.</p>
          <Link href="/shop" className={buttonClass("primary", "lg", "mt-8")}>Shop all</Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="sr-only" aria-live="polite">{quoteLoading ? "Updating bag" : ""}</p>
            <div className="border-y border-line">
              <CartLines lines={quote.lines} />
            </div>
            <Link href="/shop" className="mt-6 inline-block text-xs underline underline-offset-4">Continue shopping</Link>
          </div>
          <aside className="lg:col-span-4">
            <div className="space-y-6 bg-paper p-6 lg:sticky lg:top-24">
              <h2 className="label">Order summary</h2>
              <TotalsTable quote={quote} showShipping={false} />
              {quote.hasIssues ? (
                <p role="alert" className="text-xs text-sale">Please resolve the highlighted items before checking out.</p>
              ) : null}
              <Link
                href={quote.hasIssues ? "#" : "/checkout"}
                aria-disabled={quote.hasIssues || undefined}
                className={buttonClass("primary", "lg", `w-full ${quote.hasIssues ? "pointer-events-none opacity-45" : ""}`)}
              >
                Checkout
              </Link>
              <p className="text-center text-xs text-stone">Secure payment via our payment provider. We never store card details.</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
