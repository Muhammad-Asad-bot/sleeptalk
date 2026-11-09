import type { SocialSettings } from "@/content/defaults";
import { cn } from "@/lib/utils";

const LABELS: Record<keyof SocialSettings, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  pinterest: "Pinterest",
  youtube: "YouTube",
};

/** Social icons (simple monochrome marks, inherit currentColor). */
export function SocialGlyph({ name, size = 22 }: { name: keyof SocialSettings; size?: number }) {
  const svg = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true } as const;
  switch (name) {
    case "instagram":
      return (
        <svg {...svg} fill="none" stroke="currentColor" strokeWidth={1.8}>
          <rect x="2.9" y="2.9" width="18.2" height="18.2" rx="5.2" />
          <circle cx="12" cy="12" r="4.3" />
          <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...svg} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round">
          <path d="M14.2 3v11.6a3.6 3.6 0 1 1-3.6-3.6" />
          <path d="M14.2 3c.3 2.6 2.3 4.6 4.9 4.8" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...svg} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
          <path d="M13.6 21.5v-8.2h2.8l.4-3.2h-3.2V8.1c0-.9.3-1.6 1.6-1.6h1.7V3.7a22 22 0 0 0-2.5-.2c-2.5 0-4.2 1.5-4.2 4.3v2.3H7.4v3.2h2.8v8.2" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...svg} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
          <rect x="2.2" y="5" width="19.6" height="14" rx="4" />
          <path d="M10.2 9.2v5.6l4.8-2.8z" fill="currentColor" />
        </svg>
      );
    case "pinterest":
      return (
        <svg {...svg} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9.2" />
          <path d="M10.7 20.8 12.6 13" />
          <path d="M11.6 15.4c.6.5 1.3.7 2 .7 2.3 0 3.8-2 3.8-4.6 0-2.9-2.4-4.9-5.4-4.9-3.2 0-5.4 2.2-5.4 4.8 0 1.2.5 2.3 1.4 2.8" />
        </svg>
      );
  }
}

const DEFAULT_ORDER: (keyof SocialSettings)[] = ["instagram", "tiktok", "facebook", "youtube"];

/**
 * Social links. URLs are managed in Admin → Social links (settings "social").
 *  - Links with a URL open the profile in a new tab.
 *  - With showPlaceholders (demo mode), the standard icons are still shown as clickable links
 *    pointing at "#" until the official profile URLs are added. On the live site (demo mode off)
 *    networks without a URL are hidden, per the PRD.
 */
export function SocialLinks({
  social,
  className,
  compact = false,
  showPlaceholders = false,
}: {
  social: SocialSettings;
  className?: string;
  compact?: boolean;
  showPlaceholders?: boolean;
}) {
  const hasUrl = (k: keyof SocialSettings) => /^https?:\/\//.test(social[k] ?? "");
  const all = Object.keys(LABELS) as (keyof SocialSettings)[];
  const entries = showPlaceholders
    ? [...DEFAULT_ORDER, ...all.filter((k) => !DEFAULT_ORDER.includes(k) && hasUrl(k))]
    : all.filter(hasUrl);
  if (!entries.length) return null;
  return (
    <div className={className}>
      {!compact ? <h2 className="label mb-4 opacity-60">Follow</h2> : null}
      <ul className={cn("flex gap-2", compact && "flex-col gap-3")}>
        {entries.map((k) => {
          const url = hasUrl(k) ? social[k] : null;
          return (
            <li key={k}>
              <a
                href={url ?? "#"}
                {...(url ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={cn(
                  "grid place-items-center transition-opacity",
                  compact ? "size-11 opacity-90 hover:opacity-100" : "size-10 border border-current/25 hover:border-current",
                )}
                aria-label={url ? `SLEEP TALK on ${LABELS[k]} (opens in a new tab)` : `SLEEP TALK on ${LABELS[k]} (link coming soon)`}
                title={url ? LABELS[k] : `${LABELS[k]} — link coming soon`}
              >
                <SocialGlyph name={k} size={compact ? 26 : 20} />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
