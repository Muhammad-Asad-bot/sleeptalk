"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { CONSENT_COOKIE, readConsent } from "@/lib/analytics";
import { buttonClass } from "@/components/ui/button";

const OPEN_EVENT = "st:open-cookie-preferences";

function writeConsent(value: "all" | "essential") {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax${secure}`;
}

/**
 * Cookie consent (UK PECR/GDPR & Canadian PIPEDA friendly default: analytics OFF until accepted).
 * Final wording to be reviewed by the client's legal counsel.
 */
export function CookieBanner() {
  const [consent, setConsent] = useState<"all" | "essential" | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const current = readConsent();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read consent cookie after mount
    setConsent(current);
    setVisible(current === null);
    const open = () => setVisible(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  const choose = (value: "all" | "essential") => {
    writeConsent(value);
    setConsent(value);
    setVisible(false);
    if (value === "essential" && consent === "all") window.location.reload(); // unload analytics
  };

  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <>
      {consent === "all" && gaId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}
          </Script>
        </>
      ) : null}
      {visible ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-title"
          className="fixed inset-x-3 bottom-3 z-50 max-w-md border border-line bg-paper p-5 shadow-2xl animate-fade-up sm:left-auto sm:right-5 sm:bottom-5"
        >
          <h2 id="cookie-title" className="label">Cookies</h2>
          <p className="mt-2 text-sm leading-relaxed text-charcoal">
            We use essential cookies to run the store (your bag, sign-in and country). With your permission we&apos;d also like
            to use analytics cookies to understand how the site is used. See our{" "}
            <Link href="/cookie-policy" className="underline">Cookie policy</Link>.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" className={buttonClass("secondary", "sm")} onClick={() => choose("essential")}>
              Essential only
            </button>
            <button type="button" className={buttonClass("primary", "sm")} onClick={() => choose("all")}>
              Accept analytics
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function CookiePreferencesLink() {
  return (
    <button type="button" className="link-underline" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      Cookie preferences
    </button>
  );
}
