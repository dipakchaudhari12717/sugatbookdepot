"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  ImageIcon,
  LayoutGrid,
  Newspaper,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Settings,
  ShieldAlert,
  Store,
  Tag,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { AdminLogin } from "./admin-login";
import { Spinner } from "@/components/ui";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: TrendingUp, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: LayoutGrid },
  { href: "/admin/coupons", label: "Coupons", icon: Tag },
  { href: "/admin/banners", label: "Banners", icon: Store },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/admin/blog", label: "Blog", icon: Newspaper },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/enquiries", label: "Enquiries", icon: MessageCircle },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

/**
 * Guards every /admin route. This is a convenience gate for the UI — the real
 * enforcement is in firestore.rules, which rejects writes from anyone who is
 * not in /admins regardless of what the client renders.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, isAdmin, loading, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => setNavOpen(false), [pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Spinner className="size-7" />
      </div>
    );
  }

  if (!user) return <AdminLogin />;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-maroon/10 text-maroon">
            <ShieldAlert className="size-6" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold text-ink">
            You don't have admin access
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            You're signed in as <strong className="text-ink">{user.email}</strong>, which is not an
            administrator of this shop. If this is wrong, ask an existing admin to add you, or sign
            in with the shop owner's account.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-saffron px-6 text-sm font-medium text-white transition hover:bg-saffron-deep"
            >
              <LogOut className="size-4" /> Sign in as someone else
            </button>
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-full border border-rule-strong bg-paper-raised px-6 text-sm font-medium text-ink transition hover:border-saffron"
            >
              Back to shop
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-paper-sunk">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-rule bg-paper-raised transition-transform duration-300 ease-[var(--ease-paper)] lg:static lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-rule px-5 py-4">
          <Link href="/admin" className="flex items-baseline gap-2">
            <span className="font-display text-lg font-semibold text-ink">Sugat</span>
            <span className="text-[0.5625rem] font-semibold uppercase tracking-[0.2em] text-saffron-deep">
              Admin
            </span>
          </Link>
          <Link
            href="/"
            title="Back to the shop"
            className="hidden items-center gap-1.5 rounded-full border border-rule-strong px-2.5 py-1 text-[0.6875rem] font-medium text-ink-soft transition hover:border-saffron hover:text-saffron-deep lg:inline-flex"
          >
            <Store className="size-3" /> Shop
          </Link>
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            className="rounded-lg p-1.5 text-ink-faint transition hover:bg-paper-sunk lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-saffron text-white shadow-page"
                    : "text-ink-soft hover:bg-paper-sunk hover:text-ink",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-rule p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-soft transition hover:bg-paper-sunk hover:text-ink"
          >
            <Store className="size-4" /> View shop
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-soft transition hover:bg-paper-sunk hover:text-ink"
          >
            <LogOut className="size-4" /> Sign out
          </button>
          <p className="truncate px-3 pt-2 text-[0.6875rem] text-ink-faint">{user.email}</p>
        </div>
      </aside>

      {navOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* On a phone the sidebar is behind the hamburger, so without this there
            is no visible way out of the admin panel. Keep a shop link in the bar
            itself. */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-rule bg-paper-raised/90 px-4 py-3 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="rounded-lg p-2 text-ink transition hover:bg-paper-sunk"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <span className="font-display text-base font-semibold text-ink">Admin</span>
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-rule-strong px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-saffron hover:text-saffron-deep"
          >
            <Store className="size-3.5" /> View shop
          </Link>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
