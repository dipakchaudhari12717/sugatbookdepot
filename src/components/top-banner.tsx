"use client";

import Link from "next/link";

import { useCatalog } from "@/lib/catalog-context";
import { BrandBanner } from "./brand-logo";

/**
 * The shopfront banner, sitting at the top of the home page hero.
 *
 * Which language shows is a shop setting, so it can be switched from
 * Admin → Settings without a code change.
 *
 * The artwork is a wide sign (roughly 1070 × 373) carrying the shop name, phone
 * and address. At full width on a phone that text would be a few pixels tall
 * and unreadable, so it is capped by height rather than width and centred —
 * the sign keeps a sensible size on every screen, and the header underneath
 * does the real navigational work.
 */
export function TopBanner() {
  const { settings } = useCatalog();
  const lang = settings.bannerLang ?? "mr";

  if (lang === "off") return null;

  return (
    <div className="inline-block">
      <Link
        href="/"
        aria-label="Sugat Book Depot — Buddhist Literature, Dr. Ambedkar Road, Nagpur"
        className="block overflow-hidden rounded-xl border border-rule bg-white p-2 shadow-page transition-shadow hover:shadow-lift"
      >
        {/* On a phone the sign is capped by width, so the shop name, phone and
            address stay readable. On wider screens it is capped by height
            instead, so it reads as a letterhead rather than a hero image. */}
        <BrandBanner
          lang={lang}
          priority
          className="h-auto w-full max-w-xs sm:max-w-sm"
        />
      </Link>
    </div>
  );
}
