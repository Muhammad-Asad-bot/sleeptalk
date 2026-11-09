"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderTree,
  Inbox,
  LayoutGrid,
  LogOut,
  Menu,
  Megaphone,
  MessageSquareQuote,
  Percent,
  ScrollText,
  Settings,
  Shapes,
  Share2,
  Shirt,
  Truck,
  Users,
  UserCog,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; ownerOnly?: boolean };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: BarChart3 }],
  },
  {
    title: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ClipboardList },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/discounts", label: "Discounts", icon: Percent },
      { href: "/admin/messages", label: "Messages", icon: Inbox },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", icon: Shirt },
      { href: "/admin/inventory", label: "Inventory", icon: Boxes },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/collections", label: "Collections", icon: Shapes },
      { href: "/admin/reviews", label: "Reviews", icon: MessageSquareQuote },
    ],
  },
  {
    title: "Storefront",
    items: [
      { href: "/admin/content", label: "Homepage & content", icon: LayoutGrid },
      { href: "/admin/content/pages", label: "Pages", icon: FileText },
      { href: "/admin/content/announcement", label: "Announcement bar", icon: Megaphone },
      { href: "/admin/social-links", label: "Social links", icon: Share2 },
      { href: "/admin/shipping", label: "Shipping & markets", icon: Truck },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/admin/settings", label: "Store settings", icon: Settings, ownerOnly: true },
      { href: "/admin/users", label: "Users & roles", icon: UserCog, ownerOnly: true },
      { href: "/admin/audit-log", label: "Audit log", icon: ScrollText },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/content") return pathname === "/admin/content" || pathname.startsWith("/admin/content/sections");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ role, email }: { role: "staff" | "owner"; email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- close mobile nav on navigation
  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <Image src="/brand/moon-mark-light.png" alt="" width={891} height={949} className="h-8 w-auto" />
        <div>
          <p className="font-serif text-lg leading-none tracking-wide">SLEEP TALK</p>
          <p className="mt-1 text-[0.625rem] uppercase tracking-[0.16em] text-canvas/50">Admin</p>
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <p className="px-2 pb-1.5 text-[0.5625rem] font-semibold uppercase tracking-[0.18em] text-canvas/40">{g.title}</p>
            <ul className="space-y-0.5">
              {g.items
                .filter((i) => !i.ownerOnly || role === "owner")
                .map((i) => {
                  const active = isActive(pathname, i.href);
                  return (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 text-[0.8125rem] transition-colors",
                          active ? "bg-canvas text-ink" : "text-canvas/75 hover:bg-canvas/10 hover:text-canvas",
                        )}
                      >
                        <i.icon className="size-4 shrink-0" />
                        {i.label}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-canvas/10 px-5 py-4 text-xs">
        <Link href="/" target="_blank" className="flex items-center gap-2 text-canvas/70 hover:text-canvas">
          <ExternalLink className="size-3.5" /> View store
        </Link>
        <p className="truncate text-canvas/50" title={email}>{email} · {role}</p>
        <form action={logoutAction}>
          <button type="submit" className="flex items-center gap-2 text-canvas/70 hover:text-canvas">
            <LogOut className="size-3.5" /> Sign out
          </button>
        </form>
      </div>
    </nav>
  );

  return (
    <>
      <aside className="on-dark fixed inset-y-0 left-0 z-30 hidden w-60 bg-night text-canvas lg:block">{nav}</aside>
      <div className="on-dark sticky top-0 z-30 flex h-14 items-center justify-between bg-night px-4 text-canvas lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open admin menu" className="grid size-10 place-items-center">
          <Menu className="size-5" />
        </button>
        <p className="font-serif tracking-wide">SLEEP TALK · Admin</p>
        <span className="size-10" />
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="absolute inset-0 bg-night/50" onClick={() => setOpen(false)} />
          <aside className="on-dark absolute inset-y-0 left-0 w-72 bg-night text-canvas">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 grid size-9 place-items-center">
              <X className="size-5" />
            </button>
            {nav}
          </aside>
        </div>
      ) : null}
    </>
  );
}
