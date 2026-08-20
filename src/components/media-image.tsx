"use client";

import Image from "next/image";

import { isInlineImage } from "@/lib/media";

/**
 * Renders an image that may be either a remote URL or a stored data URI.
 *
 * Uploaded images live in Firestore as data URIs, which next/image cannot
 * optimise — it would try to route them through the optimiser and fail. Those
 * fall back to a plain <img>; remote URLs keep the full next/image treatment.
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
  if (isInlineImage(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        loading={priority ? "eager" : "lazy"}
        // `fill` positions against the nearest positioned ancestor, matching
        // what next/image does, so callers can swap between the two freely.
        style={
          fill
            ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style }
            : style
        }
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        priority={priority}
        style={style}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 800}
      height={height ?? 600}
      sizes={sizes}
      className={className}
      priority={priority}
      style={style}
    />
  );
}
