"use client";

import Link from "next/link";

import { useCatalog } from "@/lib/catalog-context";
import { BrandBanner } from "./brand-logo";

/**
 * The shopfront sign, at the top of the home page hero.
 *
 * The artwork is a wide sign — 1063 x 373, near enough 2.85:1 — carrying the
 * shop name, phone and address. Shown one to a row it reads as a letterhead
 * across the top of the page, which is what the shopfront itself looks like.
 * Stacking two of them turned that into a tall narrow block hugging the left
 * margin, so `both` now sits them side by side on a wide screen and only falls
 * back to stacking on a phone, where there is no room for two.
 *
 * Width is capped rather than height: the sign has to stay wide enough for the
 * phone number and address to be legible.
 *
 * Which version appears is a shop setting, changeable from Admin → Settings
 * without touching code.
 */
export function TopBanner() {
  const { settings } = useCatalog();
  const lang = settings.bannerLang ?? "en";

  if (lang === "off") return null;

  const langs: ("mr" | "en")[] = lang === "both" ? ["mr", "en"] : [lang];
  const single = langs.length === 1;

  return (
    <Link
      href="/"
      aria-label="Sugat Book Depot — Buddhist Literature, Dr. Ambedkar Road, Nagpur"
      className={
        "mx-auto block overflow-hidden rounded-xl border border-rule bg-white p-1.5 " +
        "shadow-page transition-shadow hover:shadow-lift " +
        // Centred, and capped by width rather than height: the sign has to stay
        // wide enough to read the phone number and address off. Left at the
        // container's full width it would be over 400px tall and swamp the
        // headline underneath.
        (single ? "w-full max-w-2xl lg:max-w-3xl" : "w-full max-w-md sm:max-w-3xl")
      }
    >
      <span className={single ? "block" : "flex flex-col gap-1.5 sm:flex-row sm:gap-2"}>
        {langs.map((l) => (
          <BrandBanner key={l} lang={l} priority className="h-auto w-full min-w-0" />
        ))}
      </span>
    </Link>
  );
}
