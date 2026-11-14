"use client";

import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { placeOrderAction } from "@/app/actions/checkout";
import { useStore } from "@/components/providers/store-provider";
import { TotalsTable } from "@/components/cart/cart-summary";
import { buttonClass } from "@/components/ui/button";
import { FormMessage, TextInput } from "@/components/ui/fields";
import { SmartImage } from "@/components/ui/smart-image";
import { track } from "@/lib/analytics";
import type { CartQuote } from "@/lib/cart-types";
import { formatMoney } from "@/lib/markets";
import { addressSchema, emailSchema } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { AddressFields, emptyAddress, type AddressValue } from "./address-fields";

const TOKEN_KEY = "st_checkout_token";
type Step = 1 | 2 | 3 | 4 | 5;
const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Contact" },
  { n: 2, label: "Shipping address" },
  { n: 3, label: "Delivery" },
  { n: 4, label: "Billing" },
  { n: 5, label: "Payment & review" },
];

function newToken() {
  const t = crypto.randomUUID();
  try {
    sessionStorage.setItem(TOKEN_KEY, t);
  } catch {}
  return t;
}

function zodErrors(prefix: string, error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Record<string, string> = {};
  for (const i of error.issues) out[`${prefix}.${i.path.map(String).join(".")}`] ??= i.message;
  return out;
}

function StepShell({
  n,
  step,
  onEdit,
  children,
  summary,
}: {
  n: Step;
  step: Step;
  onEdit: (n: Step) => void;
  children: React.ReactNode;
  summary: React.ReactNode;
}) {
  return (
    <section className="border-b border-line py-6" aria-labelledby={`step-${n}`}>
      <div className="flex items-center justify-between">
        <h2 id={`step-${n}`} className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.12em]">
          <span className={cn("grid size-7 place-items-center rounded-full border text-xs", step > n ? "border-ink bg-ink text-canvas" : step === n ? "border-ink" : "border-line text-stone")}>
            {step > n ? <Check className="size-3.5" /> : n}
          </span>
          {STEPS[n - 1].label}
        </h2>
        {step > n ? (
          <button type="button" onClick={() => onEdit(n)} className="text-xs underline underline-offset-4">
            Edit
          </button>
        ) : null}
      </div>
      {step === n ? <div className="mt-6">{children}</div> : step > n ? <div className="mt-3 pl-10 text-sm text-ash">{summary}</div> : null}
    </section>
  );
}

type SavedAddress = AddressValue & { id: string; isDefault: boolean };

export function CheckoutView({
  country,
  countryLabel,
  user,
  savedAddresses,
  testMode,
}: {
  country: "GB" | "CA";
  countryLabel: string;
  user: { email: string; firstName: string; lastName: string } | null;
  savedAddresses: SavedAddress[];
  testMode: boolean;
}) {
  const { lines, discountCode, hydrated, market } = useStore();
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [shipping, setShipping] = useState<AddressValue>(() => emptyAddress(country));
  const [billingSame, setBillingSame] = useState(true);
  const [billing, setBilling] = useState<AddressValue>(emptyAddress(country));
  const [shippingRateId, setShippingRateId] = useState<string | null>(null);
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let t: string | null = null;
    try {
      t = sessionStorage.getItem(TOKEN_KEY);
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore idempotency token for this checkout attempt
    setToken(t ?? newToken());
  }, []);

  const fetchQuote = useCallback(async () => {
    if (!lines.length) return;
    const res = await fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines, discountCode, shippingRateId }),
    });
    if (res.ok) {
      const q = (await res.json()) as CartQuote;
      setQuote(q);
      if (!shippingRateId && q.selectedShippingId) setShippingRateId(q.selectedShippingId);
    }
  }, [lines, discountCode, shippingRateId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch the server quote once the bag is hydrated
    if (hydrated) void fetchQuote();
  }, [hydrated, fetchQuote]);

  useEffect(() => {
    if (!quote) return;
    track("begin_checkout", {
      currency: quote.currency,
      value: quote.subtotal / 100,
      items: quote.lines.map((l) => ({ item_id: l.productId, item_name: l.title, item_variant: l.variantLabel, price: l.unitPrice / 100, quantity: l.quantity })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per checkout visit
  }, [quote?.lines.length]);

  const shippingOption = useMemo(() => quote?.shippingOptions.find((o) => o.id === shippingRateId), [quote, shippingRateId]);

  const validateStep = (s: Step): boolean => {
    setFormError(null);
    if (s === 1) {
      const r = emailSchema.safeParse(email);
      if (!r.success) {
        setErrors({ email: r.error.issues[0].message });
        return false;
      }
    }
    if (s === 2) {
      const r = addressSchema.safeParse(shipping);
      if (!r.success) {
        setErrors(zodErrors("shippingAddress", r.error));
        return false;
      }
    }
    if (s === 3 && !shippingRateId) {
      setErrors({ shippingRateId: "Choose a delivery method" });
      return false;
    }
    if (s === 4 && !billingSame) {
      const r = addressSchema.safeParse(billing);
      if (!r.success) {
        setErrors(zodErrors("billingAddress", r.error));
        return false;
      }
    }
    setErrors({});
    return true;
  };

  const next = (s: Step) => {
    if (validateStep(s)) setStep((Math.min(5, s + 1) as Step));
  };

  const pay = () => {
    for (const s of [1, 2, 3, 4] as Step[]) {
      if (!validateStep(s)) {
        setStep(s);
        return;
      }
    }
    if (!token || !quote) return;
    track("add_payment_info", { currency: quote.currency, value: quote.total / 100 });
    startTransition(async () => {
      const result = await placeOrderAction({
        checkoutToken: token,
        email,
        phone: shipping.phone,
        shippingAddress: shipping,
        billingSameAsShipping: billingSame,
        billingAddress: billingSame ? undefined : billing,
        shippingRateId,
        discountCode,
        lines,
      });
      if (result.ok) {
        window.location.assign(result.redirectUrl);
        return;
      }
      setFormError(result.error);
      if ("fieldErrors" in result) setErrors(result.fieldErrors);
      if ("resetToken" in result && result.resetToken) setToken(newToken());
      if ("quote" in result && result.quote) setQuote(result.quote);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  if (hydrated && !lines.length) {
    return (
      <div className="container-site py-24 text-center">
        <h1 className="display text-5xl">Your bag is empty</h1>
        <Link href="/shop" className={buttonClass("primary", "lg", "mt-8")}>Shop all</Link>
      </div>
    );
  }

  return (
    <div className="container-site pt-8 md:pt-12">
      <div className="flex items-end justify-between gap-4">
        <h1 className="display text-5xl md:text-6xl">Checkout</h1>
        <p className="flex items-center gap-1.5 text-xs text-stone"><Lock className="size-3.5" /> Secure checkout</p>
      </div>
      {testMode ? (
        <p className="mt-4 bg-cream px-4 py-3 text-xs text-charcoal">
          <strong>Test mode:</strong> no real payment is taken. Pay with Stripe&apos;s test card 4242 4242 4242 4242, any future expiry and any CVC.
        </p>
      ) : null}
      {formError ? <div className="mt-6"><FormMessage>{formError}</FormMessage></div> : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {!user ? (
            <p className="text-sm text-ash">
              Have an account? <Link href="/login?next=/checkout" className="underline">Sign in</Link> for faster checkout — or continue as a guest.
            </p>
          ) : null}

          <StepShell step={step} onEdit={setStep} n={1} summary={email}>
            <TextInput label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required error={errors.email} hint="For your order confirmation and updates." />
            <button type="button" className={buttonClass("primary", "md", "mt-6")} onClick={() => next(1)}>Continue</button>
          </StepShell>

          <StepShell
            step={step}
            onEdit={setStep}
            n={2}
            summary={`${shipping.firstName} ${shipping.lastName}, ${shipping.line1}, ${shipping.city} ${shipping.postcode}`}
          >
            <p className="mb-4 text-xs text-ash">
              Shipping to <strong>{countryLabel}</strong>. To ship to another country, change country in the header (prices update to that market).
            </p>
            {savedAddresses.length ? (
              <div className="mb-6 flex flex-wrap gap-2">
                {savedAddresses.map((a) => (
                  <button key={a.id} type="button" onClick={() => setShipping({ ...a })} className="border border-line bg-paper px-3 py-2 text-left text-xs hover:border-ink">
                    {a.firstName} {a.lastName}, {a.line1}, {a.postcode}
                  </button>
                ))}
              </div>
            ) : null}
            <AddressFields prefix="shippingAddress" value={shipping} onChange={setShipping} errors={errors} lockCountry autoCompleteSection="shipping" />
            <button type="button" className={buttonClass("primary", "md", "mt-6")} onClick={() => next(2)}>Continue</button>
          </StepShell>

          <StepShell step={step} onEdit={setStep} n={3} summary={shippingOption ? `${shippingOption.name} — ${shippingOption.price === 0 ? "Free" : formatMoney(shippingOption.price, market)}` : ""}>
            <fieldset>
              <legend className="sr-only">Delivery method</legend>
              <div className="space-y-2">
                {quote?.shippingOptions.map((o) => (
                  <label key={o.id} className={cn("flex cursor-pointer items-start justify-between gap-4 border p-4", shippingRateId === o.id ? "border-ink bg-paper" : "border-line")}>
                    <span className="flex gap-3">
                      <input type="radio" name="shipping" value={o.id} checked={shippingRateId === o.id} onChange={() => setShippingRateId(o.id)} className="mt-1 accent-ink" />
                      <span>
                        <span className="block text-sm font-medium">{o.name}</span>
                        <span className="block text-xs text-ash">{o.estimate ?? "Delivery estimate to be confirmed"}</span>
                        {o.description ? <span className="block text-xs text-stone">{o.description}</span> : null}
                        {o.freeOver != null && o.price > 0 ? (
                          <span className="block text-xs text-stone">Free over {formatMoney(o.freeOver, market)}</span>
                        ) : null}
                      </span>
                    </span>
                    <span className="text-sm font-medium">{o.price === 0 ? "Free" : formatMoney(o.price, market)}</span>
                  </label>
                ))}
              </div>
              {errors.shippingRateId ? <p className="mt-2 text-xs text-sale">{errors.shippingRateId}</p> : null}
            </fieldset>
            <button type="button" className={buttonClass("primary", "md", "mt-6")} onClick={() => next(3)}>Continue</button>
          </StepShell>

          <StepShell step={step} onEdit={setStep} n={4} summary={billingSame ? "Same as shipping address" : `${billing.firstName} ${billing.lastName}, ${billing.line1}, ${billing.postcode}`}>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} className="size-4 accent-ink" />
              Billing address is the same as shipping
            </label>
            {!billingSame ? (
              <div className="mt-6">
                <AddressFields prefix="billingAddress" value={billing} onChange={setBilling} errors={errors} autoCompleteSection="billing" />
              </div>
            ) : null}
            <button type="button" className={buttonClass("primary", "md", "mt-6")} onClick={() => next(4)}>Continue</button>
          </StepShell>

          <StepShell step={step} onEdit={setStep} n={5} summary="">
            <div className="space-y-4 text-sm">
              <p className="text-ash">
                You&apos;ll be redirected to Stripe&apos;s secure checkout page to pay. We never see or store your card details.
              </p>
              <dl className="grid gap-3 bg-paper p-4 text-xs sm:grid-cols-2">
                <div><dt className="text-stone">Contact</dt><dd>{email}</dd></div>
                <div><dt className="text-stone">Delivery</dt><dd>{shippingOption?.name}</dd></div>
                <div className="sm:col-span-2"><dt className="text-stone">Ship to</dt><dd>{shipping.firstName} {shipping.lastName}, {shipping.line1}{shipping.line2 ? `, ${shipping.line2}` : ""}, {shipping.city}{shipping.region ? `, ${shipping.region}` : ""} {shipping.postcode}, {countryLabel}</dd></div>
              </dl>
              <p className="text-xs text-stone">
                By placing your order you agree to our <Link href="/terms" className="underline">Terms</Link> and acknowledge our{" "}
                <Link href="/privacy-policy" className="underline">Privacy policy</Link>.
              </p>
              <button
                type="button"
                onClick={pay}
                disabled={pending || !quote || quote.hasIssues || !token}
                className={buttonClass("primary", "lg", "w-full")}
              >
                {pending ? "Placing order…" : quote ? `Pay ${formatMoney(quote.total, market)}` : "Pay"}
              </button>
            </div>
          </StepShell>
        </div>

        <aside className="lg:col-span-5">
          <div className="space-y-6 bg-paper p-6 lg:sticky lg:top-24">
            <h2 className="label">Order summary</h2>
            {quote ? (
              <>
                <ul className="space-y-4">
                  {quote.lines.map((l) => (
                    <li key={l.key} className="flex gap-3">
                      <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-product">
                        <SmartImage src={l.image} alt={l.imageAlt} fill sizes="64px" className="object-contain object-center block" showDemoTag={false} />
                        <span className="absolute right-0 top-0 grid size-5 place-items-center bg-ink text-[0.625rem] text-canvas">{l.quantity}</span>
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="font-medium">{l.title}</p>
                        <p className="text-ash">{l.variantLabel}</p>
                        {l.isPreorder ? <p className="mt-1 text-[0.6875rem] text-ink">Pre-order — {l.preorderMessage}</p> : null}
                        {l.issue ? <p className="text-sale">Unavailable — please <Link href="/cart" className="underline">review your bag</Link></p> : null}
                      </div>
                      <p className="text-xs tabular-nums">{formatMoney(l.lineTotal, market)}</p>
                    </li>
                  ))}
                </ul>
                <TotalsTable quote={quote} showShipping={step >= 3 || !!shippingRateId} />
              </>
            ) : (
              <div className="space-y-3" aria-busy>
                <div className="skeleton h-16" />
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-4" />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
