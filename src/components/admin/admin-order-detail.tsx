"use client";

import { MediaImage } from "@/components/media-image";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { ChevronLeft, Copy, FileText, MapPin, Printer, Truck, User, X } from "lucide-react";
import { useEffect, useState } from "react";

import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { useCatalog } from "@/lib/catalog-context";
import { decrementStockForOrder, updateOrder, updateOrderStatus } from "@/lib/repo";
import { useToast } from "@/lib/toast-context";
import { ORDER_STATUS_FLOW, type Order, type OrderStatus, type PaymentStatus } from "@/lib/types";
import { cn, formatDateTime, formatPrice } from "@/lib/utils";
import { OrderTracker, STATUS_LABEL, StatusPill } from "@/components/order-status";
import { Button, Card, Field, Input, Modal, Select, Spinner, Textarea } from "@/components/ui";
import { PageHeader } from "./admin-ui";
import { Invoice } from "@/components/orders/invoice";

const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "awaiting_verification",
  "paid",
  "refunded",
  "failed",
];

export function AdminOrderDetail({ orderId }: { orderId: string }) {
  const { products } = useCatalog();
  const toast = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [stockAdjusted, setStockAdjusted] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    return onSnapshot(
      doc(getDb(), "orders", orderId),
      (snap) => {
        if (snap.exists()) {
          const next = { ...(snap.data() as Order), id: snap.id };
          setOrder(next);
          setCarrier(next.trackingCarrier ?? "");
          setTracking(next.trackingNumber ?? "");
        } else {
          setOrder(null);
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [orderId]);

  async function advance(status: OrderStatus, note?: string) {
    if (!order) return;
    setBusy(true);
    try {
      await updateOrderStatus(order, status, note);

      // Confirming an order is the point where stock actually leaves the shelf.
      if (status === "confirmed" && !stockAdjusted) {
        await decrementStockForOrder(order, products);
        setStockAdjusted(true);
      }
      toast(`Order marked ${STATUS_LABEL[status].toLowerCase()}`);
    } catch (err) {
      console.error(err);
      toast("Could not update the order.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveTracking() {
    if (!order) return;
    setBusy(true);
    try {
      await updateOrder(order.id, {
        trackingCarrier: carrier.trim() || null,
        trackingNumber: tracking.trim() || null,
      });
      toast("Tracking details saved");
    } catch {
      toast("Could not save tracking details.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function setPaymentStatus(paymentStatus: PaymentStatus) {
    if (!order) return;
    setBusy(true);
    try {
      await updateOrder(order.id, { paymentStatus });
      toast("Payment status updated");
    } catch {
      toast("Could not update payment status.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function cancelOrder() {
    if (!order) return;
    setBusy(true);
    try {
      await updateOrderStatus(order, "cancelled", cancelReason.trim() || "Cancelled by the shop");
      toast("Order cancelled");
      setCancelOpen(false);
    } catch {
      toast("Could not cancel the order.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <PageHeader title="Order not found" />
        <Link href="/admin/orders" className="text-sm text-saffron-deep underline underline-offset-2">
          Back to orders
        </Link>
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status);
  const nextStatus =
    order.status !== "cancelled" && currentIndex < ORDER_STATUS_FLOW.length - 1
      ? ORDER_STATUS_FLOW[currentIndex + 1]
      : null;

  return (
    <div>
      <Link
        href="/admin/orders"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-faint transition hover:text-ink"
      >
        <ChevronLeft className="size-3.5" /> All orders
      </Link>

      <PageHeader
        title={order.orderNumber}
        description={`Placed ${formatDateTime(order.createdAt)}${order.isGuest ? " · guest checkout" : ""}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={order.status} />
            <Button variant="secondary" size="sm" onClick={() => setInvoiceOpen(true)}>
              <FileText className="size-3.5" /> Invoice
            </Button>
          </div>
        }
      />

      {/* Fulfilment actions */}
      {order.status !== "cancelled" && (
        <Card className="mb-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink">
                {nextStatus
                  ? `Next step: mark this order ${STATUS_LABEL[nextStatus].toLowerCase()}`
                  : "This order is complete"}
              </p>
              <p className="mt-0.5 text-xs text-ink-faint">
                {order.status === "placed" &&
                  "Confirming reduces stock for each item in the order."}
                {order.status === "confirmed" && "Pack the items, then mark as packed."}
                {order.status === "packed" && "Add the tracking number below, then mark as shipped."}
                {order.status === "shipped" && "Mark delivered once the courier confirms."}
                {order.status === "delivered" && "Delivered — nothing more to do."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {nextStatus && (
                <Button onClick={() => advance(nextStatus)} loading={busy}>
                  Mark {STATUS_LABEL[nextStatus].toLowerCase()}
                </Button>
              )}
              <Button variant="quiet" onClick={() => setCancelOpen(true)}>
                Cancel order
              </Button>
            </div>
          </div>
        </Card>
      )}

      {invoiceOpen && (
        <div className="fixed inset-0 z-[95] overflow-y-auto bg-ink/50 p-4 backdrop-blur-sm print:static print:overflow-visible print:bg-transparent print:p-0">
          <div className="mx-auto max-w-4xl print:max-w-none">
            <div className="mb-3 flex justify-end gap-2 print:hidden">
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="size-3.5" /> Print or save as PDF
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setInvoiceOpen(false)}>
                <X className="size-3.5" /> Close
              </Button>
            </div>
            <Invoice order={order} />
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {/* Items */}
          <Card className="p-6">
            <h2 className="mb-5 font-display text-lg font-semibold text-ink">
              Items ({order.lines.reduce((s, l) => s + l.quantity, 0)})
            </h2>
            <ul className="divide-y divide-rule">
              {order.lines.map((line) => (
                <li key={line.lineId} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-sm bg-paper-sunk shadow-page">
                    {line.image && (
                      <MediaImage src={line.image} alt="" fill sizes="56px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/products/${line.productId}`}
                      className="font-medium leading-snug text-ink transition hover:text-saffron-deep"
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
                    <p className="mt-1 text-xs text-ink-faint">
                      {formatPrice(line.price)} × {line.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 font-display text-base font-semibold text-ink">
                    {formatPrice(line.price * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2 border-t border-rule pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="text-ink">{formatPrice(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Coupon {order.couponCode}</dt>
                  <dd className="text-leaf">−{formatPrice(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-soft">Delivery</dt>
                <dd className="text-ink">
                  {order.shipping === 0 ? "Free" : formatPrice(order.shipping)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-rule pt-2.5">
                <dt className="font-display text-base font-semibold text-ink">Total</dt>
                <dd className="font-display text-lg font-semibold text-ink">
                  {formatPrice(order.total)}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Timeline */}
          <Card className="p-6">
            <h2 className="mb-6 font-display text-lg font-semibold text-ink">Timeline</h2>
            <OrderTracker status={order.status} timeline={order.timeline} />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer */}
          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-ink">
              <User className="size-4 text-saffron" /> Customer
            </h2>
            <p className="text-sm font-medium text-ink">{order.address.fullName}</p>
            <div className="mt-2 space-y-1 text-xs text-ink-soft">
              <p className="flex items-center gap-2">
                <a href={`mailto:${order.email}`} className="truncate hover:text-saffron-deep">
                  {order.email}
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(order.email);
                    toast("Email copied", "info");
                  }}
                  className="shrink-0 text-ink-faint transition hover:text-ink"
                  aria-label="Copy email"
                >
                  <Copy className="size-3" />
                </button>
              </p>
              <p>
                <a href={`tel:${order.phone}`} className="hover:text-saffron-deep">
                  {order.phone}
                </a>
              </p>
              <p className="text-ink-faint">{order.isGuest ? "Guest checkout" : "Registered customer"}</p>
            </div>
          </Card>

          {/* Address */}
          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-ink">
              <MapPin className="size-4 text-saffron" /> Delivery address
            </h2>
            <address className="text-xs not-italic leading-relaxed text-ink-soft">
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
            </address>
            <Button
              variant="quiet"
              size="sm"
              className="mt-3"
              onClick={() => {
                const text = [
                  order.address.fullName,
                  order.address.line1,
                  order.address.line2,
                  `${order.address.city}, ${order.address.state} ${order.address.pincode}`,
                  order.address.phone,
                ]
                  .filter(Boolean)
                  .join("\n");
                navigator.clipboard.writeText(text);
                toast("Address copied", "info");
              }}
            >
              <Copy className="size-3.5" /> Copy address
            </Button>

            {order.notes && (
              <div className="mt-4 rounded-lg bg-paper-sunk px-3 py-2.5">
                <p className="text-[0.6875rem] font-medium text-ink">Customer note</p>
                <p className="mt-1 text-xs text-ink-soft">{order.notes}</p>
              </div>
            )}
          </Card>

          {/* Payment */}
          <Card className="p-5">
            <h2 className="mb-4 font-display text-base font-semibold text-ink">Payment</h2>
            <p className="text-xs text-ink-soft">
              Method: <span className="font-medium uppercase text-ink">{order.paymentMethod}</span>
            </p>
            {order.paymentReference && (
              <p className="mt-1 text-xs text-ink-soft">
                Reference: <span className="font-medium text-ink">{order.paymentReference}</span>
              </p>
            )}
            <div className="mt-4">
              <Field label="Payment status">
                <Select
                  value={order.paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  disabled={busy}
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          {/* Shipping */}
          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-ink">
              <Truck className="size-4 text-saffron" /> Shipping
            </h2>
            <div className="space-y-3">
              <Field label="Courier">
                <Input
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="India Post / Delhivery"
                />
              </Field>
              <Field label="Tracking number">
                <Input
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="EX123456789IN"
                />
              </Field>
              <Button variant="secondary" size="sm" full onClick={saveTracking} loading={busy}>
                Save tracking
              </Button>
              <p className="text-[0.6875rem] leading-relaxed text-ink-faint">
                Saved tracking details appear on the customer's order page immediately.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Cancel modal */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this order?" size="sm">
        <p className="text-sm leading-relaxed text-ink-soft">
          The customer will see this order as cancelled, along with the reason you give here. Stock is
          not automatically returned — adjust it on the product if you need to.
        </p>
        <div className="mt-5">
          <Field label="Reason (shown to the customer)">
            <Textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Out of stock, customer requested cancellation…"
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="quiet" onClick={() => setCancelOpen(false)}>
            Keep order
          </Button>
          <Button variant="danger" onClick={cancelOrder} loading={busy}>
            Cancel order
          </Button>
        </div>
      </Modal>

      <p className={cn("mt-8 text-xs text-ink-faint")}>
        Order ID: <code>{order.id}</code>
      </p>
    </div>
  );
}
