import Link from "next/link";
import { cn } from "@/lib/utils";

/* Shared admin UI primitives (server-compatible). */

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div>
        {back ? (
          <Link href={back.href} className="mb-2 inline-block text-xs text-ash underline-offset-4 hover:underline">
            ← {back.label}
          </Link>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-ash">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, children, className, actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("border border-line bg-white/70 p-5", className)}>
      {title || actions ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ash">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "warn" | "ok" }) {
  return (
    <div className="border border-line bg-white/70 p-5">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ash">{label}</p>
      <p className={cn("mt-2 text-2xl font-bold tabular-nums", tone === "warn" && "text-warning", tone === "ok" && "text-success")}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone">{hint}</p> : null}
    </div>
  );
}

const BADGE: Record<string, string> = {
  green: "bg-success/10 text-success border-success/30",
  amber: "bg-warning/10 text-warning border-warning/30",
  red: "bg-sale/10 text-sale border-sale/30",
  grey: "bg-ink/5 text-ash border-line",
  black: "bg-ink text-canvas border-ink",
  blue: "bg-[#1f4e8c]/10 text-[#1f4e8c] border-[#1f4e8c]/30",
};

export function Badge({ children, color = "grey" }: { children: React.ReactNode; color?: keyof typeof BADGE }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap border px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.08em]", BADGE[color])}>
      {children}
    </span>
  );
}

export const ORDER_STATUS: Record<string, { label: string; color: keyof typeof BADGE }> = {
  pending_payment: { label: "Awaiting payment", color: "amber" },
  paid: { label: "Paid", color: "green" },
  payment_failed: { label: "Payment failed", color: "red" },
  cancelled: { label: "Cancelled", color: "grey" },
  refunded: { label: "Refunded", color: "blue" },
};

export const FULFILMENT_STATUS: Record<string, { label: string; color: keyof typeof BADGE }> = {
  unfulfilled: { label: "Unfulfilled", color: "amber" },
  processing: { label: "Processing", color: "blue" },
  shipped: { label: "Shipped", color: "black" },
  delivered: { label: "Delivered", color: "green" },
  returned: { label: "Returned", color: "grey" },
};

export const tableClass = "w-full min-w-[720px] text-left text-sm";
export const thClass = "border-b border-ink/80 px-3 py-2.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-ash";
export const tdClass = "border-b border-line px-3 py-3 align-middle";

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-line bg-white/70">
      <table className={tableClass}>{children}</table>
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-12 text-center text-sm text-ash">
        {children}
      </td>
    </tr>
  );
}

export const adminInput =
  "h-10 w-full border border-line bg-white px-3 text-sm focus:border-ink focus:outline-none disabled:bg-paper disabled:text-stone";
export const adminSelect = adminInput + " pr-8";
/** Compact inline controls for table rows */
export const inputSm = "h-8 border border-line bg-white px-2 text-xs focus:border-ink focus:outline-none";
export const adminTextarea = "min-h-24 w-full border border-line bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none";
export const adminLabel = "mb-1 block text-xs font-medium text-charcoal";

export function AField({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className={adminLabel}>{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[0.6875rem] text-stone">{hint}</span> : null}
    </label>
  );
}

export function abtn(variant: "primary" | "secondary" | "danger" | "ghost" = "primary", size: "sm" | "md" = "md") {
  return cn(
    "inline-flex items-center justify-center gap-1.5 font-semibold uppercase tracking-[0.08em] transition-colors disabled:opacity-40",
    size === "sm" ? "h-8 px-3 text-[0.625rem]" : "h-10 px-4 text-[0.6875rem]",
    variant === "primary" && "bg-ink text-canvas hover:bg-charcoal",
    variant === "secondary" && "border border-ink bg-white text-ink hover:bg-ink hover:text-canvas",
    variant === "danger" && "border border-sale bg-white text-sale hover:bg-sale hover:text-white",
    variant === "ghost" && "text-ink hover:bg-ink/5",
  );
}

/** Flash message driven by ?ok= / ?error= query params after a server action redirect. */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={cn(
        "mb-5 border px-4 py-3 text-sm",
        error ? "border-sale/40 bg-sale/5 text-sale" : "border-success/40 bg-success/5 text-success",
      )}
    >
      {error ?? ok}
    </div>
  );
}

/** Simple numbered pagination preserving the current query string. */
export function Pagination({ page, pages, params }: { page: number; pages: number; params: Record<string, string | undefined> }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    sp.set("page", String(p));
    return `?${sp.toString()}`;
  };
  return (
    <nav className="mt-4 flex items-center justify-between text-xs" aria-label="Pagination">
      <span className="text-ash">Page {page} of {pages}</span>
      <div className="flex gap-2">
        {page > 1 ? <Link href={href(page - 1)} className={abtn("secondary", "sm")}>Previous</Link> : null}
        {page < pages ? <Link href={href(page + 1)} className={abtn("secondary", "sm")}>Next</Link> : null}
      </div>
    </nav>
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <form method="get" className="mb-4 flex flex-wrap items-end gap-2 border border-line bg-white/70 p-3">
      {children}
      <button type="submit" className={abtn("primary", "md")}>Apply</button>
    </form>
  );
}
