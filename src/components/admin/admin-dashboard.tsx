"use client";

import { MediaImage } from "@/components/media-image";
import Link from "next/link";
import {
  AlertTriangle,
  ClipboardList,
  IndianRupee,
  Package,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useCatalog } from "@/lib/catalog-context";
import { isFirebaseConfigured } from "@/lib/firebase";
import { subscribeAllOrders } from "@/lib/repo";
import type { Order } from "@/lib/types";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { StatusPill } from "@/components/order-status";
import { LinkButton, Spinner } from "@/components/ui";
import { PageHeader, StatCard, TableWrap, Td, Th } from "./admin-ui";

const DAY = 86_400_000;

export function AdminDashboard() {
  const { products, source } = useCatalog();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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

  const stats = useMemo(() => {
    const live = orders.filter((o) => o.status !== "cancelled");
    const revenue = live.reduce((sum, o) => sum + o.total, 0);
    const last30 = live.filter((o) => o.createdAt > Date.now() - 30 * DAY);
    const revenue30 = last30.reduce((sum, o) => sum + o.total, 0);

    const pending = orders.filter((o) => o.status === "placed").length;
    const toShip = orders.filter((o) => ["confirmed", "packed"].includes(o.status)).length;
    const customers = new Set(live.map((o) => o.userId ?? o.email)).size;

    // Units sold per product, to rank the top sellers.
    const unitsByProduct = new Map<string, { title: string; units: number; revenue: number }>();
    for (const order of live) {
      for (const line of order.lines) {
        const entry = unitsByProduct.get(line.productId) ?? {
          title: line.title,
          units: 0,
          revenue: 0,
        };
        entry.units += line.quantity;
        entry.revenue += line.price * line.quantity;
        unitsByProduct.set(line.productId, entry);
      }
    }
    const topProducts = [...unitsByProduct.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    // Daily revenue for the sparkline (last 14 days).
    const days: { day: number; total: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const from = start.getTime() - i * DAY;
      const to = from + DAY;
      days.push({
        day: from,
        total: live
          .filter((o) => o.createdAt >= from && o.createdAt < to)
          .reduce((s, o) => s + o.total, 0),
      });
    }

    return {
      revenue,
      revenue30,
      orderCount: live.length,
      pending,
      toShip,
      customers,
      topProducts,
      days,
      avgOrder: live.length ? revenue / live.length : 0,
    };
  }, [orders]);

  const lowStock = useMemo(
    () => products.filter((p) => p.stock <= 5).sort((a, b) => a.stock - b.stock).slice(0, 8),
    [products],
  );

  // Legacy price-entry issue worth flagging to the shop owner.
  const suspiciousPrices = useMemo(() => products.filter((p) => p.price > 0 && p.price < 5), [products]);

  const maxDay = Math.max(1, ...stats.days.map((d) => d.total));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Sales, stock and everything waiting on you."
        action={
          <LinkButton href="/admin/orders" size="sm">
            <ClipboardList className="size-3.5" /> Manage orders
          </LinkButton>
        }
      />

      {source === "fallback" && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-ochre/30 bg-ochre/8 px-5 py-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ochre" />
          <div className="text-sm">
            <p className="font-medium text-ink">The catalogue is not in Firestore yet</p>
            <p className="mt-0.5 text-ink-soft">
              The shop is showing the 47 products migrated from the old site, bundled with the app.
              Run <code className="rounded bg-paper-sunk px-1.5 py-0.5 text-xs">npm run seed</code>{" "}
              to load them into Firestore so you can edit them here.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue (all time)"
          value={formatPrice(stats.revenue)}
          sub={`${formatPrice(stats.revenue30)} in the last 30 days`}
          icon={<IndianRupee className="size-4" />}
          tone="leaf"
        />
        <StatCard
          label="Orders"
          value={stats.orderCount}
          sub={`Average ${formatPrice(stats.avgOrder)}`}
          icon={<ClipboardList className="size-4" />}
        />
        <StatCard
          label="Needs action"
          value={stats.pending + stats.toShip}
          sub={`${stats.pending} new · ${stats.toShip} to dispatch`}
          icon={<Package className="size-4" />}
          tone={stats.pending + stats.toShip > 0 ? "saffron" : "neutral"}
        />
        <StatCard
          label="Customers"
          value={stats.customers}
          sub={`${products.length} products live`}
          icon={<Users className="size-4" />}
        />
      </div>

      {/* Revenue chart */}
      <div className="mt-6 rounded-2xl border border-rule bg-paper-raised p-5 shadow-page">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Last 14 days</h2>
          <span className="flex items-center gap-1.5 text-xs text-ink-faint">
            <TrendingUp className="size-3.5" /> Daily revenue
          </span>
        </div>

        {loading ? (
          <div className="flex h-36 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="mt-6 flex h-36 items-end gap-1.5">
            {stats.days.map((d) => (
              <div key={d.day} className="group relative flex flex-1 flex-col items-center gap-2">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-sm bg-saffron/25 transition-all duration-500 ease-[var(--ease-paper)] group-hover:bg-saffron"
                    style={{ height: `${Math.max(2, (d.total / maxDay) * 100)}%` }}
                  />
                  {d.total > 0 && (
                    <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[0.625rem] font-medium text-paper opacity-0 transition group-hover:opacity-100">
                      {formatPrice(d.total)}
                    </span>
                  )}
                </div>
                <span className="text-[0.5625rem] text-ink-faint">
                  {new Date(d.day).getDate()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs font-medium text-saffron-deep hover:underline">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-rule bg-paper-raised">
              <Spinner />
            </div>
          ) : orders.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-rule-strong bg-paper-raised px-5 py-10 text-center text-sm text-ink-faint">
              No orders yet.
            </p>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map((o) => (
                  <tr key={o.id} className="transition hover:bg-paper-sunk/60">
                    <Td>
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-medium text-ink hover:text-saffron-deep"
                      >
                        {o.orderNumber}
                      </Link>
                      <span className="block text-[0.6875rem] text-ink-faint">
                        {formatDate(o.createdAt)}
                      </span>
                    </Td>
                    <Td>
                      <span className="block max-w-40 truncate">{o.address.fullName}</span>
                      <span className="block max-w-40 truncate text-[0.6875rem] text-ink-faint">
                        {o.email}
                      </span>
                    </Td>
                    <Td className="font-medium text-ink">{formatPrice(o.total)}</Td>
                    <Td>
                      <StatusPill status={o.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>

        {/* Top products */}
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">Top sellers</h2>
          {stats.topProducts.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-rule-strong bg-paper-raised px-5 py-10 text-center text-sm text-ink-faint">
              Sales data appears once orders start coming in.
            </p>
          ) : (
            <ul className="divide-y divide-rule rounded-2xl border border-rule bg-paper-raised shadow-page">
              {stats.topProducts.map((entry, i) => {
                const product = products.find((p) => p.id === entry.id);
                return (
                  <li key={entry.id} className="flex items-center gap-3.5 px-4 py-3">
                    <span className="w-4 shrink-0 font-display text-sm font-semibold text-ink-faint">
                      {i + 1}
                    </span>
                    <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-sm bg-paper-sunk">
                      {product?.image && (
                        <MediaImage src={product.image} alt="" fill sizes="36px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{entry.title}</p>
                      <p className="text-[0.6875rem] text-ink-faint">{entry.units} sold</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-ink">
                      {formatPrice(entry.revenue)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Attention */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {lowStock.length > 0 && (
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <AlertTriangle className="size-4 text-ochre" /> Low stock
            </h2>
            <ul className="divide-y divide-rule rounded-2xl border border-rule bg-paper-raised shadow-page">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="relative h-11 w-8 shrink-0 overflow-hidden rounded-sm bg-paper-sunk">
                    {p.image && <MediaImage src={p.image} alt="" fill sizes="32px" className="object-cover" />}
                  </div>
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="min-w-0 flex-1 truncate text-sm text-ink transition hover:text-saffron-deep"
                  >
                    {p.title}
                  </Link>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold",
                      p.stock === 0 ? "bg-maroon/12 text-maroon" : "bg-ochre/15 text-ochre",
                    )}
                  >
                    {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {suspiciousPrices.length > 0 && (
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <AlertTriangle className="size-4 text-maroon" /> Check these prices
            </h2>
            <div className="rounded-2xl border border-maroon/25 bg-maroon/5 p-4">
              <p className="text-xs leading-relaxed text-ink-soft">
                These products came across from the old website priced under ₹5, which usually means
                a placeholder was left in. Confirm the real price before you take orders.
              </p>
              <ul className="mt-3 space-y-2">
                {suspiciousPrices.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="min-w-0 truncate text-sm font-medium text-ink hover:text-saffron-deep"
                    >
                      {p.title}
                    </Link>
                    <span className="shrink-0 text-sm font-semibold text-maroon">
                      {formatPrice(p.price)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
