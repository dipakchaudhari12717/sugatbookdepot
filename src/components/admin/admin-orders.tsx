"use client";

import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { isFirebaseConfigured } from "@/lib/firebase";
import { subscribeAllOrders } from "@/lib/repo";
import type { Order, OrderStatus } from "@/lib/types";
import { cn, formatDateTime, formatPrice } from "@/lib/utils";
import { STATUS_LABEL, StatusPill } from "@/components/order-status";
import { Input, Select, Spinner } from "@/components/ui";
import { PageHeader, TableWrap, Td, Th } from "./admin-ui";

const TABS: { value: OrderStatus | "all" | "action"; label: string }[] = [
  { value: "action", label: "Needs action" },
  { value: "all", label: "All" },
  { value: "placed", label: "Placed" },
  { value: "confirmed", label: "Confirmed" },
  { value: "packed", label: "Packed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<OrderStatus | "all" | "action">("action");
  const [query, setQuery] = useState("");
  const [payment, setPayment] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    return subscribeAllOrders((next) => {
      setOrders(next);
      setLoading(false);
    });
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: orders.length };
    for (const o of orders) map[o.status] = (map[o.status] ?? 0) + 1;
    map.action = orders.filter((o) => ["placed", "confirmed", "packed"].includes(o.status)).length;
    return map;
  }, [orders]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (tab === "action" && !["placed", "confirmed", "packed"].includes(o.status)) return false;
      if (tab !== "all" && tab !== "action" && o.status !== tab) return false;
      if (payment && o.paymentMethod !== payment) return false;
      if (needle) {
        const hay =
          `${o.orderNumber} ${o.address.fullName} ${o.email} ${o.phone} ${o.address.city} ${o.address.pincode}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [orders, tab, query, payment]);

  return (
    <div>
      <PageHeader
        title="Orders"
        description={`${orders.length} orders received.`}
      />

      {!isFirebaseConfigured && (
        <p className="mb-5 rounded-xl border border-maroon/25 bg-maroon/6 px-4 py-3 text-xs text-maroon">
          Firebase is not configured, so no orders can be loaded.
        </p>
      )}

      {/* Tabs */}
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-[0.8125rem] font-medium transition",
              tab === t.value
                ? "border-saffron bg-saffron text-white"
                : "border-rule bg-paper-raised text-ink-soft hover:border-saffron/50 hover:text-ink",
            )}
          >
            {t.label}
            {counts[t.value] != null && (
              <span className="ml-1.5 opacity-65">{counts[t.value]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-2.5">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Order number, name, email, phone or PIN code…"
            className="pl-9"
          />
        </div>
        <Select
          value={payment}
          onChange={(e) => setPayment(e.target.value)}
          className="w-auto min-w-36"
        >
          <option value="">Any payment</option>
          <option value="cod">Cash on Delivery</option>
          <option value="upi">UPI</option>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner className="size-6" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-rule-strong bg-paper-raised px-5 py-14 text-center text-sm text-ink-faint">
          {orders.length === 0 ? "No orders have come in yet." : "No orders match those filters."}
        </p>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Items</Th>
              <Th>Total</Th>
              <Th>Payment</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="transition hover:bg-paper-sunk/60">
                <Td>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-medium text-ink transition hover:text-saffron-deep"
                  >
                    {o.orderNumber}
                  </Link>
                  <span className="block text-[0.6875rem] text-ink-faint">
                    {formatDateTime(o.createdAt)}
                  </span>
                </Td>
                <Td>
                  <span className="block max-w-44 truncate font-medium text-ink">
                    {o.address.fullName}
                  </span>
                  <span className="block max-w-44 truncate text-[0.6875rem] text-ink-faint">
                    {o.address.city} {o.address.pincode} · {o.phone}
                  </span>
                </Td>
                <Td className="tabular-nums">
                  {o.lines.reduce((s, l) => s + l.quantity, 0)}
                </Td>
                <Td className="font-medium text-ink">{formatPrice(o.total)}</Td>
                <Td>
                  <span className="block text-xs uppercase">{o.paymentMethod}</span>
                  <span
                    className={cn(
                      "block text-[0.6875rem]",
                      o.paymentStatus === "paid"
                        ? "text-leaf"
                        : o.paymentStatus === "awaiting_verification"
                          ? "text-ochre"
                          : "text-ink-faint",
                    )}
                  >
                    {o.paymentStatus.replace(/_/g, " ")}
                  </span>
                </Td>
                <Td>
                  <StatusPill status={o.status} />
                </Td>
                <Td className="text-right">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="inline-flex rounded-lg p-2 text-ink-faint transition hover:bg-paper-sunk hover:text-ink"
                    aria-label={`Open ${o.orderNumber}`}
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {rows.length > 0 && (
        <p className="mt-4 text-xs text-ink-faint">
          Showing {rows.length} of {orders.length} orders
          {tab !== "all" && ` · ${tab === "action" ? "Needs action" : STATUS_LABEL[tab as OrderStatus]}`}
        </p>
      )}
    </div>
  );
}
