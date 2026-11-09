import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "inverse" | "outline-inverse" | "danger";
type Size = "sm" | "md" | "lg";

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-[0.12em] transition-colors duration-200 select-none",
    "disabled:opacity-45 disabled:pointer-events-none",
    size === "sm" && "h-9 px-4 text-[0.6875rem]",
    size === "md" && "h-12 px-6 text-xs",
    size === "lg" && "h-14 px-8 text-xs",
    variant === "primary" && "bg-ink text-canvas hover:bg-charcoal",
    variant === "secondary" && "border border-ink text-ink hover:bg-ink hover:text-canvas",
    variant === "ghost" && "text-ink hover:bg-ink/5",
    variant === "inverse" && "bg-canvas text-ink hover:bg-cream",
    variant === "outline-inverse" && "border border-canvas/80 text-canvas hover:bg-canvas hover:text-ink",
    variant === "danger" && "bg-sale text-white hover:bg-sale/90",
    extra,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
