"use client";

import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The Sugat mark.
 *
 * The artwork lives in /public/brand/. Until those files are dropped in, this
 * falls back to the typographic wordmark, so the header never renders a broken
 * image. A plain <img> is used rather than next/image precisely so the error
 * handler can catch a missing file.
 */
export const LOGO_SRC = "/brand/sugat-logo.png";

export function BrandLogo({
  className,
  showWordmark = true,
  size = 40,
}: {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)} aria-label="Sugat Book Depot — home">
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={LOGO_SRC}
          alt=""
          width={size}
          height={size}
          onError={() => setFailed(true)}
          className="shrink-0 object-contain transition-transform duration-300 group-hover:scale-105"
          style={{ width: size, height: size }}
        />
      )}

      {(showWordmark || failed) && (
        <span className="flex items-baseline gap-2">
          <span className="font-display text-xl leading-none font-semibold tracking-tight text-ink transition-colors group-hover:text-brand sm:text-2xl">
            Sugat
          </span>
          <span className="hidden text-[0.5625rem] font-semibold uppercase leading-none tracking-[0.24em] text-brand sm:inline">
            Book Depot
          </span>
        </span>
      )}
    </Link>
  );
}

/**
 * The shopfront banner. She has it in Marathi and English; `lang` picks one.
 * Renders nothing at all if the file is absent, so it can be committed ahead of
 * the artwork arriving.
 */
export function BrandBanner({
  lang = "en",
  className,
  priority = false,
}: {
  lang?: "en" | "mr";
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/brand/sugat-banner-${lang}.png`}
      alt="Sugat Book Depot — Buddhist Literature, Dr. Ambedkar Road, Nagpur"
      onError={() => setFailed(true)}
      loading={priority ? "eager" : "lazy"}
      className={cn("w-full object-contain", className)}
    />
  );
}
