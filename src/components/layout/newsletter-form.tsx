"use client";

import Link from "next/link";
import { useActionState } from "react";
import { subscribeNewsletterAction, type FormState } from "@/app/actions/store";
import { cn } from "@/lib/utils";

export function NewsletterForm({ tone = "dark", idPrefix = "nl" }: { tone?: "dark" | "light"; idPrefix?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribeNewsletterAction, null);
  const dark = tone === "dark";
  if (state?.ok) {
    return (
      <p role="status" className={cn("text-sm", dark ? "text-canvas" : "text-ink")}>
        {state.message}
      </p>
    );
  }
  return (
    <form action={action} className="space-y-3" noValidate>
      <div className={cn("flex border-b", dark ? "border-canvas/40 focus-within:border-canvas" : "border-ink/40 focus-within:border-ink")}>
        <label htmlFor={`${idPrefix}-email`} className="sr-only">Email address</label>
        <input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="Email address"
          aria-invalid={state?.errors?.email ? true : undefined}
          aria-describedby={state?.errors?.email ? `${idPrefix}-email-error` : undefined}
          className={cn("h-12 w-full bg-transparent text-sm focus:outline-none", dark ? "placeholder:text-canvas/50" : "placeholder:text-stone")}
        />
        <button type="submit" disabled={pending} className="label shrink-0 px-2 disabled:opacity-50">
          {pending ? "…" : "Subscribe"}
        </button>
      </div>
      {/* honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state?.errors?.email ? <p id={`${idPrefix}-email-error`} role="alert" className="text-xs text-[#e8a39b]">{state.errors.email}</p> : null}
      <label className={cn("flex items-start gap-2 text-xs leading-relaxed", dark ? "text-canvas/70" : "text-ash")}>
        <input type="checkbox" name="consent" className="mt-0.5 size-4 shrink-0 accent-current" required />
        <span>
          I agree to receive SLEEP TALK emails about drops and offers. Unsubscribe anytime. See our{" "}
          <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.
        </span>
      </label>
      {state?.errors?.consent ? <p role="alert" className="text-xs text-[#e8a39b]">{state.errors.consent}</p> : null}
      {state && !state.ok && state.message ? <p role="alert" className="text-xs text-[#e8a39b]">{state.message}</p> : null}
    </form>
  );
}
