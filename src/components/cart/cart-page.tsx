"use client";

import { MediaImage } from "@/components/media-image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Tag, Trash2, Truck, X } from "lucide-react";
import { useState } from "react";

import { useCart } from "@/lib/cart-context";
import { useCatalog } from "@/lib/catalog-context";
import { isFirebaseConfigured } from "@/lib/firebase";
import { evaluateCoupon, findCoupon } from "@/lib/repo";
import { useToast } from "@/lib/toast-context";
import type { Coupon } from "@/lib/types";
import { cn, formatPrice, hasDevanagari } from "@/lib/utils";
import { Button, EmptyState, Input, LinkButton, Spinner } from "@/components/ui";

export function CartPage() {
  const { lines, subtotal, savings, setQuantity, remove, ready } = useCart();
  const { settings } = useCatalog();
  const toast = useToast();

  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const { discount } = evaluateCoupon(coupon, subtotal);
  const afterDiscount = subtotal - discount;
  const shipping =
    afterDiscount >= settings.freeShippingThreshold || afterDiscount === 0
      ? 0
      : settings.shippingFlatRate;
  const total = afterDiscount + shipping;
  const awayFromFreeShipping = Math.max(0, settings.freeShippingThreshold - afterDiscount);

  async function applyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    if (!isFirebaseConfigured) {
      setCouponError("Coupons need the Firebase connection to be configured.");
      return;
    }
    setChecking(true);
    setCouponError(null);
    try {
      const found = await findCoupon(code);
      const { error } = evaluateCoupon(found, subtotal);
      if (error) {
        setCoupon(null);
        setCouponError(error);
      } else {
        setCoupon(found);
        toast(`Coupon ${found!.code} applied`);
      }
    } catch {
      setCouponError("Could not check that code right now.");
    } finally {
      setChecking(false);
    }
  }

  if (!ready) {
    return (
      <div className="container-page flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container-page py-16">
        <h1 className="rule-ornament font-display text-3xl font-semibold text-ink sm:text-4xl">
          Your bag
        </h1>
        <div className="mt-10">
          <EmptyState
            icon={<ShoppingBag className="size-6" />}
            title="Your bag is empty"
            description="Browse the collection and add a few titles — books, Chivar and stationery can all travel together."
            action={<LinkButton href="/shop">Start browsing</LinkButton>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10 lg:py-14">
      <h1 className="rule-ornament font-display text-3xl font-semibold text-ink sm:text-4xl">
        Your bag
      </h1>
      <p className="mt-4 text-sm text-ink-soft">
        {lines.length} {lines.length === 1 ? "item" : "items"} ready to go.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
        {/* ---------------- Lines ---------------- */}
        <ul className="divide-y divide-rule border-y border-rule">
          {lines.map((line) => (
            <li key={line.lineId} className="flex gap-4 py-5 sm:gap-5">
              <Link
                href={`/product/${line.slug}`}
                className="relative h-28 w-20 shrink-0 overflow-hidden rounded-sm bg-paper-sunk shadow-page sm:h-32 sm:w-24"
              >
                {line.image && (
                  <MediaImage src={line.image} alt="" fill sizes="96px" className="object-cover" />
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/product/${line.slug}`}
                      className={cn(
                        "font-display text-[0.9375rem] leading-snug font-semibold text-ink transition hover:text-saffron-deep",
                        hasDevanagari(line.title) && "deva",
                      )}
                    >
                      {line.title}
                    </Link>
                    {Object.entries(line.selectedOptions).length > 0 && (
                      <p className="mt-1 text-xs text-ink-faint">
                        {Object.entries(line.selectedOptions)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(line.lineId)}
                    aria-label={`Remove ${line.title}`}
                    className="-m-1.5 shrink-0 rounded-lg p-1.5 text-ink-faint transition hover:bg-paper-sunk hover:text-maroon"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                  <div className="flex items-center rounded-full border border-rule-strong bg-paper-raised">
                    <button
                      type="button"
                      onClick={() => setQuantity(line.lineId, line.quantity - 1)}
                      className="flex size-9 items-center justify-center rounded-l-full text-ink-soft transition hover:text-ink"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-8 text-center text-[0.8125rem] font-semibold tabular-nums text-ink">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.lineId, line.quantity + 1)}
                      disabled={line.quantity >= line.maxStock}
                      className="flex size-9 items-center justify-center rounded-r-full text-ink-soft transition hover:text-ink disabled:opacity-35"
                      aria-label="Increase quantity"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>

                  <div className="text-right">
                    <p className="font-display text-base font-semibold text-ink">
                      {formatPrice(line.price * line.quantity)}
                    </p>
                    {line.mrp > line.price && (
                      <p className="text-xs text-ink-faint line-through">
                        {formatPrice(line.mrp * line.quantity)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* ---------------- Summary ---------------- */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border border-rule bg-paper-raised p-6 shadow-page">
            <h2 className="font-display text-lg font-semibold text-ink">Order summary</h2>

            {/* Free shipping nudge */}
            {shipping > 0 && (
              <div className="mt-4 rounded-xl bg-saffron-wash px-3.5 py-3">
                <p className="flex items-start gap-2 text-xs text-saffron-deep">
                  <Truck className="mt-0.5 size-3.5 shrink-0" />
                  Add {formatPrice(awayFromFreeShipping)} more for free delivery.
                </p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/60">
                  <div
                    className="h-full rounded-full bg-saffron transition-all duration-500 ease-[var(--ease-paper)]"
                    style={{
                      width: `${Math.min(100, (afterDiscount / settings.freeShippingThreshold) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <dl className="mt-5 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="font-medium text-ink">{formatPrice(subtotal)}</dd>
              </div>
              {savings > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Catalogue savings</dt>
                  <dd className="font-medium text-leaf">−{formatPrice(savings)}</dd>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between">
                  <dt className="flex items-center gap-1.5 text-ink-soft">
                    Coupon {coupon?.code}
                    <button
                      type="button"
                      onClick={() => {
                        setCoupon(null);
                        setCode("");
                      }}
                      aria-label="Remove coupon"
                      className="text-ink-faint transition hover:text-maroon"
                    >
                      <X className="size-3" />
                    </button>
                  </dt>
                  <dd className="font-medium text-leaf">−{formatPrice(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-soft">Delivery</dt>
                <dd className="font-medium text-ink">
                  {shipping === 0 ? <span className="text-leaf">Free</span> : formatPrice(shipping)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-rule pt-3.5">
                <dt className="font-display text-base font-semibold text-ink">Total</dt>
                <dd className="font-display text-xl font-semibold text-ink">{formatPrice(total)}</dd>
              </div>
            </dl>

            {/* Coupon */}
            <form onSubmit={applyCoupon} className="mt-5">
              <label htmlFor="coupon" className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink">
                <Tag className="size-3.5 text-ink-faint" /> Have a coupon?
              </label>
              <div className="flex gap-2">
                <Input
                  id="coupon"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  placeholder="FESTIVE10"
                  className="h-10 uppercase"
                />
                <Button type="submit" variant="secondary" size="sm" loading={checking}>
                  Apply
                </Button>
              </div>
              {couponError && <p className="mt-1.5 text-xs text-maroon">{couponError}</p>}
            </form>

            <LinkButton href="/checkout" size="lg" full className="mt-6">
              Proceed to checkout
            </LinkButton>

            <Link
              href="/shop"
              className="mt-3 block text-center text-xs text-ink-faint transition hover:text-ink"
            >
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
