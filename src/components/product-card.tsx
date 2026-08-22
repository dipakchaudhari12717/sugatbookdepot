"use client";

import { MediaImage } from "@/components/media-image";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { useCart } from "@/lib/cart-context";
import { useToast } from "@/lib/toast-context";
import type { Product } from "@/lib/types";
import { cn, formatPrice, hasDevanagari } from "@/lib/utils";

/** Categories whose products are objects, not books — no page-edge striping. */
const OBJECT_CATEGORIES = new Set(["statues", "stationery", "chivar"]);

export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: Product;
  priority?: boolean;
  className?: string;
}) {
  const { add, toggleWishlist, inWishlist } = useCart();
  const toast = useToast();
  const [adding, setAdding] = useState(false);

  const isObject = OBJECT_CATEGORIES.has(product.category);
  const wished = inWishlist(product.id);
  const soldOut = !product.inStock || product.stock <= 0;
  // Products with options (the Chivar has size + colour) must be configured on
  // the detail page rather than added straight from the grid.
  const needsOptions = product.options.length > 0;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    add(product, 1);
    toast(`${product.title} added to your bag`);
    setTimeout(() => setAdding(false), 700);
  }

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
    toast(wished ? "Removed from wishlist" : "Saved to your wishlist", "info");
  }

  return (
    <article className={cn("group/card flex h-full flex-col", className)}>
      <Link
        href={`/product/${product.slug}`}
        className="book-stage relative block focus:outline-none"
        aria-label={product.title}
      >
        <div
          className={cn(
            "book relative aspect-3/4 w-full",
            isObject && "book--object",
          )}
        >
          {product.image ? (
            <MediaImage
              src={product.image}
              alt={product.title}
              fill
              priority={priority}
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
              className={cn(
                "transition-transform duration-700 ease-[var(--ease-paper)]",
                // Same reasoning as the detail gallery: covers fill the tile,
                // photographed objects are fitted whole.
                isObject ? "object-contain" : "object-cover",
                "group-hover/card:scale-[1.04]",
              )}
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-paper-sunk text-ink-faint">
              <span className="text-xs">No image</span>
            </div>
          )}

          {/* Warm vignette so light covers still read against the cream page */}
          <div
            className="pointer-events-none absolute inset-0 z-1 opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
            style={{
              background:
                "linear-gradient(to top, rgba(36,29,22,0.34) 0%, rgba(36,29,22,0.04) 42%, transparent 70%)",
            }}
          />

          {/* Badges */}
          <div className="absolute left-4 top-2.5 z-3 flex flex-col items-start gap-1.5">
            {product.badge && (
              <span className="rounded-full bg-ink/85 px-2.5 py-1 text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-paper backdrop-blur-sm">
                {product.badge}
              </span>
            )}
            {product.discountPercent > 0 && (
              <span className="rounded-full bg-maroon px-2.5 py-1 text-[0.5625rem] font-bold uppercase tracking-[0.08em] text-white">
                {product.discountPercent}% off
              </span>
            )}
          </div>

          {soldOut && (
            <div className="absolute inset-0 z-3 flex items-center justify-center bg-paper/78 backdrop-blur-[1px]">
              <span className="rounded-full border border-rule-strong bg-paper-raised px-4 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-soft">
                Out of stock
              </span>
            </div>
          )}

          {/* Quick actions slide up on hover; always visible on touch */}
          <div
            className={cn(
              "absolute inset-x-2.5 bottom-2.5 z-3 flex items-center gap-2",
              "translate-y-2 opacity-0 transition-all duration-300 ease-[var(--ease-paper)]",
              "group-hover/card:translate-y-0 group-hover/card:opacity-100",
              "group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100",
              "max-md:translate-y-0 max-md:opacity-100",
            )}
          >
            {!soldOut &&
              (needsOptions ? (
                <span className="flex h-9 flex-1 items-center justify-center rounded-full bg-paper-raised/95 text-xs font-medium text-ink shadow-page backdrop-blur">
                  Choose options
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleAdd}
                  className={cn(
                    "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-medium shadow-page backdrop-blur transition-colors",
                    adding
                      ? "bg-leaf text-white"
                      : "bg-paper-raised/95 text-ink hover:bg-saffron hover:text-white",
                  )}
                >
                  <ShoppingBag className="size-3.5" aria-hidden />
                  {adding ? "Added" : "Add to bag"}
                </button>
              ))}
            <button
              type="button"
              onClick={handleWishlist}
              aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
              aria-pressed={wished}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full shadow-page backdrop-blur transition-colors",
                wished
                  ? "bg-maroon text-white"
                  : "bg-paper-raised/95 text-ink-soft hover:text-maroon",
              )}
            >
              <Heart className={cn("size-3.5", wished && "fill-current")} aria-hidden />
            </button>
          </div>
        </div>
      </Link>

      {/* Meta */}
      <div className="mt-4 flex flex-1 flex-col">
        {(product.author || product.brand) && (
          <p className="mb-1 truncate text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-saffron-deep">
            {product.author ?? product.brand}
          </p>
        )}

        {/*
          The shop's customers know these books by their Marathi and Hindi
          names, so that title leads and the English sits under it in a smaller
          face. Both stay inside the heading, so the card still announces itself
          by both names to a screen reader and to a search engine.

          Where a book has no Devanagari title recorded, the English one leads
          on its own rather than leaving the card without a heading.
        */}
        <h3 className="font-display font-semibold text-ink transition-colors group-hover/card:text-saffron-deep">
          <Link href={`/product/${product.slug}`} className="block">
            {product.titleMr ? (
              <>
                <span className="deva deva-lead line-clamp-2 block text-[1.0625rem]">
                  {product.titleMr}
                </span>
                <span className="mt-1 line-clamp-1 block text-[0.8125rem] leading-snug font-medium text-ink-soft">
                  {product.title}
                </span>
              </>
            ) : (
              <span
                className={cn(
                  "line-clamp-2 block text-[0.9375rem] leading-snug",
                  hasDevanagari(product.title) && "deva",
                )}
              >
                {product.title}
              </span>
            )}
          </Link>
        </h3>

        {product.subtitle && (
          <p className="mt-1 line-clamp-1 text-xs text-ink-faint">{product.subtitle}</p>
        )}

        <div className="mt-auto flex items-baseline gap-2 pt-3">
          <span className="font-display text-lg font-semibold text-ink">
            {formatPrice(product.price)}
          </span>
          {product.salePrice != null && (
            <span className="text-xs text-ink-faint line-through">{formatPrice(product.mrp)}</span>
          )}
        </div>

        {product.language && (
          <p className="mt-1 text-[0.6875rem] text-ink-faint">{product.language}</p>
        )}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="skeleton aspect-3/4 w-full rounded-sm" />
      <div className="skeleton mt-4 h-2.5 w-1/3 rounded-full" />
      <div className="skeleton mt-2.5 h-3.5 w-full rounded-full" />
      <div className="skeleton mt-2 h-3.5 w-2/3 rounded-full" />
      <div className="skeleton mt-3.5 h-4 w-20 rounded-full" />
    </div>
  );
}
