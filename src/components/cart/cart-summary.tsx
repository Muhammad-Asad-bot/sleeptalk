"use client";

import type { CartQuote } from "@/lib/cart-types";
import { formatMoney } from "@/lib/markets";

export function TotalsTable({ quote, showShipping }: { quote: CartQuote; showShipping: boolean }) {
  const m = quote.market;
  return (
    <dl className="space-y-2.5 text-sm">
      <div className="flex justify-between">
        <dt>Subtotal</dt>
        <dd className="tabular-nums">{formatMoney(quote.subtotal, m)}</dd>
      </div>
      {quote.discount && quote.discount.amount > 0 ? (
        <div className="flex justify-between text-success">
          <dt>Discount ({quote.discount.code})</dt>
          <dd className="tabular-nums">−{formatMoney(quote.discount.amount, m)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between">
        <dt>Shipping</dt>
        <dd className="tabular-nums">
          {showShipping && quote.shippingTotal != null ? (quote.shippingTotal === 0 ? "Free" : formatMoney(quote.shippingTotal, m)) : <span className="text-stone">Calculated at checkout</span>}
        </dd>
      </div>
      <div className="flex justify-between text-xs text-stone">
        <dt>Taxes & duties</dt>
        <dd className="max-w-[60%] text-right">{quote.taxNote}</dd>
      </div>
      <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">
          {formatMoney(showShipping ? quote.total : quote.subtotal - (quote.discount?.amount ?? 0), m)}
          <span className="ml-1 text-xs font-normal text-stone">{quote.currency}</span>
        </dd>
      </div>
    </dl>
  );
}
