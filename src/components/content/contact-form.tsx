"use client";

import { useActionState } from "react";
import { contactAction, type FormState } from "@/app/actions/store";
import { buttonClass } from "@/components/ui/button";
import { FormMessage, TextArea, TextInput } from "@/components/ui/fields";

/** `defaults` pre-fills the form, e.g. from a "Request a refund" link on an order. */
export function ContactForm({ defaults = {} }: { defaults?: { subject?: string; orderNumber?: string } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(contactAction, null);
  if (state?.ok) return <FormMessage tone="success">{state.message}</FormMessage>;
  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput label="Name" name="name" autoComplete="name" required error={state?.errors?.name} />
        <TextInput label="Email" name="email" type="email" autoComplete="email" required error={state?.errors?.email} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput label="Subject" name="subject" defaultValue={defaults.subject} error={state?.errors?.subject} />
        <TextInput label="Order number (optional)" name="orderNumber" placeholder="ST-XXXXXXX" defaultValue={defaults.orderNumber} error={state?.errors?.orderNumber} />
      </div>
      <TextArea label="Message" name="message" required error={state?.errors?.message} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state && !state.ok && state.message ? <FormMessage>{state.message}</FormMessage> : null}
      <button type="submit" disabled={pending} className={buttonClass("primary", "lg")}>
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
