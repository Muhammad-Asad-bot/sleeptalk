"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  resetPasswordAction,
  type AuthState,
} from "@/app/actions/auth";
import { buttonClass } from "@/components/ui/button";
import { FormMessage, TextInput } from "@/components/ui/fields";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <TextInput label="Email" name="email" type="email" autoComplete="email" required />
      <TextInput label="Password" name="password" type="password" autoComplete="current-password" required />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-xs underline underline-offset-4">Forgot your password?</Link>
      </div>
      {state?.message ? <FormMessage>{state.message}</FormMessage> : null}
      <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(registerAction, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput label="First name" name="firstName" autoComplete="given-name" required error={e.firstName} />
        <TextInput label="Last name" name="lastName" autoComplete="family-name" required error={e.lastName} />
      </div>
      <TextInput label="Email" name="email" type="email" autoComplete="email" required error={e.email} />
      <TextInput
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={e.password}
        hint="At least 10 characters, including a letter and a number."
      />
      <label className="flex items-start gap-3 text-xs leading-relaxed text-ash">
        <input type="checkbox" name="marketingOptIn" className="mt-0.5 size-4 accent-ink" />
        <span>Send me SLEEP TALK emails about drops and offers. Unsubscribe anytime.</span>
      </label>
      {state?.message ? <FormMessage>{state.message}</FormMessage> : null}
      <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-xs text-stone">
        By creating an account you agree to our <Link href="/terms" className="underline">Terms</Link> and{" "}
        <Link href="/privacy-policy" className="underline">Privacy policy</Link>.
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(forgotPasswordAction, null);
  if (state?.ok) return <FormMessage tone="success">{state.message}</FormMessage>;
  return (
    <form action={action} className="space-y-5">
      <TextInput label="Email" name="email" type="email" autoComplete="email" required error={state?.errors?.email} />
      {state?.message ? <FormMessage>{state.message}</FormMessage> : null}
      <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPasswordAction, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <TextInput label="New password" name="password" type="password" autoComplete="new-password" required error={state?.errors?.password} hint="At least 10 characters, including a letter and a number." />
      <TextInput label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required error={state?.errors?.confirm} />
      {state?.message ? <FormMessage>{state.message}</FormMessage> : null}
      <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
