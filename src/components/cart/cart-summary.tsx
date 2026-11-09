"use client";

import { useState } from "react";
import { useStore } from "@/components/providers/store-provider";
import type { CartQuote } from "@/lib/cart-types";
import { formatMoney } from "@/lib/markets";

export function DiscountForm() {
  const { discountCode, setDiscountCode, quote } = useStore();
  const [code, setCode] = useState("");
  const applied = quote?.discount;
  if (discountCode && applied && !applied.error) {
    return (
      <div className="flex items-center justify-between bg-paper px-3 py-2.5 text-xs">
        <span>
          Code <strong>{applied.code}</strong> applied
        </span>
        <button type="button" className="underline" onClick={() => setDiscountCode(null)}>
          Remove
        </button>
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) setDiscountCode(code.trim().toUpperCase());
      }}
      className="space-y-2"
    >
      <label htmlFor="discount-code" className="text-xs font-medium">Discount code</label>
      <div className="flex">
        <input
          id="discount-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="h-11 w-full border border-r-0 border-line bg-paper px-3 text-sm uppercase focus:border-ink focus:outline-none"
          autoComplete="off"
          aria-invalid={applied?.error ? true : undefined}
          aria-describedby={applied?.error ? "discount-error" : undefined}
        />
        <button type="submit" className="h-11 shrink-0 bg-ink px-4 text-xs font-semibold uppercase tracking-[0.12em] text-canvas">
          Apply
        </button>
      </div>
      {discountCode && applied?.error ? (
        <p id="discount-error" role="alert" className="text-xs text-sale">
          {applied.code}: {applied.error}{" "}
          <button type="button" className="underline" onClick={() => setDiscountCode(null)}>Clear</button>
        </p>
      ) : null}
    </form>
  );
}

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
