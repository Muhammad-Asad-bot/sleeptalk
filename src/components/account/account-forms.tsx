"use client";

import { useActionState, useState } from "react";
import { saveAddressAction } from "@/app/actions/account";
import { changePasswordAction, updateProfileAction, type AuthState } from "@/app/actions/auth";
import { AddressFields, emptyAddress, type AddressValue } from "@/components/checkout/address-fields";
import { buttonClass } from "@/components/ui/button";
import { FormMessage, TextInput } from "@/components/ui/fields";

export function AddressForm({ initial, id, onDone }: { initial?: AddressValue; id?: string; onDone?: () => void }) {
  const [value, setValue] = useState<AddressValue>(initial ?? emptyAddress("GB"));
  const [state, action, pending] = useActionState<AuthState, FormData>(async (prev, fd) => {
    const result = await saveAddressAction(prev, fd);
    if (result?.ok) onDone?.();
    return result;
  }, null);
  const errors: Record<string, string> = {};
  for (const [k, v] of Object.entries(state?.errors ?? {})) errors[`address.${k}`] = v;
  return (
    <form action={action} className="space-y-5 border border-line bg-paper p-5">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      {(Object.keys(value) as (keyof AddressValue)[]).map((k) => (
        <input key={k} type="hidden" name={k} value={value[k]} />
      ))}
      <AddressFields prefix="address" value={value} onChange={setValue} errors={errors} autoCompleteSection="shipping" />
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="isDefault" className="size-4 accent-ink" /> Make this my default address
      </label>
      {state?.ok ? <FormMessage tone="success">{state.message}</FormMessage> : null}
      <button type="submit" disabled={pending} className={buttonClass("primary", "md")}>
        {pending ? "Saving…" : "Save address"}
      </button>
    </form>
  );
}

export function NewAddressToggle() {
  const [open, setOpen] = useState(false);
  return open ? (
    <AddressForm onDone={() => setOpen(false)} />
  ) : (
    <button type="button" onClick={() => setOpen(true)} className={buttonClass("secondary", "md")}>
      Add a new address
    </button>
  );
}

export function ProfileForm({ firstName, lastName, marketingOptIn }: { firstName: string; lastName: string; marketingOptIn: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(updateProfileAction, null);
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput label="First name" name="firstName" defaultValue={firstName} required error={state?.errors?.firstName} />
        <TextInput label="Last name" name="lastName" defaultValue={lastName} required error={state?.errors?.lastName} />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="marketingOptIn" defaultChecked={marketingOptIn} className="size-4 accent-ink" />
        Email me about drops and offers
      </label>
      {state?.message ? <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage> : null}
      <button type="submit" disabled={pending} className={buttonClass("primary", "md")}>{pending ? "Saving…" : "Save profile"}</button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(changePasswordAction, null);
  return (
    <form action={action} className="space-y-5">
      <TextInput label="Current password" name="current" type="password" autoComplete="current-password" required error={state?.errors?.current} />
      <TextInput label="New password" name="password" type="password" autoComplete="new-password" required error={state?.errors?.password} hint="At least 10 characters, including a letter and a number." />
      {state?.message ? <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage> : null}
      <button type="submit" disabled={pending} className={buttonClass("primary", "md")}>{pending ? "Saving…" : "Change password"}</button>
    </form>
  );
}
