import type { NextConfig } from "next";

/**
 * Remote hosts for TEMPORARY demo placeholder imagery listed in the PRD (section 18).
 * These are third-party images with unconfirmed usage rights. Remove these hosts once
 * client-owned photography is uploaded (see src/content/demo-assets.ts).
 */
const demoImageHosts = [
  "bluorng.com",
  "images.squarespace-cdn.com",
  "greenwich-showroom.com",
  "sonderstories.es",
  "derschutze.com",
  "www.trueprodigy.de",
  "image-cdn.hypb.st",
  "images.complex.com",
  "baseec-img-mng.akamaized.net",
  "youngfashionmind.de",
];

/** Product photos uploaded to Supabase Storage (public bucket) are served from the project's host. */
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Every storefront page depends on per-request data (market cookie, session,
  // admin-managed content), so we use classic dynamic rendering rather than
  // Cache Components. See README "Rendering model".
  cacheComponents: false,
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  images: {
    remotePatterns: [
      ...demoImageHosts.map((hostname) => ({ protocol: "https" as const, hostname })),
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : []),
    ],
    qualities: [75, 85],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
