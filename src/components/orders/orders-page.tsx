"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Package, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { findOrderByNumber, subscribeUserOrders } from "@/lib/repo";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";
import type { Order } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/utils";
import { StatusPill } from "@/components/order-status";
import { Button, Card, EmptyState, Field, Input, LinkButton, Spinner } from "@/components/ui";

export function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const { add } = useCart();
  const toast = useToast();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lookup, setLookup] = useState("");
  const [looking, setLooking] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = subscribeUserOrders(user.uid, (next) => {
      setOrders(next);
      setLoading(false);
    });
    return unsub;
  }, [user, authLoading]);

  async function trackByNumber(e: React.FormEvent) {
    e.preventDefault();
    const value = lookup.trim();
    if (!value) return;
    setLooking(true);
    try {
      const found = await findOrderByNumber(value);
      if (found) router.push(`/orders/${found.id}`);
      else toast("No order found with that number. Please check and try again.", "error");
    } catch {
      toast("Could not look that up right now.", "error");
    } finally {
      setLooking(false);
    }
  }

  return (
    <div className="container-page py-10 lg:py-14">
      <h1 className="rule-ornament font-display text-3xl font-semibold text-ink sm:text-4xl">
        Your orders
      </h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-14">
        <div>
          {authLoading || loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Spinner className="size-6" />
            </div>
          ) : !user ? (
            <EmptyState
              icon={<Package className="size-6" />}
              title="Sign in to see your order history"
              description="Or track a single order using the order number from your confirmation."
              action={
                <LinkButton href="/login?next=/orders">Sign in</LinkButton>
              }
            />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={<Package className="size-6" />}
              title="No orders yet"
              description="When you place an order it will appear here, with live delivery status."
              action={<LinkButton href="/shop">Start browsing</LinkButton>}
            />
          ) : (
            <ul className="space-y-4">
              {orders.map((order) => (
                <li key={order.id}>
                  <Card className="overflow-hidden transition hover:shadow-lift">
                    <Link href={`/orders/${order.id}`} className="block p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-base font-semibold text-ink">
                            {order.orderNumber}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-faint">
                            Placed {formatDate(order.createdAt)} ·{" "}
                            {order.lines.length} {order.lines.length === 1 ? "item" : "items"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusPill status={order.status} />
                          <ChevronRight className="size-4 text-ink-faint" />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <div className="flex -space-x-2.5">
                          {order.lines.slice(0, 4).map((line) => (
                            <div
                              key={line.lineId}
                              className="relative h-14 w-10 shrink-0 overflow-hidden rounded-sm border-2 border-paper-raised bg-paper-sunk shadow-page"
                            >
                              {line.image && (
                                <Image src={line.image} alt="" fill sizes="40px" className="object-cover" />
                              )}
                            </div>
                          ))}
                          {order.lines.length > 4 && (
                            <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-sm border-2 border-paper-raised bg-paper-sunk text-[0.625rem] font-semibold text-ink-soft">
                              +{order.lines.length - 4}
                            </div>
                          )}
                        </div>
                        <span className="ml-auto font-display text-lg font-semibold text-ink">
                          {formatPrice(order.total)}
                        </span>
                      </div>
                    </Link>

                    {/* Re-order (FR-5.3) */}
                    <div className="flex justify-end border-t border-rule bg-paper px-5 py-3">
                      <Button
                        variant="quiet"
                        size="sm"
                        onClick={() => {
                          for (const line of order.lines) {
                            add(
                              {
                                id: line.productId,
                                slug: line.slug,
                                title: line.title,
                                image: line.image,
                                price: line.price,
                                mrp: line.mrp,
                                stock: line.maxStock,
                              } as never,
                              line.quantity,
                              line.selectedOptions,
                            );
                          }
                          toast("Items added back to your bag");
                        }}
                      >
                        Order again
                      </Button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Guest tracking (FR-5.1 for guest checkouts) */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Track an order</h2>
            <p className="mt-1.5 text-xs text-ink-soft">
              Ordered as a guest? Enter the order number from your confirmation.
            </p>
            <form onSubmit={trackByNumber} className="mt-5">
              <Field label="Order number">
                <Input
                  value={lookup}
                  onChange={(e) => setLookup(e.target.value.toUpperCase())}
                  placeholder="SBD-XXXXXX"
                  className="uppercase"
                />
              </Field>
              <Button type="submit" full className="mt-4" loading={looking}>
                <Search className="size-4" /> Track order
              </Button>
            </form>
          </Card>
        </aside>
      </div>
    </div>
  );
}
