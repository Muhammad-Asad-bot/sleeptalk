"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Clock,
  CornerDownLeft,
  ExternalLink,
  FileText,
  FolderTree,
  Inbox,
  LayoutGrid,
  LogOut,
  Menu,
  Megaphone,
  Palette,
  MessageSquareQuote,
  Percent,
  Plus,
  ScrollText,
  Search,
  Settings,
  Shapes,
  Share2,
  Shirt,
  Truck,
  Users,
  UserCog,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

type Icon = React.ComponentType<{ className?: string }>;
type Item = { href: string; label: string; icon: Icon; ownerOnly?: boolean; hint?: string; keywords?: string };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: BarChart3, keywords: "home overview stats revenue" }],
  },
  {
    title: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ClipboardList, hint: "to fulfil", keywords: "fulfil ship refund tracking" },
      { href: "/admin/customers", label: "Customers", icon: Users, keywords: "people accounts" },
      { href: "/admin/discounts", label: "Discounts", icon: Percent, keywords: "codes coupons promo" },
      { href: "/admin/messages", label: "Messages", icon: Inbox, hint: "open", keywords: "contact inbox email" },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", icon: Shirt, keywords: "items hoodies tracksuits" },
      { href: "/admin/products?preorder=1", label: "Pre-orders", icon: Clock, keywords: "preorder pre-order" },
      { href: "/admin/inventory", label: "Inventory", icon: Boxes, hint: "low stock", keywords: "stock sku quantity" },
      { href: "/admin/categories", label: "Categories", icon: FolderTree, keywords: "new category menu" },
      { href: "/admin/colours", label: "Colours", icon: Palette, keywords: "colors swatch two-tone" },
      { href: "/admin/collections", label: "Collections", icon: Shapes, keywords: "drops" },
      { href: "/admin/reviews", label: "Reviews", icon: MessageSquareQuote, hint: "pending", keywords: "ratings moderate" },
    ],
  },
  {
    title: "Storefront",
    items: [
      { href: "/admin/content", label: "Homepage & content", icon: LayoutGrid, keywords: "hero sections banner" },
      { href: "/admin/content/pages", label: "Pages", icon: FileText, keywords: "faq about policy terms" },
      { href: "/admin/content/announcement", label: "Announcement bar", icon: Megaphone },
      { href: "/admin/social-links", label: "Social links", icon: Share2, keywords: "instagram tiktok" },
      { href: "/admin/shipping", label: "Shipping & markets", icon: Truck, keywords: "delivery rates uk canada" },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/admin/settings", label: "Store settings", icon: Settings, ownerOnly: true },
      { href: "/admin/users", label: "Users & roles", icon: UserCog, ownerOnly: true, keywords: "staff team permissions" },
      { href: "/admin/audit-log", label: "Audit log", icon: ScrollText, keywords: "history activity" },
    ],
  },
];

/** Shortcuts offered in Quick find. */
const ACTIONS: Item[] = [
  { href: "/admin/products/new", label: "Add a product", icon: Plus, keywords: "new create" },
  { href: "/admin/discounts/new", label: "Create a discount code", icon: Plus, keywords: "new coupon promo" },
  { href: "/admin/collections/new", label: "Create a collection", icon: Plus, keywords: "new drop" },
  { href: "/admin/orders?status=paid&fulfillment=unfulfilled", label: "Orders to fulfil", icon: ClipboardList, keywords: "ship pack" },
  { href: "/admin/inventory?filter=low", label: "Low-stock variants", icon: Boxes, keywords: "restock" },
];

/** Free-text searches offered when something is typed into Quick find. */
const SEARCHES = [
  { base: "/admin/orders", label: "orders", icon: ClipboardList },
  { base: "/admin/products", label: "products", icon: Shirt },
  { base: "/admin/customers", label: "customers", icon: Users },
  { base: "/admin/inventory", label: "inventory (SKU, colour)", icon: Boxes },
];

function isActive(pathname: string, href: string, searchParams: URLSearchParams) {
  const [path, query] = href.split("?", 2);
  if (query) {
    return pathname === path && [...new URLSearchParams(query)].every(([key, value]) => searchParams.get(key) === value);
  }
  if (path === "/admin/products" && searchParams.get("preorder") === "1") return false;
  if (path === "/admin") return pathname === "/admin";
  if (path === "/admin/content") {
    return pathname === "/admin/content" || pathname.startsWith("/admin/content/sections") || pathname === "/admin/content/announcement";
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

type Counts = Partial<Record<string, number>>;

export function AdminNav({ role, email, counts = {} }: { role: "staff" | "owner"; email: string; counts?: Counts }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- close mobile nav on navigation
  useEffect(() => setOpen(false), [pathname]);

  // Ctrl/⌘ + K opens Quick find from anywhere in the admin.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(false);
        setFindOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.ownerOnly || role === "owner") }));

  const nav = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <Image src="/brand/moon-mark-light.png" alt="" width={891} height={949} className="h-8 w-auto" />
        <div>
          <p className="font-serif text-lg leading-none tracking-wide">SLEEP TALK</p>
          <p className="mt-1 text-[0.625rem] uppercase tracking-[0.16em] text-canvas/50">Admin</p>
        </div>
      </div>
      <div className="px-3 pb-4">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setFindOpen(true);
          }}
          className="flex w-full items-center gap-2 border border-canvas/15 bg-canvas/5 px-2.5 py-2 text-left text-[0.8125rem] text-canvas/60 transition-colors hover:border-canvas/30 hover:text-canvas"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1">Quick find…</span>
          <kbd className="border border-canvas/20 px-1 font-sans text-[0.625rem] text-canvas/50">Ctrl K</kbd>
        </button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="px-2 pb-1.5 text-[0.5625rem] font-semibold uppercase tracking-[0.18em] text-canvas/40">{g.title}</p>
            <ul className="space-y-0.5">
              {g.items.map((i) => {
                const active = isActive(pathname, i.href, searchParams);
                const enabled =
                  i.href === "/admin/products" ||
                  i.href === "/admin/settings" ||
                  i.href === "/admin/colours" ||
                  i.href === "/admin/reviews" ||
                  i.href === "/admin/social-links" ||
                  i.href === "/admin/content/announcement" ||
                  i.href === "/admin/products?preorder=1";
                const count = counts[i.href] ?? 0;
                const content = (
                  <>
                    <i.icon className="size-4 shrink-0" />
                    <span className="flex-1">{i.label}</span>
                    {count > 0 ? (
                      <span
                        title={`${count} ${i.hint ?? ""}`.trim()}
                        className={cn(
                          "min-w-5 px-1.5 py-px text-center text-[0.625rem] font-semibold tabular-nums",
                          active ? "bg-ink text-canvas" : "bg-cream text-ink",
                        )}
                      >
                        {count > 99 ? "99+" : count}
                        <span className="sr-only"> {i.hint}</span>
                      </span>
                    ) : null}
                  </>
                );
                return (
                  <li key={i.href}>
                    {enabled ? (
                      <Link
                        href={i.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 text-[0.8125rem] transition-colors",
                          active ? "bg-canvas text-ink" : "text-canvas/75 hover:bg-canvas/10 hover:text-canvas",
                        )}
                      >
                        {content}
                      </Link>
                    ) : (
                      <span
                        aria-disabled="true"
                        className="flex cursor-not-allowed items-center gap-2.5 px-2.5 py-2 text-[0.8125rem] text-canvas/35"
                      >
                        {content}
                      </span>
                    )}
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

  const totalAttention = Object.values(counts).reduce<number>((n, c) => n + (c ?? 0), 0);

  return (
    <>
      <aside className="on-dark fixed inset-y-0 left-0 z-30 hidden w-60 bg-night text-canvas lg:block">{nav}</aside>
      <div className="on-dark sticky top-0 z-30 flex h-14 items-center justify-between bg-night px-2 text-canvas lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open admin menu" className="relative grid size-10 place-items-center">
          <Menu className="size-5" />
          {totalAttention > 0 ? <span className="absolute right-2 top-2 size-2 rounded-full bg-cream" aria-hidden /> : null}
        </button>
        <p className="font-serif tracking-wide">SLEEP TALK · Admin</p>
        <button type="button" onClick={() => setFindOpen(true)} aria-label="Quick find" className="grid size-10 place-items-center">
          <Search className="size-5" />
        </button>
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
      {findOpen ? <QuickFind items={[...ACTIONS, ...groups.flatMap((g) => g.items)]} onClose={() => setFindOpen(false)} /> : null}
    </>
  );
}

type Result = { key: string; href: string; label: string; icon: Icon; section: string };

/** Keyboard-driven jump list: pages, common actions and record searches. */
function QuickFind({ items, onClose }: { items: Item[]; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const match = (i: Item) => !q || `${i.label} ${i.keywords ?? ""}`.toLowerCase().includes(q);
    const pages = items
      .filter(match)
      .map((i) => ({ key: i.href, href: i.href, label: i.label, icon: i.icon, section: i.href.includes("?") || i.href.endsWith("/new") ? "Actions" : "Go to" }));
    const searches = q
      ? SEARCHES.map((s) => ({
          key: `search:${s.base}`,
          href: `${s.base}?q=${encodeURIComponent(query.trim())}`,
          label: `Search ${s.label} for “${query.trim()}”`,
          icon: s.icon,
          section: "Search",
        }))
      : [];
    return [...pages, ...searches];
  }, [items, query]);

  const go = (r: Result | undefined) => {
    if (!r) return;
    onClose();
    router.push(r.href);
  };

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  let lastSection = "";
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Quick find">
      <div className="absolute inset-0 bg-night/50" onClick={onClose} />
      <div className="relative w-full max-w-lg border border-line bg-paper shadow-2xl">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="size-4 shrink-0 text-ash" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(results[cursor]);
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
            placeholder="Jump to a page, or search orders, products, customers…"
            aria-label="Quick find"
            aria-controls="quick-find-results"
            aria-activedescendant={results[cursor] ? `qf-${cursor}` : undefined}
            className="h-12 flex-1 bg-transparent text-sm focus:outline-none"
          />
          <kbd className="border border-line px-1 text-[0.625rem] text-stone">Esc</kbd>
        </div>
        <ul id="quick-find-results" ref={listRef} role="listbox" className="max-h-[50vh] overflow-y-auto py-2">
          {results.length ? (
            results.map((r, idx) => {
              const header = r.section !== lastSection ? r.section : null;
              lastSection = r.section;
              return (
                <li key={r.key} role="presentation">
                  {header ? <p className="px-4 pb-1 pt-2 text-[0.5625rem] font-semibold uppercase tracking-[0.18em] text-stone">{header}</p> : null}
                  <button
                    type="button"
                    id={`qf-${idx}`}
                    data-index={idx}
                    role="option"
                    aria-selected={idx === cursor}
                    onMouseMove={() => setCursor(idx)}
                    onClick={() => go(r)}
                    className={cn("flex w-full items-center gap-3 px-4 py-2 text-left text-sm", idx === cursor ? "bg-ink text-canvas" : "text-charcoal")}
                  >
                    <r.icon className="size-4 shrink-0 opacity-70" />
                    <span className="flex-1 truncate">{r.label}</span>
                    {idx === cursor ? <CornerDownLeft className="size-3.5 opacity-70" aria-hidden /> : null}
                  </button>
                </li>
              );
            })
          ) : (
            <li className="px-4 py-8 text-center text-sm text-ash">Nothing matches “{query}”.</li>
          )}
        </ul>
        <p className="border-t border-line px-4 py-2 text-[0.6875rem] text-stone">↑ ↓ to move · Enter to open · Esc to close</p>
      </div>
    </div>
  );
}
