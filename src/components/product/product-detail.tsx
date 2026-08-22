"use client";

import { MediaImage } from "@/components/media-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Heart,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useCart } from "@/lib/cart-context";
import { useCatalog } from "@/lib/catalog-context";
import { useToast } from "@/lib/toast-context";
import { cn, formatPrice, hasDevanagari } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/brand-icons";
import { ProductCard } from "@/components/product-card";
import { Badge, Button, LinkButton, Reveal, SectionHeading, Spinner } from "@/components/ui";

const OBJECT_CATEGORIES = new Set(["statues", "stationery", "chivar"]);

/** Option groups rendered as colour swatches rather than text pills. */
const COLOUR_OPTIONS = new Set(["color", "colour", "shade"]);

/** Approximate dye colours for the robe shades we stock. */
const SWATCH: Record<string, string> = {
  orange: "#E07B21",
  brown: "#6B2F28",
  yellow: "#E8A81C",
  maroon: "#7B2D26",
  saffron: "#C2661A",
};

function swatchColour(value: string) {
  return SWATCH[value.trim().toLowerCase()] ?? "#C9BCA6";
}

export function ProductDetail({ slug }: { slug: string }) {
  const { bySlug, products, categoryBySlug, loading, settings } = useCatalog();
  const { add, toggleWishlist, inWishlist } = useCart();
  const toast = useToast();

  const product = bySlug.get(slug);

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [added, setAdded] = useState(false);

  // Default every option group to its first value so "Add to bag" is never a
  // dead end, and reset when navigating between products.
  useEffect(() => {
    if (!product) return;
    const defaults: Record<string, string> = {};
    for (const opt of product.options) {
      if (opt.values.length) defaults[opt.title] = opt.values[0];
    }
    setSelected(defaults);
    setActiveImage(0);
    setQuantity(1);
  }, [product]);

  /**
   * When a product groups its photographs by an option value (the Chivar has
   * separate shots per robe colour), show only that value's photographs.
   * Falls back to the full set for everything else.
   */
  const images = useMemo(() => {
    const all = product?.images?.length
      ? product.images
      : product?.image
        ? [product.image]
        : [];
    const groups = product?.optionImages;
    if (!groups) return all;

    for (const [optionTitle, byValue] of Object.entries(groups)) {
      const chosen = selected[optionTitle];
      const forValue = chosen ? byValue?.[chosen] : null;
      if (forValue?.length) return forValue;
    }
    return all;
  }, [product, selected]);

  // Swapping colour swaps the gallery, so jump back to its first photograph
  // rather than leaving a stale (or out-of-range) index selected.
  useEffect(() => {
    setActiveImage(0);
  }, [images]);

  const related = useMemo(() => {
    if (!product) return [];
    const others = products.filter((p) => p.id !== product.id);
    const sameAuthor = product.author ? others.filter((p) => p.author === product.author) : [];
    const sameCategory = others.filter((p) => p.category === product.category);
    // Thin categories (Chivar and the statue are one-of-a-kind) would otherwise
    // show nothing, so top up with featured titles from the wider catalogue.
    const topUp = others.filter((p) => p.featured || p.badge?.toLowerCase().includes("best"));
    const merged = [...sameAuthor, ...sameCategory, ...topUp];
    return [...new Map(merged.map((p) => [p.id, p])).values()].slice(0, 6);
  }, [product, products]);

  if (loading && !product) {
    return (
      <div className="container-page flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  }

  if (!product) notFound();

  const category = categoryBySlug.get(product.category);
  const wished = inWishlist(product.id);
  const soldOut = !product.inStock || product.stock <= 0;
  const lowStock = !soldOut && product.stock <= 5;
  const isObject = OBJECT_CATEGORIES.has(product.category);

  function handleAdd() {
    if (!product) return;
    // Carry the selected colour's photograph into the cart line, so the bag
    // does not show an orange robe next to "Color: Brown".
    add({ ...product, image: images[0] ?? product.image }, quantity, selected);
    setAdded(true);
    toast(
      quantity > 1
        ? `${quantity} × ${product.title} added to your bag`
        : `${product.title} added to your bag`,
    );
    setTimeout(() => setAdded(false), 1600);
  }

  async function share() {
    if (!product) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast("Link copied to clipboard", "info");
      }
    } catch {
      /* user dismissed the share sheet */
    }
  }

  const specs = [
    ["Author", product.author],
    ["Language", product.language],
    ["Publisher", product.publisher],
    ["Binding", product.binding],
    ["Brand", product.brand],
    ["Material", product.material],
    ["SKU", product.sku],
  ].filter(([, v]) => Boolean(v)) as [string, string][];

  const bulkHref = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
    `Hello, I'd like a quote for a bulk order of "${product.title}".`,
  )}`;

  return (
    <div className="container-page py-8 lg:py-12">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-ink-faint">
        <Link href="/" className="transition hover:text-ink">
          Home
        </Link>
        <ChevronRight className="size-3" />
        <Link href="/shop" className="transition hover:text-ink">
          Shop
        </Link>
        {category && (
          <>
            <ChevronRight className="size-3" />
            <Link href={`/shop?category=${category.slug}`} className="transition hover:text-ink">
              {category.name}
            </Link>
          </>
        )}
        <ChevronRight className="size-3" />
        <span className="line-clamp-1 text-ink">{product.title}</span>
      </nav>

      <div className="mt-7 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        {/* ---------------- Gallery ---------------- */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="flex flex-row-reverse gap-3 sm:gap-4">
            <div className="min-w-0 flex-1 book-stage">
            <div
              className={cn(
                "book relative aspect-4/5 w-full overflow-hidden",
                isObject && "book--object",
              )}
            >
              {images[activeImage] ? (
                <MediaImage
                  key={images[activeImage]}
                  src={images[activeImage]}
                  alt={`${product.title} — image ${activeImage + 1}`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  // A book cover fills the 4:5 stage, so cropping it is fine.
                  // Robes, statues and pens are photographed square or
                  // landscape — covering them lops 20% off the subject, so
                  // those are fitted whole against the stage instead.
                  className={isObject ? "object-contain" : "object-cover"}
                  style={{ animation: "fade 0.35s var(--ease-paper)" }}
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-paper-sunk text-ink-faint">
                  No image
                </div>
              )}

              <div className="absolute left-5 top-3.5 z-3 flex flex-col items-start gap-1.5">
                {product.badge && (
                  <span className="rounded-full bg-ink/85 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-paper backdrop-blur-sm">
                    {product.badge}
                  </span>
                )}
                {product.discountPercent > 0 && (
                  <span className="rounded-full bg-maroon px-3 py-1 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-white">
                    {product.discountPercent}% off
                  </span>
                )}
              </div>
            </div>
            </div>

            {/* Thumbnail rail — vertical, to the left of the main image.
                Scrolls independently when a product has many photographs. */}
            {images.length > 1 && (
              <div className="no-scrollbar flex max-h-[34rem] w-16 shrink-0 flex-col gap-2.5 overflow-y-auto sm:w-20">
                {images.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    aria-label={`View image ${i + 1}`}
                    aria-current={i === activeImage}
                    className={cn(
                      "relative aspect-3/4 w-full shrink-0 overflow-hidden rounded-md border-2 transition",
                      i === activeImage
                        ? "border-saffron"
                        : "border-transparent opacity-65 hover:opacity-100",
                    )}
                  >
                    <MediaImage
                      src={src}
                      alt=""
                      fill
                      sizes="80px"
                      className={isObject ? "object-contain" : "object-cover"}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---------------- Buy box ---------------- */}
        <div>
          {product.author && (
            <Link
              href={`/shop?q=${encodeURIComponent(product.author)}`}
              className="eyebrow transition hover:text-maroon"
            >
              {product.author}
            </Link>
          )}

          <h1
            className={cn(
              "mt-3 font-display text-3xl leading-tight font-semibold text-ink sm:text-4xl",
              hasDevanagari(product.title) && "deva",
            )}
          >
            {product.title}
          </h1>

          {product.titleMr && (
            <p className="deva mt-1.5 font-display text-2xl leading-snug text-ink-soft sm:text-3xl">
              {product.titleMr}
            </p>
          )}

          {product.subtitle && (
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">{product.subtitle}</p>
          )}

          {/* Price */}
          <div className="mt-6 flex flex-wrap items-baseline gap-3">
            <span className="font-display text-4xl font-semibold text-ink">
              {formatPrice(product.price)}
            </span>
            {product.salePrice != null && (
              <>
                <span className="text-lg text-ink-faint line-through">
                  {formatPrice(product.mrp)}
                </span>
                <Badge tone="leaf">Save {formatPrice(product.mrp - product.salePrice)}</Badge>
              </>
            )}
          </div>
          <p className="mt-1.5 text-xs text-ink-faint">Inclusive of all taxes</p>

          {/* Stock */}
          <div className="mt-5">
            {soldOut ? (
              <p className="inline-flex items-center gap-2 rounded-full bg-paper-sunk px-3 py-1.5 text-[0.8125rem] font-medium text-ink-soft">
                <span className="size-1.5 rounded-full bg-ink-faint" /> Out of stock
              </p>
            ) : lowStock ? (
              <p className="inline-flex items-center gap-2 rounded-full bg-maroon/8 px-3 py-1.5 text-[0.8125rem] font-medium text-maroon">
                <span className="size-1.5 animate-pulse rounded-full bg-maroon" />
                Only {product.stock} left
              </p>
            ) : (
              <p className="inline-flex items-center gap-2 rounded-full bg-leaf/8 px-3 py-1.5 text-[0.8125rem] font-medium text-leaf">
                <span className="size-1.5 rounded-full bg-leaf" /> In stock
              </p>
            )}
          </div>

          {/* Options */}
          {product.options.map((opt) => {
            const isColour = COLOUR_OPTIONS.has(opt.title.trim().toLowerCase());
            return (
              <div key={opt.title} className="mt-6">
                <p className="mb-2.5 text-[0.8125rem] font-medium text-ink">
                  {opt.title}
                  <span className="ml-2 font-normal text-ink-faint">{selected[opt.title]}</span>
                </p>

                {isColour ? (
                  <div className="flex flex-wrap gap-3">
                    {opt.values.map((value) => {
                      const active = selected[opt.title] === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSelected((prev) => ({ ...prev, [opt.title]: value }))}
                          aria-pressed={active}
                          aria-label={`${opt.title}: ${value}`}
                          title={value}
                          className="group flex flex-col items-center gap-1.5"
                        >
                          <span
                            className={cn(
                              "flex size-11 items-center justify-center rounded-full border-2 transition-all duration-200",
                              active
                                ? "border-saffron ring-2 ring-saffron/25"
                                : "border-rule-strong group-hover:border-saffron/60",
                            )}
                          >
                            <span
                              className="size-8 rounded-full shadow-[inset_0_2px_5px_rgba(0,0,0,0.22)]"
                              style={{ backgroundColor: swatchColour(value) }}
                            />
                          </span>
                          <span
                            className={cn(
                              "text-[0.6875rem] font-medium transition-colors",
                              active ? "text-saffron-deep" : "text-ink-faint group-hover:text-ink",
                            )}
                          >
                            {value}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {opt.values.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSelected((prev) => ({ ...prev, [opt.title]: value }))}
                        className={cn(
                          "rounded-full border px-4 py-2 text-[0.8125rem] font-medium transition",
                          selected[opt.title] === value
                            ? "border-saffron bg-saffron-wash text-saffron-deep"
                            : "border-rule-strong bg-paper-raised text-ink-soft hover:border-saffron/60 hover:text-ink",
                        )}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Quantity + add */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border border-rule-strong bg-paper-raised">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || soldOut}
                className="flex size-11 items-center justify-center rounded-l-full text-ink-soft transition hover:text-ink disabled:opacity-35"
                aria-label="Decrease quantity"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-9 text-center text-sm font-semibold tabular-nums text-ink">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))}
                disabled={soldOut || quantity >= (product.stock || 99)}
                className="flex size-11 items-center justify-center rounded-r-full text-ink-soft transition hover:text-ink disabled:opacity-35"
                aria-label="Increase quantity"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <Button
              size="lg"
              onClick={handleAdd}
              disabled={soldOut}
              className={cn("flex-1 min-w-44", added && "bg-leaf hover:bg-leaf")}
            >
              <ShoppingBag className="size-4" />
              {soldOut ? "Out of stock" : added ? "Added to bag" : "Add to bag"}
            </Button>

            <button
              type="button"
              onClick={() => {
                toggleWishlist(product.id);
                toast(wished ? "Removed from wishlist" : "Saved to your wishlist", "info");
              }}
              aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
              aria-pressed={wished}
              className={cn(
                "flex size-13 items-center justify-center rounded-full border transition",
                wished
                  ? "border-maroon bg-maroon text-white"
                  : "border-rule-strong bg-paper-raised text-ink-soft hover:border-maroon hover:text-maroon",
              )}
            >
              <Heart className={cn("size-[1.15rem]", wished && "fill-current")} />
            </button>

            <button
              type="button"
              onClick={share}
              aria-label="Share this product"
              className="flex size-13 items-center justify-center rounded-full border border-rule-strong bg-paper-raised text-ink-soft transition hover:border-saffron hover:text-saffron-deep"
            >
              <Share2 className="size-[1.15rem]" />
            </button>
          </div>

          {!soldOut && (
            <LinkButton href="/cart" variant="secondary" size="lg" full className="mt-3">
              Go to bag
            </LinkButton>
          )}

          {/* Bulk enquiry (FR-11.3) */}
          {product.bulkEnquiry && (
            <a
              href={bulkHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-3 rounded-xl border border-leaf/25 bg-leaf/6 px-4 py-3.5 transition hover:border-leaf/50"
            >
              <WhatsAppIcon className="size-5 shrink-0 text-leaf" />
              <span className="flex-1 text-sm text-ink-soft">
                <span className="font-medium text-ink">Ordering for a vihara or institution?</span>{" "}
                Message us for bulk pricing.
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink-faint" />
            </a>
          )}

          {/* Reassurance */}
          <div className="mt-7 grid gap-3.5 border-t border-rule pt-7 sm:grid-cols-2">
            {[
              [Truck, "Delivered across India", `Free above ${formatPrice(settings.freeShippingThreshold)}`],
              [ShieldCheck, "Secure checkout", "UPI, cards & COD"],
              [Package, "Carefully packed", "Books wrapped to arrive intact"],
              [RefreshCw, "Easy returns", "Report damage within 7 days"],
            ].map(([Icon, title, sub]) => {
              const I = Icon as typeof Truck;
              return (
                <div key={title as string} className="flex items-start gap-2.5">
                  <I className="mt-0.5 size-4 shrink-0 text-saffron" aria-hidden />
                  <div>
                    <p className="text-[0.8125rem] font-medium text-ink">{title as string}</p>
                    <p className="text-xs text-ink-faint">{sub as string}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Description */}
          {product.descriptionHtml && (
            <div className="mt-9 border-t border-rule pt-7">
              <h2 className="mb-4 font-display text-xl font-semibold text-ink">About this title</h2>
              <div
                className="prose-book text-[0.9375rem]"
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />
            </div>
          )}

          {/* Specs */}
          {specs.length > 0 && (
            <div className="mt-9 border-t border-rule pt-7">
              <h2 className="mb-4 font-display text-xl font-semibold text-ink">Details</h2>
              <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {specs.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-rule/60 pb-2.5">
                    <dt className="text-[0.8125rem] text-ink-faint">{label}</dt>
                    <dd className="text-right text-[0.8125rem] font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Size guide (FR-11.4) */}
          {product.sizeGuide && product.sizeGuide.length > 0 && (
            <div className="mt-9 border-t border-rule pt-7">
              <h2 className="mb-4 font-display text-xl font-semibold text-ink">Size guide</h2>
              <div className="overflow-hidden rounded-xl border border-rule">
                {product.sizeGuide.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col gap-1 border-b border-rule bg-paper-raised px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-6"
                  >
                    <span className="w-48 shrink-0 text-[0.8125rem] font-medium text-ink">
                      {row.label}
                    </span>
                    <span className="text-[0.8125rem] text-ink-soft">{row.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Care */}
          {product.care && (
            <div className="mt-9 border-t border-rule pt-7">
              <h2 className="mb-3 font-display text-xl font-semibold text-ink">Care instructions</h2>
              <p className="text-[0.9375rem] leading-relaxed text-ink-soft">{product.care}</p>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- Related ---------------- */}
      {related.length > 0 && (
        <section className="mt-24">
          <Reveal>
            <SectionHeading
              eyebrow="You may also like"
              title="From the same shelf"
              action={
                category ? (
                  <LinkButton href={`/shop?category=${category.slug}`} variant="secondary" size="sm">
                    All {category.shortName}
                  </LinkButton>
                ) : undefined
              }
            />
          </Reveal>
          <div className="shelf mt-10 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
            {related.map((p, i) => (
              <Reveal key={p.id} delay={i * 50}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
