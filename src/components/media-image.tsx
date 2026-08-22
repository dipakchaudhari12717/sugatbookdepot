"use client";

import Image from "next/image";
import { useState } from "react";

import { isOptimisableImage } from "@/lib/image-hosts.mjs";
import { isInlineImage } from "@/lib/media";

/**
 * Renders an image that may be a remote URL, a stored data URI, or — because
 * the admin panel accepts a pasted link — something that is not an image at
 * all.
 *
 * Three routes, in order of preference:
 *
 *   1. next/image, for our own assets and the hosts listed in image-hosts.mjs.
 *   2. a plain <img>, for anything else. Uploaded images are Firestore data
 *      URIs the optimiser cannot touch, and an unrecognised host would make it
 *      answer 400, so both skip it and still display.
 *   3. nothing, once the browser reports the source will not load.
 *
 * That last step matters more than it looks. A banner was once saved with a
 * link to the Hostinger builder rather than to an image; next/image threw on
 * the unconfigured host and took the whole home page down with it. A picture
 * that fails to load should cost its own space and nothing else.
 */
export function MediaImage({
  src,
  alt,
  className,
  sizes,
  width,
  height,
  fill,
  priority,
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  style?: React.CSSProperties;
}) {
  // Keyed on src so swapping the source (colour swatches, gallery) retries.
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === src) return null;

  // `fill` positions against the nearest positioned ancestor, matching what
  // next/image does, so callers can swap between the two freely.
  const rawStyle = fill
    ? ({ position: "absolute", inset: 0, width: "100%", height: "100%", ...style } as const)
    : style;

  if (isInlineImage(src) || !isOptimisableImage(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        loading={priority ? "eager" : "lazy"}
        onError={() => setFailed(src)}
        style={rawStyle}
      />
    );
  }

  const common = {
    src,
    alt,
    sizes,
    className,
    priority,
    style,
    onError: () => setFailed(src),
  };

  return fill ? (
    <Image {...common} fill />
  ) : (
    <Image {...common} width={width ?? 800} height={height ?? 600} />
  );
}
