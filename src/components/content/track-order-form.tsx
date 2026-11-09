"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { trackOrderAction, type FormState } from "@/app/actions/store";
import { buttonClass } from "@/components/ui/button";
import { FormMessage, TextInput } from "@/components/ui/fields";

export function TrackOrderForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<(FormState & { redirect?: string }) | null, FormData>(trackOrderAction, null);
  useEffect(() => {
    if (state?.ok && state.redirect) router.push(state.redirect);
  }, [state, router]);
  return (
    <form action={action} className="space-y-5">
      <TextInput label="Order number" name="orderNumber" placeholder="ST-XXXXXXX" required autoComplete="off" />
      <TextInput label="Email address" name="email" type="email" autoComplete="email" required />
      {state && !state.ok && state.message ? <FormMessage>{state.message}</FormMessage> : null}
      <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
        {pending ? "Looking up…" : "Track order"}
      </button>
    </form>
  );
}
