"use client";

import Link from "next/link";

import { useCatalog } from "@/lib/catalog-context";
import { BrandBanner } from "./brand-logo";

/**
 * The shopfront banner, at the top of the home page hero.
 *
 * The shop has the sign in Marathi and English and displays both on the
 * shopfront itself, so both is the default here — stacked in that order inside
 * one card. Which version appears is a shop setting, changeable from
 * Admin → Settings without touching code.
 *
 * The artwork is a wide sign (roughly 1070 × 373) carrying the shop name, phone
 * and address, so it is capped by width rather than stretched: the text stays
 * legible on a phone, and the card reads as a letterhead rather than a hero
 * image on a desktop.
 */
export function TopBanner() {
  const { settings } = useCatalog();
  const lang = settings.bannerLang ?? "both";

  if (lang === "off") return null;

  const langs: ("mr" | "en")[] = lang === "both" ? ["mr", "en"] : [lang];

  return (
    <div className="inline-block">
      <Link
        href="/"
        aria-label="Sugat Book Depot — Buddhist Literature, Dr. Ambedkar Road, Nagpur"
        className="block overflow-hidden rounded-xl border border-rule bg-white p-2 shadow-page transition-shadow hover:shadow-lift"
      >
        <span className="flex flex-col gap-1.5">
          {langs.map((l) => (
            <BrandBanner
              key={l}
              lang={l}
              priority
              className="h-auto w-full max-w-[17rem] sm:max-w-xs"
            />
          ))}
        </span>
      </Link>
    </div>
  );
}
