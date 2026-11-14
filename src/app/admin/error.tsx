"use client";

import Link from "next/link";

export default function AdminError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl border border-line bg-white/70 p-6 sm:p-8" role="alert">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sale">Admin page unavailable</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-ash">
        This page couldn&apos;t be loaded. Try again, or return to the dashboard.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={retry}
          className="h-10 bg-ink px-4 text-xs font-semibold uppercase tracking-[0.08em] text-canvas hover:bg-charcoal"
        >
          Try again
        </button>
        <Link
          href="/admin"
          className="inline-flex h-10 items-center border border-ink bg-white px-4 text-xs font-semibold uppercase tracking-[0.08em] text-ink hover:bg-ink hover:text-canvas"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
