import Image from "next/image";
import Link from "next/link";
import type { SettingsMap } from "@/content/defaults";
import type { MarketCode } from "@/lib/markets";
import { CookiePreferencesLink } from "./cookie-banner";
import { MarketSelector } from "./market-selector";
import { NewsletterForm } from "./newsletter-form";
import { SocialLinks } from "./social-links";
import { telHref } from "@/lib/utils";

const HELP = [
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
  { href: "/shipping", label: "Shipping & delivery" },
  { href: "/returns", label: "Returns & refunds" },
  { href: "/size-guide", label: "Size guide" },
  { href: "/track-order", label: "Track your order" },
];
const SHOP = [
  { href: "/shop", label: "All products" },
  { href: "/new-arrivals", label: "New arrivals" },
  { href: "/best-sellers", label: "Best sellers" },
  { href: "/sale", label: "Sale" },
];
const LEGAL = [
  { href: "/privacy-policy", label: "Privacy policy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookie-policy", label: "Cookie policy" },
];

export function SiteFooter({ settings, market, markets }: { settings: SettingsMap; market: MarketCode; markets: MarketCode[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="on-dark mt-24 bg-night text-canvas">
      <div className="container-site grid gap-12 py-16 md:grid-cols-12 md:py-20">
        <div className="md:col-span-5">
          <Image src="/brand/emblem-lockup-light.png" alt="SLEEP TALK — Say it without saying it." width={781} height={946} className="h-auto w-28" />
          <h2 className="display mt-10 text-4xl md:text-5xl">Newsletter</h2>
          <p className="mt-3 max-w-sm text-sm text-canvas/70">Early access to drops and restocks. No noise.</p>
          <div className="mt-6 max-w-md">
            <NewsletterForm idPrefix="footer-nl" />
          </div>
        </div>
        <nav aria-label="Shop" className="md:col-span-2">
          <h2 className="label mb-5 text-canvas/60">Shop</h2>
          <ul className="space-y-3 text-sm">
            {SHOP.map((l) => (
              <li key={l.href}><Link href={l.href} className="link-underline">{l.label}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Customer service" className="md:col-span-2">
          <h2 className="label mb-5 text-canvas/60">Help</h2>
          <ul className="space-y-3 text-sm">
            {HELP.map((l) => (
              <li key={l.href}><Link href={l.href} className="link-underline">{l.label}</Link></li>
            ))}
          </ul>
        </nav>
        <div className="space-y-8 md:col-span-3">
          <div>
            <h2 className="label mb-5 text-canvas/60">Contact</h2>
            <ul className="space-y-2 text-sm text-canvas/80">
              <li><a className="link-underline" href={`mailto:${settings.store.supportEmail}`}>{settings.store.supportEmail}</a></li>
              {settings.store.phone ? (
                <li><a className="link-underline" href={`tel:${telHref(settings.store.phone)}`}>{settings.store.phone}</a></li>
              ) : null}
              {settings.store.address ? <li className="whitespace-pre-line text-canvas/70">{settings.store.address}</li> : null}
            </ul>
          </div>
          <SocialLinks social={settings.social} showPlaceholders={settings.store.demoMode} />
          <MarketSelector market={market} available={markets} variant="footer" />
        </div>
      </div>
      <div className="border-t border-canvas/10">
        <div className="container-site flex flex-col gap-4 py-6 text-xs text-canvas/60 md:flex-row md:items-center md:justify-between">
          <p>© {year} SLEEP TALK. {settings.store.motto}</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL.map((l) => (
              <li key={l.href}><Link href={l.href} className="link-underline">{l.label}</Link></li>
            ))}
            <li><CookiePreferencesLink /></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
