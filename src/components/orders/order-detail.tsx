"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { CheckCircle2, ChevronLeft, Copy, MapPin, Package, Truck } from "lucide-react";
import { useEffect, useState } from "react";

import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { useCatalog } from "@/lib/catalog-context";
import { useToast } from "@/lib/toast-context";
import type { Order } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/brand-icons";
import { OrderTracker, StatusPill } from "@/components/order-status";
import { Button, Card, EmptyState, LinkButton, Spinner } from "@/components/ui";

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on Delivery",
  upi: "UPI transfer",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Payable on delivery",
  awaiting_verification: "Awaiting payment verification",
  paid: "Paid",
  refunded: "Refunded",
  failed: "Payment failed",
};

export function OrderDetail({ orderId }: { orderId: string }) {
  const params = useSearchParams();
  const justPlaced = params.get("placed") === "1";
  const { settings } = useCatalog();
  const toast = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Live subscription so the customer sees status changes the moment the shop
  // updates them in the admin panel (FR-5.2).
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    return onSnapshot(
      doc(getDb(), "orders", orderId),
      (snap) => {
        setOrder(snap.exists() ? ({ ...(snap.data() as Order), id: snap.id }) : null);
        setLoading(false);
      },
      (err) => {
        console.error("[order] subscription failed", err);
        setLoading(false);
      },
    );
  }, [orderId]);

  if (loading) {
    return (
      <div className="container-page flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<Package className="size-6" />}
          title="We couldn't find that order"
          description="Please check the link or the order number from your confirmation email."
          action={<LinkButton href="/orders">Back to orders</LinkButton>}
        />
      </div>
    );
  }

  const whatsappHref = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
    `Hello, I have a question about order ${order.orderNumber}.`,
  )}`;

  return (
    <div className="container-page py-10 lg:py-14">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-xs text-ink-faint transition hover:text-ink"
      >
        <ChevronLeft className="size-3.5" /> All orders
      </Link>

      {/* Confirmation banner (FR-4.3) */}
      {justPlaced && (
        <div
          className="mt-5 flex items-start gap-3.5 rounded-2xl border border-leaf/25 bg-leaf/6 px-5 py-4"
          style={{ animation: "rise 0.5s var(--ease-paper)" }}
        >
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-leaf" />
          <div>
            <p className="font-display text-base font-semibold text-ink">
              Thank you — your order is placed
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              We've noted your order as <strong>{order.orderNumber}</strong>. Keep this number handy
              to track your delivery.
              {order.paymentMethod === "upi" &&
                " Once your UPI payment is verified we'll confirm and dispatch."}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">{order.orderNumber}</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Placed on {formatDate(order.createdAt)} · {order.lines.length}{" "}
            {order.lines.length === 1 ? "item" : "items"}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <StatusPill status={order.status} />
          <Button
            variant="quiet"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(order.orderNumber);
              toast("Order number copied", "info");
            }}
          >
            <Copy className="size-3.5" /> Copy
          </Button>
        </div>
      </div>

      <div className="mt-9 grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
        <div className="space-y-8">
          {/* Tracker */}
          <Card className="p-6">
            <h2 className="mb-6 font-display text-lg font-semibold text-ink">Delivery status</h2>
            <OrderTracker status={order.status} timeline={order.timeline} />

            {order.trackingNumber && (
              <div className="mt-6 flex items-start gap-3 rounded-xl bg-paper-sunk px-4 py-3.5">
                <Truck className="mt-0.5 size-4 shrink-0 text-saffron" />
                <div>
                  <p className="text-sm font-medium text-ink">
                    {order.trackingCarrier ?? "Courier"} · {order.trackingNumber}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    Use this number on the courier's website to follow your parcel.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Items */}
          <Card className="p-6">
            <h2 className="mb-5 font-display text-lg font-semibold text-ink">Items</h2>
            <ul className="divide-y divide-rule">
              {order.lines.map((line) => (
                <li key={line.lineId} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <Link
                    href={`/product/${line.slug}`}
                    className="relative h-20 w-14 shrink-0 overflow-hidden rounded-sm bg-paper-sunk shadow-page"
                  >
                    {line.image && (
                      <Image src={line.image} alt="" fill sizes="56px" className="object-cover" />
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${line.slug}`}
                      className="font-display text-[0.9375rem] font-semibold leading-snug text-ink transition hover:text-saffron-deep"
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
                    <p className="mt-1 text-xs text-ink-faint">Qty {line.quantity}</p>
                  </div>
                  <span className="shrink-0 font-display text-base font-semibold text-ink">
                    {formatPrice(line.price * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Address */}
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <MapPin className="size-4 text-saffron" /> Delivery address
            </h2>
            <address className="text-sm not-italic leading-relaxed text-ink-soft">
              <span className="font-medium text-ink">{order.address.fullName}</span>
              <br />
              {order.address.line1}
              {order.address.line2 && (
                <>
                  <br />
                  {order.address.line2}
                </>
              )}
              <br />
              {order.address.city}, {order.address.state} {order.address.pincode}
              {order.address.landmark && (
                <>
                  <br />
                  Landmark: {order.address.landmark}
                </>
              )}
              <br />
              <span className="mt-2 inline-block">{order.address.phone}</span>
              {" · "}
              {order.email}
            </address>

            {order.notes && (
              <div className="mt-5 rounded-xl bg-paper-sunk px-4 py-3">
                <p className="text-xs font-medium text-ink">Your note</p>
                <p className="mt-1 text-xs text-ink-soft">{order.notes}</p>
              </div>
            )}
          </Card>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Payment summary</h2>

            <dl className="mt-5 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="font-medium text-ink">{formatPrice(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">
                    Coupon {order.couponCode ? `(${order.couponCode})` : ""}
                  </dt>
                  <dd className="font-medium text-leaf">−{formatPrice(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-soft">Delivery</dt>
                <dd className="font-medium text-ink">
                  {order.shipping === 0 ? (
                    <span className="text-leaf">Free</span>
                  ) : (
                    formatPrice(order.shipping)
                  )}
                </dd>
              </div>
              <div className="flex justify-between border-t border-rule pt-3.5">
                <dt className="font-display text-base font-semibold text-ink">Total</dt>
                <dd className="font-display text-xl font-semibold text-ink">
                  {formatPrice(order.total)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 space-y-1.5 border-t border-rule pt-5 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-ink-faint">Method</span>
                <span className="text-right font-medium text-ink">
                  {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink-faint">Status</span>
                <span className="text-right font-medium text-ink">
                  {PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}
                </span>
              </div>
              {order.paymentReference && (
                <div className="flex justify-between gap-3">
                  <span className="text-ink-faint">Reference</span>
                  <span className="text-right font-medium text-ink">{order.paymentReference}</span>
                </div>
              )}
            </div>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-95"
            >
              <WhatsAppIcon className="size-4" /> Ask about this order
            </a>

            <LinkButton href="/shop" variant="ghost" size="sm" full className="mt-2">
              Continue shopping
            </LinkButton>
          </Card>
        </aside>
      </div>
    </div>
  );
}
