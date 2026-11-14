"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { useStore } from "@/components/providers/store-provider";
import { Drawer } from "@/components/ui/drawer";
import { SmartImage } from "@/components/ui/smart-image";
import type { MarketCode } from "@/lib/markets";
import { cn } from "@/lib/utils";
import { MarketSelector } from "./market-selector";

export type NavCategory = { slug: string; name: string; image: string };

const PRIMARY_LINKS = [
  { href: "/new-arrivals", label: "New Arrivals" },
  { href: "/pre-order", label: "Pre-order" },
  { href: "/sale", label: "Sale" },
  { href: "/about", label: "About" },
];

export function SiteHeader({
  categories,
  market,
  markets,
  userName,
  logo,
  logoLight,
}: {
  categories: NavCategory[];
  market: MarketCode;
  markets: MarketCode[];
  userName: string | null;
  logo: string;
  logoLight: string;
}) {
  const { count, setCartOpen, setSearchOpen, hydrated, wishlist, wishlistReady } = useStore();
  const [megaOpen, setMegaOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const megaId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<number | null>(null);
  const reduce = useReducedMotion();
  const overlay = isHome && !scrolled && !megaOpen;
  const preview = categories.find((c) => c.slug === activeCat) ?? categories[0];
  const iconBtn = cn("grid size-10 place-items-center transition-colors lg:size-11", overlay ? "hover:bg-canvas/10" : "hover:bg-ink/5");

  // Close menus on navigation
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset menus when the route changes
    setMegaOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!megaOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMegaOpen(false);
    const onDoc = (e: MouseEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setMegaOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [megaOpen]);

  const openMega = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setMegaOpen(true);
  };
  const scheduleClose = () => {
    closeTimer.current = window.setTimeout(() => setMegaOpen(false), 140);
  };

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={cn(
        "link-underline py-1 text-[0.75rem] font-medium uppercase tracking-[0.05em] xl:text-[0.8125rem] 2xl:text-[0.9375rem]",
        (pathname === href || (href !== "/" && pathname.startsWith(href))) && "bg-[length:100%_1px]",
      )}
    >
      {label}
    </Link>
  );

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300",
        megaOpen
          ? "border-transparent bg-canvas text-ink"
          : scrolled
          ? "border-line bg-canvas/95 text-ink backdrop-blur-md"
          : isHome
            ? "border-transparent bg-transparent text-canvas"
            : "border-transparent bg-canvas text-ink",
      )}
    >
      <div className="container-wide grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-[84px] lg:grid-cols-[auto_1fr_auto] lg:gap-x-8 xl:h-[92px]">
        {/* Left: nav (desktop) / menu (mobile) */}
        <div className="flex items-center gap-1 lg:col-start-2 lg:row-start-1 lg:justify-self-center">
          <button
            type="button"
            className="-ml-2 grid size-10 place-items-center hover:bg-ink/5 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" strokeWidth={1.5} />
          </button>
          <nav aria-label="Primary" className="hidden items-center gap-5 lg:flex xl:gap-8 2xl:gap-9">
            {navLink("/", "Home")}
            <div onMouseEnter={openMega} onMouseLeave={scheduleClose}>
              <button
                type="button"
                className={cn(
                  "link-underline inline-flex items-center gap-1 py-1 text-[0.75rem] font-medium uppercase tracking-[0.05em] xl:text-[0.8125rem] 2xl:text-[0.9375rem]",
                  megaOpen && "bg-[length:100%_1px]",
                )}
                aria-expanded={megaOpen}
                aria-controls={megaId}
                onClick={() => setMegaOpen((o) => !o)}
              >
                Shop
                <ChevronDown className={cn("size-3.5 transition-transform", megaOpen && "rotate-180")} aria-hidden />
              </button>
            </div>
            {PRIMARY_LINKS.map((l) => (
              <span key={l.href}>{navLink(l.href, l.label)}</span>
            ))}
          </nav>
        </div>

        {/* Centre: logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 lg:col-start-1 lg:row-start-1 lg:gap-3.5 xl:gap-4"
          aria-label="SLEEP TALK — home"
        >
          <Image
            src={overlay ? "/brand/moon-mark-light.png" : "/brand/moon-mark-dark.png"}
            alt=""
            width={891}
            height={949}
            priority
            className="h-7 w-auto sm:h-8 lg:h-11 xl:h-[50px] 2xl:h-14"
          />
          <Image
            src={overlay ? logoLight : logo}
            alt=""
            width={817}
            height={118}
            priority
            className="h-[16px] w-auto sm:h-[18px] lg:h-[20px] xl:h-[23px] 2xl:h-[26px]"
          />
        </Link>

        {/* Right: utilities */}
        <div className="flex items-center justify-end gap-0.5 sm:gap-1 lg:col-start-3 lg:row-start-1 lg:gap-1.5 xl:gap-3">
          <button
            type="button"
            className={iconBtn}
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            <Search className="size-5 lg:size-[26px]" strokeWidth={1.4} />
          </button>
          <Link
            href="/account"
            className={cn(iconBtn, "hidden sm:grid")}
            aria-label={userName ? `Account (signed in as ${userName})` : "Sign in or create an account"}
          >
            <User className="size-5 lg:size-[26px]" strokeWidth={1.4} />
          </Link>
          <Link
            href="/account/wishlist"
            className={cn(iconBtn, "relative hidden sm:grid")}
            aria-label={`Wishlist${wishlistReady && wishlist.size ? `, ${wishlist.size} saved` : ""}`}
          >
            <Heart className={cn("size-5 lg:size-[26px]", wishlistReady && wishlist.size > 0 && "fill-current")} strokeWidth={1.4} />
            {wishlistReady && wishlist.size > 0 ? (
              <span
                className={cn(
                  "absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full px-1 text-[0.625rem] font-semibold leading-[18px]",
                  overlay ? "bg-canvas text-ink" : "bg-ink text-canvas",
                )}
                aria-hidden
              >
                {wishlist.size}
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            className={cn(iconBtn, "relative")}
            onClick={() => setCartOpen(true)}
            aria-label={`Bag, ${hydrated ? count : 0} item${count === 1 ? "" : "s"}`}
          >
            <ShoppingBag className="size-5 lg:size-[26px]" strokeWidth={1.4} />
            {hydrated ? (
              <span
                className={cn(
                  "absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full px-1 text-[0.625rem] font-semibold leading-[18px]",
                  overlay ? "bg-canvas text-ink" : "bg-ink text-canvas",
                  count === 0 && "max-lg:hidden",
                )}
                aria-hidden
              >
                {count}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Mega menu */}
      <AnimatePresence>
        {megaOpen ? (
          <motion.div
            id={megaId}
            onMouseEnter={openMega}
            onMouseLeave={scheduleClose}
            className="absolute inset-x-0 top-full hidden border-t border-line bg-canvas text-ink shadow-[0_40px_60px_-30px_rgba(0,0,0,0.35)] lg:block"
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="container-wide grid grid-cols-12 gap-10 pb-10 pt-9 xl:gap-12">
              {/* Categories */}
              <div className="col-span-4 xl:col-span-3">
                <p className="mb-5 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-stone">Shop by category</p>
                <ul className="border-t border-line">
                  {categories.map((c) => (
                    <li key={c.slug} className="border-b border-line">
                      <Link
                        href={`/shop/${c.slug}`}
                        onMouseEnter={() => setActiveCat(c.slug)}
                        onFocus={() => setActiveCat(c.slug)}
                        className="group flex items-center justify-between py-3"
                      >
                        <span
                          className={cn(
                            "hero-title text-[1.375rem] transition-[color,transform] duration-300 group-hover:translate-x-1.5 xl:text-2xl",
                            preview?.slug === c.slug ? "text-ink" : "text-ink/45",
                          )}
                        >
                          {c.name}
                        </span>
                        <ArrowRight
                          className={cn(
                            "size-4 transition-all duration-300",
                            preview?.slug === c.slug ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
                          )}
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Discover */}
              <div className="col-span-2 flex flex-col gap-8 xl:col-span-3">
                <div>
                  <p className="mb-5 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-stone">Discover</p>
                  <ul className="space-y-3 text-[0.8125rem] font-medium uppercase tracking-[0.06em]">
                    {[
                      { href: "/new-arrivals", label: "New arrivals" },
                      { href: "/best-sellers", label: "Best sellers" },
                      { href: "/pre-order", label: "Pre-order" },
                      { href: "/shop/tracksuits?type=set", label: "Complete sets" },
                      { href: "/sale", label: "Sale", accent: true },
                    ].map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className={cn("link-underline", l.accent && "text-sale")}>
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href="/size-guide" className="mt-auto inline-flex items-center gap-2 text-xs text-ash underline-offset-4 hover:underline">
                  Size guide <ArrowRight className="size-3" aria-hidden />
                </Link>
              </div>

              {/* Visual tiles: hovered category preview + complete sets */}
              <div className="col-span-6 grid grid-cols-2 gap-3">
                {preview ? (
                  <Link href={`/shop/${preview.slug}`} className="group on-dark relative block aspect-[4/5] overflow-hidden bg-cream text-canvas">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.div
                        key={preview.slug}
                        className="absolute inset-0"
                        initial={reduce ? false : { opacity: 0, scale: 1.04 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <SmartImage src={preview.image} alt="" fill sizes="25vw" loading="eager" className="object-cover" />
                      </motion.div>
                    </AnimatePresence>
                    <div className="absolute inset-0 bg-gradient-to-t from-night/75 via-night/0 to-transparent" aria-hidden />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
                      <div>
                        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-canvas/75">Shop</p>
                        <p className="hero-title mt-1 text-3xl">{preview.name}</p>
                      </div>
                      <span className="grid size-10 place-items-center rounded-full border border-canvas/70 transition-colors group-hover:bg-canvas group-hover:text-ink">
                        <ArrowRight className="size-4" aria-hidden />
                      </span>
                    </div>
                  </Link>
                ) : null}
                <Link href="/shop/tracksuits?type=set" className="group on-dark relative block aspect-[4/5] overflow-hidden bg-[#8d8f92] text-canvas">
                  <SmartImage
                    src="/images/signature-tracksuit-studio.jpg"
                    alt=""
                    fill
                    sizes="25vw"
                    loading="eager"
                    className="object-cover object-[50%_15%] transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-night/80 via-night/10 to-transparent" aria-hidden />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-canvas/75">Tracksuits</p>
                    <p className="hero-title mt-1 text-3xl">Complete sets</p>
                    <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] underline-offset-4 group-hover:underline">
                      Shop sets <ArrowRight className="size-3.5" aria-hidden />
                    </span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-line">
              <div className="container-wide flex items-center justify-between py-3.5 text-xs font-semibold uppercase tracking-[0.08em]">
                <Link href="/shop" className="link-underline inline-flex items-center gap-2">
                  View all products <ArrowRight className="size-3.5" aria-hidden />
                </Link>
                <span className="font-medium normal-case tracking-normal text-stone">Unisex sizing · UK &amp; Canada</span>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Mobile navigation */}
      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} title="Menu" side="left" widthClass="w-[88vw] max-w-sm">
        <nav aria-label="Mobile" className="px-5 py-6">
          <ul className="space-y-1">
            <li>
              <Link href="/" className="display block py-2 text-3xl">Home</Link>
            </li>
            <li>
              <details className="group" open>
                <summary className="display flex cursor-pointer list-none items-center justify-between py-2 text-3xl">
                  Shop <span className="text-xl transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <ul className="mb-3 ml-1 space-y-2 border-l border-line pl-4 pt-1">
                  <li><Link href="/shop" className="block py-1 text-base">All products</Link></li>
                  {categories.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/shop/${c.slug}`} className="block py-1 text-base">{c.name}</Link>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
            {PRIMARY_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="display block py-2 text-3xl">{l.label}</Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 space-y-3 border-t border-line pt-6 text-sm">
            <Link href="/account" className="flex items-center gap-3"><User className="size-4" /> {userName ? `Account (${userName})` : "Sign in / Register"}</Link>
            <Link href="/account/wishlist" className="flex items-center gap-3"><Heart className="size-4" /> Wishlist</Link>
            <Link href="/track-order" className="block">Track an order</Link>
            <Link href="/contact" className="block">Contact</Link>
          </div>
          <div className="mt-8 border-t border-line pt-6">
            <MarketSelector market={market} available={markets} variant="drawer" />
          </div>
        </nav>
      </Drawer>
    </header>
  );
}
