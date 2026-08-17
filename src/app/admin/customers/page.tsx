"use client";

import { Search, Shield, ShieldOff, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase";
import { grantAdmin, revokeAdmin, subscribeAllOrders, subscribeAllUsers } from "@/lib/repo";
import { useToast } from "@/lib/toast-context";
import type { Order, UserProfile } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/utils";
import { Button, Input, Modal, Spinner } from "@/components/ui";
import { PageHeader, StatCard, TableWrap, Td, Th } from "@/components/admin/admin-ui";

export default function AdminCustomersPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [promote, setPromote] = useState<UserProfile | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsubUsers = subscribeAllUsers((next) => {
      setUsers(next);
      setLoading(false);
    });
    const unsubOrders = subscribeAllOrders(setOrders);
    return () => {
      unsubUsers();
      unsubOrders();
    };
  }, []);

  /** Registered customers plus anyone who checked out as a guest. */
  const rows = useMemo(() => {
    const stats = new Map<string, { count: number; spent: number; last: number }>();
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      const key = o.userId ?? o.email.toLowerCase();
      const entry = stats.get(key) ?? { count: 0, spent: 0, last: 0 };
      entry.count += 1;
      entry.spent += o.total;
      entry.last = Math.max(entry.last, o.createdAt);
      stats.set(key, entry);
    }

    const registered = users.map((u) => {
      const s = stats.get(u.uid) ?? stats.get(u.email.toLowerCase());
      return {
        key: u.uid,
        profile: u as UserProfile | null,
        name: u.displayName || u.email.split("@")[0],
        email: u.email,
        phone: u.phone || "",
        guest: false,
        orders: s?.count ?? 0,
        spent: s?.spent ?? 0,
        last: s?.last ?? 0,
        joined: u.createdAt,
      };
    });

    const knownEmails = new Set(users.map((u) => u.email.toLowerCase()));
    const guests = new Map<string, (typeof registered)[number]>();
    for (const o of orders) {
      if (o.userId) continue;
      const email = o.email.toLowerCase();
      if (knownEmails.has(email) || guests.has(email)) continue;
      const s = stats.get(email);
      guests.set(email, {
        key: `guest:${email}`,
        profile: null,
        name: o.address.fullName,
        email: o.email,
        phone: o.phone,
        guest: true,
        orders: s?.count ?? 0,
        spent: s?.spent ?? 0,
        last: s?.last ?? 0,
        joined: o.createdAt,
      });
    }

    const all = [...registered, ...guests.values()];
    const needle = query.trim().toLowerCase();
    return all
      .filter((r) =>
        needle ? `${r.name} ${r.email} ${r.phone}`.toLowerCase().includes(needle) : true,
      )
      .sort((a, b) => b.spent - a.spent || b.last - a.last);
  }, [users, orders, query]);

  const totals = useMemo(
    () => ({
      registered: users.length,
      guests: rows.filter((r) => r.guest).length,
      repeat: rows.filter((r) => r.orders > 1).length,
    }),
    [users, rows],
  );

  async function toggleAdmin(profile: UserProfile, makeAdmin: boolean) {
    setBusy(true);
    try {
      if (makeAdmin) await grantAdmin(profile.uid, profile.email);
      else await revokeAdmin(profile.uid);
      toast(makeAdmin ? `${profile.email} is now an admin` : `Admin access removed`);
      setPromote(null);
    } catch (err) {
      console.error(err);
      toast("Could not change admin access.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Customers" description="Everyone who has an account or has placed an order." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Registered" value={totals.registered} icon={<Users className="size-4" />} />
        <StatCard label="Guest buyers" value={totals.guests} />
        <StatCard label="Repeat customers" value={totals.repeat} tone="leaf" />
      </div>

      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email or phone…"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="size-6" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-rule-strong bg-paper-raised px-5 py-14 text-center text-sm text-ink-faint">
          No customers yet.
        </p>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Customer</Th>
              <Th>Contact</Th>
              <Th>Orders</Th>
              <Th>Spent</Th>
              <Th>Last order</Th>
              <Th className="text-right">Access</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="transition hover:bg-paper-sunk/60">
                <Td>
                  <span className="block font-medium text-ink">{r.name}</span>
                  <span className="block text-[0.6875rem] text-ink-faint">
                    {r.guest ? "Guest" : `Joined ${formatDate(r.joined)}`}
                    {r.profile?.role === "admin" && " · admin"}
                  </span>
                </Td>
                <Td>
                  <a href={`mailto:${r.email}`} className="block max-w-52 truncate hover:text-saffron-deep">
                    {r.email}
                  </a>
                  {r.phone && <span className="block text-[0.6875rem] text-ink-faint">{r.phone}</span>}
                </Td>
                <Td className="tabular-nums">{r.orders}</Td>
                <Td className="font-medium tabular-nums text-ink">{formatPrice(r.spent)}</Td>
                <Td className="text-xs">{r.last ? formatDate(r.last) : "—"}</Td>
                <Td className="text-right">
                  {r.profile ? (
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => setPromote(r.profile)}
                      disabled={r.profile.uid === user?.uid}
                    >
                      <Shield className="size-3.5" /> Manage
                    </Button>
                  ) : (
                    <span className="text-[0.6875rem] text-ink-faint">—</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <Modal open={promote != null} onClose={() => setPromote(null)} title="Admin access" size="sm">
        <p className="text-sm leading-relaxed text-ink-soft">
          Give <strong className="text-ink">{promote?.email}</strong> access to this admin panel?
          Admins can add and remove products, manage orders and change shop settings.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="quiet" onClick={() => setPromote(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => promote && toggleAdmin(promote, false)}
            loading={busy}
          >
            <ShieldOff className="size-3.5" /> Remove access
          </Button>
          <Button onClick={() => promote && toggleAdmin(promote, true)} loading={busy}>
            <Shield className="size-3.5" /> Make admin
          </Button>
        </div>
      </Modal>
    </div>
  );
}
