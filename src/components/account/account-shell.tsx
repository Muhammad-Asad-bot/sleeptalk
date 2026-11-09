import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/settings", label: "Settings" },
];

export function AccountShell({ active, title, name, children }: { active: string; title: string; name: string; children: React.ReactNode }) {
  return (
    <div className="container-wide pt-8 md:pt-12">
      <div className="border-b border-ink pb-4">
        <p className="mb-2 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-stone">Hi, {name}</p>
        <h1 className="hero-title text-4xl md:text-6xl">{title}</h1>
      </div>
      <div className="mt-8 grid gap-10 lg:grid-cols-12">
        <nav aria-label="Account" className="lg:col-span-3">
          <ul className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:overflow-visible">
            {NAV.map((n) => (
              <li key={n.href} className="shrink-0">
                <Link
                  href={n.href}
                  aria-current={active === n.href ? "page" : undefined}
                  className={cn(
                    "block whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] lg:px-4",
                    active === n.href ? "bg-ink text-canvas" : "hover:bg-paper",
                  )}
                >
                  {n.label}
                </Link>
              </li>
            ))}
            <li className="shrink-0 lg:pt-4">
              <form action={logoutAction}>
                <button type="submit" className="px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-ash underline-offset-4 hover:underline lg:px-4">
                  Sign out
                </button>
              </form>
            </li>
          </ul>
        </nav>
        <div className="lg:col-span-9">{children}</div>
      </div>
    </div>
  );
}
