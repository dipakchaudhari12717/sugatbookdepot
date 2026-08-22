/**
 * Hosts next/image is allowed to optimise.
 *
 * Imported by next.config.mjs (to build remotePatterns) and by MediaImage (to
 * decide whether a URL can go through the optimiser at all), so the two can
 * never drift apart. Plain .mjs because a Next config cannot import TypeScript.
 *
 * Anything not listed here still displays — MediaImage falls back to a plain
 * <img>. The list is about optimisation, not permission.
 */
export const OPTIMISABLE_IMAGE_HOSTS = [
  // Product photography still lives on the legacy builder's CDN.
  "cdn.zyrosite.com",
  "assets.zyrosite.com",
  "images.unsplash.com",
  "firebasestorage.googleapis.com",
  "lh3.googleusercontent.com",
  // YouTube poster frames for gallery videos
  "i.ytimg.com",
  "img.youtube.com",
];

/** True when next/image can handle this URL. Anything else gets a plain img. */
export function isOptimisableImage(src) {
  if (typeof src !== "string") return false;
  if (src.startsWith("/")) return true; // our own /public assets
  try {
    const { protocol, hostname } = new URL(src);
    return protocol === "https:" && OPTIMISABLE_IMAGE_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}
