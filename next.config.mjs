// Plain .mjs rather than .ts on purpose. Next compiles a TypeScript config
// through SWC before it can read it, and on hosts with an old glibc (Hostinger
// shared hosting is glibc < 2.29) the native SWC binary refuses to load. The
// wasm fallback then fails to resolve the temp file it just wrote, so the build
// dies on "Failed to load next.config.ts" before it compiles a single page.
// A .mjs config is imported by Node directly and sidesteps that entirely.

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Product photography still lives on the legacy builder's CDN. Admins can
    // paste any https image URL, so we allow the CDN hosts we know plus the
    // common ones a shop owner is likely to use.
    remotePatterns: [
      { protocol: "https", hostname: "cdn.zyrosite.com", pathname: "/**" },
      { protocol: "https", hostname: "assets.zyrosite.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      // YouTube poster frames for gallery videos
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/**" },
      { protocol: "https", hostname: "img.youtube.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
    // Cache optimised variants for a week — the catalog changes rarely and this
    // keeps us well inside the free tier (SRS: performance on 4G).
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
};

export default nextConfig;
