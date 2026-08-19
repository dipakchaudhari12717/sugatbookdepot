"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The Sugat mark.
 *
 * The artwork lives in /public/brand/. Until those files are dropped in, this
 * falls back to the typographic wordmark, so the header never renders a broken
 * or empty image. A plain <img> is used rather than next/image precisely so we
 * can detect the failure ourselves.
 */
export const LOGO_SRC = "/brand/sugat-logo.png";

/**
 * Detect a broken image, including the case React's `onError` misses.
 *
 * The server sends the <img> in the initial HTML, so the browser can finish
 * loading (and failing) it before React hydrates and attaches a handler — the
 * error event is gone by then and the element sits there as an empty box. So we
 * also check on mount: a finished load with `naturalWidth === 0` is a failure.
 */
function useBrokenImage() {
  const ref = useRef<HTMLImageElement>(null);
  const [broken, setBroken] = useState(false);
  const markBroken = useCallback(() => setBroken(true), []);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setBroken(true);
  }, []);

  return { ref, broken, markBroken };
}

export function BrandLogo({
  className,
  showWordmark = true,
  size = 40,
}: {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}) {
  const { ref, broken, markBroken } = useBrokenImage();

  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-2.5", className)}
      aria-label="Sugat Book Depot — home"
    >
      {!broken && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={ref}
          src={LOGO_SRC}
          alt=""
          width={size}
          height={size}
          onError={markBroken}
          className="shrink-0 object-contain transition-transform duration-300 group-hover:scale-105"
          style={{ width: size, height: size }}
        />
      )}

      {/* The wordmark always shows when the artwork is missing, so the header
          never collapses to an empty space. */}
      {(showWordmark || broken) && (
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
 * The shopfront banner, in Marathi or English. Renders nothing at all while its
 * file is absent, so this can ship ahead of the artwork arriving.
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
  const { ref, broken, markBroken } = useBrokenImage();
  if (broken) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={`/brand/sugat-banner-${lang}.png`}
      alt="Sugat Book Depot — Buddhist Literature, Dr. Ambedkar Road, Nagpur"
      onError={markBroken}
      loading={priority ? "eager" : "lazy"}
      className={cn("w-full object-contain", className)}
    />
  );
}
