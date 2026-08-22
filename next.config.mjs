// Plain .mjs rather than .ts on purpose. Next compiles a TypeScript config
// through SWC before it can read it, and on hosts with an old glibc (Hostinger
// shared hosting is glibc < 2.29) the native SWC binary refuses to load. The
// wasm fallback then fails to resolve the temp file it just wrote, so the build
// dies on "Failed to load next.config.ts" before it compiles a single page.
// A .mjs config is imported by Node directly and sidesteps that entirely.

import { OPTIMISABLE_IMAGE_HOSTS } from "./src/lib/image-hosts.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Single source of truth, shared with MediaImage so the two cannot drift.
    remotePatterns: OPTIMISABLE_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https",
      hostname,
      pathname: "/**",
    })),
    formats: ["image/avif", "image/webp"],
    // Cache optimised variants for a week — the catalog changes rarely and this
    // keeps us well inside the free tier (SRS: performance on 4G).
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
};

export default nextConfig;
