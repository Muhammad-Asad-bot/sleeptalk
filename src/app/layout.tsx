import type { Metadata, Viewport } from "next";
import { Archivo, Cormorant_Garamond } from "next/font/google";
import { getSettings } from "@/lib/server/settings";
import { absoluteUrl } from "@/lib/utils";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

// All pages read per-request data (market cookie, session, admin-managed content).
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSettings();
  return {
    metadataBase: new URL(absoluteUrl("/")),
    title: { default: seo.defaultTitle, template: seo.titleTemplate },
    description: seo.defaultDescription,
    openGraph: {
      type: "website",
      siteName: "SLEEP TALK",
      images: [{ url: seo.ogImage, width: 1200, height: 630, alt: "SLEEP TALK" }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${archivo.variable} ${cormorant.variable} antialiased`}>
      <body className="min-h-dvh bg-canvas text-ink">{children}</body>
    </html>
  );
}
