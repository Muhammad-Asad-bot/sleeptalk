"use client";

import Link from "next/link";
import { useStore } from "@/components/providers/store-provider";
import { buttonClass } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { formatMoney } from "@/lib/markets";
import { CartLines } from "./cart-lines";

export function CartDrawer() {
  const { cartOpen, setCartOpen, quote, quoteLoading, lines, market, hydrated } = useStore();
  const freeShip = quote?.shippingOptions.find((o) => o.freeOver != null);
  const merchandise = quote ? quote.subtotal - (quote.discount?.amount ?? 0) : 0;
  const remaining = freeShip?.freeOver != null ? freeShip.freeOver - merchandise : null;

  return (
    <Drawer
      open={cartOpen}
      onClose={() => setCartOpen(false)}
      title={`Your bag${hydrated && lines.length ? ` (${lines.reduce((n, l) => n + l.quantity, 0)})` : ""}`}
      footer={
        lines.length ? (
          <div className="space-y-4 p-5">
            <div className="flex items-baseline justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-semibold tabular-nums">
                {quote ? formatMoney(quote.subtotal, market) : <span className="skeleton inline-block h-4 w-16" />}
              </span>
            </div>
            {quote?.discount && quote.discount.amount > 0 ? (
              <div className="flex items-baseline justify-between text-sm text-success">
                <span>Discount ({quote.discount.code})</span>
                <span className="tabular-nums">−{formatMoney(quote.discount.amount, market)}</span>
              </div>
            ) : null}
            <p className="text-xs text-stone">Shipping and any applicable taxes are shown at checkout.</p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/cart" onClick={() => setCartOpen(false)} className={buttonClass("secondary", "md")}>
                View bag
              </Link>
              <Link
                href="/checkout"
                onClick={() => setCartOpen(false)}
                className={buttonClass("primary", "md")}
                aria-disabled={quote?.hasIssues || undefined}
              >
                Checkout
              </Link>
            </div>
          </div>
        ) : null
      }
    >
      <div className="px-5">
        {remaining != null && quote && quote.lines.length ? (
          <div className="mt-4 bg-paper px-4 py-3 text-xs" aria-live="polite">
            {remaining > 0 ? (
              <>Spend {formatMoney(remaining, market)} more to qualify for free standard delivery.</>
            ) : (
              <>You qualify for free standard delivery.</>
            )}
            <div className="mt-2 h-0.5 bg-line">
              <div className="h-full bg-ink transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, (merchandise / freeShip!.freeOver!) * 100))}%` }} />
            </div>
          </div>
        ) : null}
        {!hydrated || (quoteLoading && !quote && lines.length) ? (
          <div className="space-y-5 py-6" aria-busy>
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="skeleton h-28 w-[88px]" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : lines.length && quote ? (
          <CartLines lines={quote.lines} compact />
        ) : (
          <div className="py-16 text-center">
            <p className="display text-4xl">Your bag is empty</p>
            <p className="mt-3 text-sm text-ash">Nothing here yet. Say it without saying it.</p>
            <Link href="/shop" onClick={() => setCartOpen(false)} className={buttonClass("primary", "md", "mt-8")}>
              Shop all
            </Link>
          </div>
        )}
      </div>
    </Drawer>
  );
}
