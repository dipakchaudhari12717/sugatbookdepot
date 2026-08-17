"use client";

import { Check, CircleAlert, Package, Truck, X } from "lucide-react";

import { ORDER_STATUS_FLOW, type OrderStatus } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import type { OrderEvent } from "@/lib/types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_TONE: Record<OrderStatus, string> = {
  placed: "bg-paper-deep text-ink-soft",
  confirmed: "bg-ochre/15 text-ochre",
  packed: "bg-saffron/15 text-saffron-deep",
  shipped: "bg-sage/18 text-sage",
  delivered: "bg-leaf/15 text-leaf",
  cancelled: "bg-maroon/12 text-maroon",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]",
        STATUS_TONE[status],
      )}
    >
      {status === "cancelled" ? (
        <X className="size-3" />
      ) : status === "delivered" ? (
        <Check className="size-3" />
      ) : (
        <span className="size-1.5 rounded-full bg-current" />
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * The Placed → Confirmed → Shipped → Delivered ladder (FR-5.1), with the
 * intermediate "Packed" step the shop uses internally.
 */
export function OrderTracker({
  status,
  timeline,
}: {
  status: OrderStatus;
  timeline: OrderEvent[];
}) {
  if (status === "cancelled") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-maroon/25 bg-maroon/6 px-4 py-3.5">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-maroon" />
        <div>
          <p className="text-sm font-medium text-maroon">This order was cancelled</p>
          {timeline.find((t) => t.status === "cancelled")?.note && (
            <p className="mt-0.5 text-xs text-ink-soft">
              {timeline.find((t) => t.status === "cancelled")!.note}
            </p>
          )}
        </div>
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(status);
  const eventFor = (s: OrderStatus) => timeline.find((t) => t.status === s);

  return (
    <ol className="relative">
      {ORDER_STATUS_FLOW.map((step, i) => {
        const done = i <= currentIndex;
        const isCurrent = i === currentIndex;
        const event = eventFor(step);
        const Icon = step === "shipped" ? Truck : step === "delivered" ? Check : Package;

        return (
          <li key={step} className="relative flex gap-4 pb-7 last:pb-0">
            {/* Connector */}
            {i < ORDER_STATUS_FLOW.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[0.9375rem] top-8 h-[calc(100%-1.5rem)] w-0.5 rounded-full transition-colors duration-500",
                  i < currentIndex ? "bg-saffron" : "bg-rule",
                )}
              />
            )}

            <span
              className={cn(
                "relative z-1 flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-400",
                done
                  ? "border-saffron bg-saffron text-white"
                  : "border-rule bg-paper-raised text-ink-faint",
                isCurrent && "ring-4 ring-saffron/20",
              )}
            >
              <Icon className="size-3.5" />
            </span>

            <div className="pt-1">
              <p className={cn("text-sm font-medium", done ? "text-ink" : "text-ink-faint")}>
                {STATUS_LABEL[step]}
              </p>
              {event ? (
                <p className="mt-0.5 text-xs text-ink-faint">
                  {formatDateTime(event.at)}
                  {event.note ? ` · ${event.note}` : ""}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-ink-faint">Pending</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
