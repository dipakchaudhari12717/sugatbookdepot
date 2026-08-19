"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  LogOut,
  Menu,
  Package,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useCatalog } from "@/lib/catalog-context";
import type { Product } from "@/lib/types";
import { cn, formatPrice, hasDevanagari } from "@/lib/utils";
import { BrandLogo } from "./brand-logo";
import { Button } from "./ui";

/** Rank products against a query using the precomputed token list (FR-1.3). */
function searchProducts(products: Product[], q: string, max = 6): Product[] {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  const terms = needle.split(/\s+/);

  const scored = products
    .map((p) => {
      const title = p.title.toLowerCase();
      let score = 0;
      if (title.startsWith(needle)) score += 100;
      else if (title.includes(needle)) score += 60;
      for (const term of terms) {
        if (p.searchTokens.some((t) => t === term)) score += 14;
        else if (p.searchTokens.some((t) => t.startsWith(term))) score += 9;
        else if (title.includes(term)) score += 5;
        else score -= 6;
      }
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, max).map((x) => x.p);
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { products, categories, settings } = useCatalog();
  const { count, wishlist, lastAddedAt } = useCart();
  const { user, isAdmin, logout } = useAuth();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [bump, setBump] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close everything on navigation.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Flash the bag when something is added.
  useEffect(() => {
    if (!lastAddedAt) return;
    setBump(true);
    const t = setTimeout(() => setBump(false), 500);
    return () => clearTimeout(t);
  }, [lastAddedAt]);

  // Cmd/Ctrl+K opens search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInput.current?.focus(), 60);
    else setQuery("");
  }, [searchOpen]);

  const suggestions = useMemo(() => searchProducts(products, query), [products, query]);

  const submitSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) return;
      router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
    },
    [query, router],
  );

  const navCategories = categories.filter((c) => c.featured);

  return (
    <>
      {/* Announcement bar */}
      {settings.announcement && (
        <div className="relative overflow-hidden bg-ink text-paper">
          <div className="container-page flex items-center justify-center gap-2 py-2 text-center">
            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em]">
              {settings.announcement}
            </p>
          </div>
        </div>
      )}

      <header
        className={cn(
          "sticky top-0 z-50 transition-all duration-300 ease-[var(--ease-paper)]",
          scrolled
            ? "border-b border-rule bg-paper/88 shadow-page backdrop-blur-xl"
            : "border-b border-transparent bg-paper",
        )}
      >
        <div className="container-page">
          <div
            className={cn(
              "flex items-center gap-3 transition-[height] duration-300",
              scrolled ? "h-16" : "h-20",
            )}
          >
            {/* Mobile menu */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="-ml-2 rounded-lg p-2 text-ink transition hover:bg-paper-sunk lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>

            {/* Wordmark */}
            <BrandLogo className="mr-auto lg:mr-8" size={scrolled ? 36 : 44} />

            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 lg:flex">
              {navCategories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/shop?category=${c.slug}`}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-[0.8125rem] font-medium transition-colors",
                    c.slug === "chivar"
                      ? "text-saffron-deep hover:bg-saffron-wash"
                      : "text-ink-soft hover:bg-paper-sunk hover:text-ink",
                  )}
                >
                  {c.shortName}
                  {c.slug === "chivar" && (
                    <span className="absolute -right-0.5 top-1 size-1.5 rounded-full bg-saffron" />
                  )}
                </Link>
              ))}
              <Link
                href="/shop"
                className="rounded-full px-3.5 py-2 text-[0.8125rem] font-medium text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink"
              >
                All products
              </Link>
              <span aria-hidden className="mx-1 h-4 w-px bg-rule" />
              <Link
                href="/gallery"
                className="rounded-full px-3.5 py-2 text-[0.8125rem] font-medium text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink"
              >
                Gallery
              </Link>
              <Link
                href="/blog"
                className="rounded-full px-3.5 py-2 text-[0.8125rem] font-medium text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink"
              >
                Blog
              </Link>
            </nav>

            {/* Actions */}
            <div className="ml-auto flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="rounded-lg p-2.5 text-ink-soft transition hover:bg-paper-sunk hover:text-ink"
                aria-label="Search products"
              >
                <Search className="size-[1.15rem]" />
              </button>

              <Link
                href="/wishlist"
                className="relative hidden rounded-lg p-2.5 text-ink-soft transition hover:bg-paper-sunk hover:text-ink sm:block"
                aria-label={`Wishlist, ${wishlist.length} items`}
              >
                <Heart className="size-[1.15rem]" />
                {wishlist.length > 0 && (
                  <span className="absolute right-1 top-1 size-1.5 rounded-full bg-maroon" />
                )}
              </Link>

              {/* Account */}
              <div className="group/acct relative hidden sm:block">
                <Link
                  href={user ? "/account" : "/login"}
                  className="block rounded-lg p-2.5 text-ink-soft transition hover:bg-paper-sunk hover:text-ink"
                  aria-label={user ? "Your account" : "Sign in"}
                >
                  <User className="size-[1.15rem]" />
                </Link>
                {user && (
                  <div className="invisible absolute right-0 top-full w-52 translate-y-1 rounded-xl border border-rule bg-paper-raised p-1.5 opacity-0 shadow-lift transition-all duration-200 group-hover/acct:visible group-hover/acct:translate-y-0 group-hover/acct:opacity-100">
                    <p className="truncate px-2.5 py-2 text-xs text-ink-faint">{user.email}</p>
                    <Link
                      href="/account"
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-soft transition hover:bg-paper-sunk hover:text-ink"
                    >
                      <User className="size-4" /> My account
                    </Link>
                    <Link
                      href="/orders"
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-soft transition hover:bg-paper-sunk hover:text-ink"
                    >
                      <Package className="size-4" /> My orders
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-saffron-deep transition hover:bg-saffron-wash"
                      >
                        <Package className="size-4" /> Admin panel
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => logout()}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-soft transition hover:bg-paper-sunk hover:text-ink"
                    >
                      <LogOut className="size-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>

              <Link
                href="/cart"
                className={cn(
                  "relative ml-1 flex items-center gap-2 rounded-full bg-ink px-3.5 py-2.5 text-white transition-transform duration-300",
                  bump && "scale-110",
                )}
                aria-label={`Shopping bag, ${count} items`}
              >
                <ShoppingBag className="size-[1.05rem]" />
                <span className="min-w-3 text-xs font-semibold tabular-nums">{count}</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ---------------- Search overlay ---------------- */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]"
          >
            <button
              type="button"
              aria-label="Close search"
              onClick={() => setSearchOpen(false)}
              className="absolute inset-0 bg-ink/35 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-rule bg-paper-raised shadow-lift"
            >
              <form onSubmit={submitSearch} className="flex items-center gap-3 border-b border-rule px-4">
                <Search className="size-[1.15rem] shrink-0 text-ink-faint" />
                <input
                  ref={searchInput}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search titles, authors, categories…"
                  className="h-14 flex-1 bg-transparent text-[0.9375rem] text-ink placeholder:text-ink-faint focus:outline-none"
                  aria-label="Search products"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="rounded-lg p-1.5 text-ink-faint transition hover:bg-paper-sunk hover:text-ink"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </form>

              <div className="max-h-[55vh] overflow-y-auto">
                {query.trim().length >= 2 && suggestions.length === 0 && (
                  <p className="px-4 py-8 text-center text-sm text-ink-faint">
                    Nothing matched “{query.trim()}”. Try an author or a category.
                  </p>
                )}

                {suggestions.map((p) => (
                  <Link
                    key={p.id}
                    href={`/product/${p.slug}`}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center gap-3.5 border-b border-rule/60 px-4 py-3 transition hover:bg-paper-sunk"
                  >
                    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-sm bg-paper-sunk shadow-page">
                      {p.image && (
                        <Image src={p.image} alt="" fill sizes="48px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate font-display text-sm font-semibold text-ink",
                          hasDevanagari(p.title) && "deva",
                        )}
                      >
                        {p.title}
                      </p>
                      <p className="truncate text-xs text-ink-faint">
                        {[p.author ?? p.brand, p.language].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="shrink-0 font-display text-sm font-semibold text-ink">
                      {formatPrice(p.price)}
                    </span>
                  </Link>
                ))}

                {query.trim().length < 2 && (
                  <div className="px-4 py-5">
                    <p className="eyebrow mb-3">Browse by category</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((c) => (
                        <Link
                          key={c.slug}
                          href={`/shop?category=${c.slug}`}
                          onClick={() => setSearchOpen(false)}
                          className="rounded-full border border-rule bg-paper px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-saffron hover:text-saffron-deep"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {suggestions.length > 0 && (
                <button
                  type="button"
                  onClick={submitSearch}
                  className="w-full border-t border-rule bg-paper px-4 py-3 text-center text-xs font-medium text-saffron-deep transition hover:bg-saffron-wash"
                >
                  See all results for “{query.trim()}”
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- Mobile drawer ---------------- */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[85] lg:hidden"
          >
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            />
            <motion.nav
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="relative flex h-full w-[min(20rem,85vw)] flex-col bg-paper-raised shadow-lift"
            >
              <div className="flex items-center justify-between border-b border-rule px-5 py-4">
                <span className="font-display text-lg font-semibold text-ink">Menu</span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg p-1.5 text-ink-faint transition hover:bg-paper-sunk hover:text-ink"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-4">
                <p className="eyebrow px-2 pb-2">Shop</p>
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/shop?category=${c.slug}`}
                    className="flex items-center justify-between rounded-xl px-2.5 py-3 text-sm font-medium text-ink transition hover:bg-paper-sunk"
                  >
                    <span className={c.slug === "chivar" ? "text-saffron-deep" : undefined}>
                      {c.name}
                    </span>
                    <span className="text-xs text-ink-faint">{c.productCount ?? ""}</span>
                  </Link>
                ))}
                <Link
                  href="/shop"
                  className="mt-1 flex rounded-xl px-2.5 py-3 text-sm font-medium text-ink transition hover:bg-paper-sunk"
                >
                  All products
                </Link>

                <div className="my-4 h-px bg-rule" />

                <p className="eyebrow px-2 pb-2">Explore</p>
                <Link
                  href="/gallery"
                  className="flex rounded-xl px-2.5 py-3 text-sm text-ink transition hover:bg-paper-sunk"
                >
                  Gallery
                </Link>
                <Link
                  href="/blog"
                  className="flex rounded-xl px-2.5 py-3 text-sm text-ink transition hover:bg-paper-sunk"
                >
                  Blog
                </Link>

                <div className="my-4 h-px bg-rule" />

                <p className="eyebrow px-2 pb-2">Account</p>
                <Link
                  href={user ? "/account" : "/login"}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-3 text-sm text-ink transition hover:bg-paper-sunk"
                >
                  <User className="size-4 text-ink-faint" /> {user ? "My account" : "Sign in"}
                </Link>
                <Link
                  href="/orders"
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-3 text-sm text-ink transition hover:bg-paper-sunk"
                >
                  <Package className="size-4 text-ink-faint" /> Track orders
                </Link>
                <Link
                  href="/wishlist"
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-3 text-sm text-ink transition hover:bg-paper-sunk"
                >
                  <Heart className="size-4 text-ink-faint" /> Wishlist
                  {wishlist.length > 0 && (
                    <span className="ml-auto text-xs text-ink-faint">{wishlist.length}</span>
                  )}
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-3 text-sm font-medium text-saffron-deep transition hover:bg-saffron-wash"
                  >
                    <Package className="size-4" /> Admin panel
                  </Link>
                )}

                <div className="my-4 h-px bg-rule" />

                <Link
                  href="/about"
                  className="flex rounded-xl px-2.5 py-3 text-sm text-ink-soft transition hover:bg-paper-sunk"
                >
                  About us
                </Link>
                <Link
                  href="/contact"
                  className="flex rounded-xl px-2.5 py-3 text-sm text-ink-soft transition hover:bg-paper-sunk"
                >
                  Contact
                </Link>
              </div>

              {user && (
                <div className="border-t border-rule p-3">
                  <Button variant="quiet" full size="sm" onClick={() => logout()}>
                    <LogOut className="size-4" /> Sign out
                  </Button>
                </div>
              )}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
