"use client";

import { CheckCircle2, Loader2, TriangleAlert, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/* Client-side admin helpers: pending/confirm submit buttons and flash toasts. */

/**
 * Submit button for server-action forms. Shows a spinner and blocks double
 * submits while the action runs; `confirm` asks before destructive actions.
 */
export function SubmitButton({
  children,
  className,
  confirm,
  pendingText,
  disabled,
  title,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  /** Question shown in a confirmation dialog before submitting. */
  confirm?: string;
  /** Label while saving (defaults to the normal label). */
  pendingText?: React.ReactNode;
  disabled?: boolean;
  title?: string;
  "aria-label"?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      title={title}
      aria-label={ariaLabel}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn(className, pending && "cursor-wait")}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden /> : null}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

type Toast = { kind: "ok" | "error"; text: string };

/**
 * Toast for the ?ok= / ?error= flash a server action redirects with.
 * Success messages fade after a few seconds; errors stay until dismissed.
 * The flash params are removed from the address bar so a refresh doesn't repeat them.
 */
export function FlashToast() {
  const params = useSearchParams();
  const ok = params.get("ok");
  const error = params.get("error");
  // A new redirect with a flash (even the same text as before) produces a new signature.
  const sig = ok || error ? params.toString() : "";
  const [lastSig, setLastSig] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  if (sig !== lastSig) {
    setLastSig(sig);
    if (sig) setToast(error ? { kind: "error", text: error } : { kind: "ok", text: ok! });
  }

  useEffect(() => {
    if (!toast) return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("ok") || url.searchParams.has("error")) {
      url.searchParams.delete("ok");
      url.searchParams.delete("error");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
    if (toast.kind === "ok") {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  if (!toast) return null;
  const isError = toast.kind === "error";
  return (
    <div className="pointer-events-none fixed inset-x-4 top-16 z-[60] flex justify-center sm:inset-x-auto sm:right-6 sm:top-6 sm:justify-end">
      <div
        role={isError ? "alert" : "status"}
        className={cn(
          "pointer-events-auto flex w-full max-w-sm items-start gap-3 border bg-white px-4 py-3 text-sm shadow-lg",
          isError ? "border-sale/50 text-sale" : "border-success/50 text-success",
        )}
      >
        {isError ? <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />}
        <p className="flex-1 text-charcoal">
          <span className={cn("mb-0.5 block text-[0.625rem] font-semibold uppercase tracking-[0.12em]", isError ? "text-sale" : "text-success")}>
            {isError ? "Something went wrong" : "Done"}
          </span>
          {toast.text}
        </p>
        <button type="button" onClick={() => setToast(null)} aria-label="Dismiss message" className="-mr-1 grid size-6 shrink-0 place-items-center text-ash hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
