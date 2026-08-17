"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { getDb, isFirebaseConfigured } from "./firebase";
import { useAuth } from "./auth-context";
import { useCatalog } from "./catalog-context";
import type { CartLine, Product } from "./types";
import { makeLineId } from "./utils";

const STORAGE_KEY = "sbd.cart.v1";
const WISHLIST_KEY = "sbd.wishlist.v1";

interface CartValue {
  lines: CartLine[];
  wishlist: string[];
  count: number;
  subtotal: number;
  savings: number;
  ready: boolean;
  add: (product: Product, quantity?: number, options?: Record<string, string>) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
  toggleWishlist: (productId: string) => void;
  inWishlist: (productId: string) => boolean;
  /** Set by `add` so the header can flash the cart button. */
  lastAddedAt: number;
}

const CartContext = createContext<CartValue | null>(null);

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { byId } = useCatalog();

  const [lines, setLines] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [lastAddedAt, setLastAddedAt] = useState(0);
  // Guards the first server->local merge so we don't write back a half state.
  const mergedForUid = useRef<string | null>(null);

  // Load from localStorage on mount (guests, and instant paint for everyone).
  useEffect(() => {
    setLines(readLocal<CartLine[]>(STORAGE_KEY, []));
    setWishlist(readLocal<string[]>(WISHLIST_KEY, []));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, ready]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist, ready]);

  /**
   * Cart persistence for signed-in customers (FR-3.2). On sign-in we merge the
   * guest cart into whatever was saved server-side, taking the larger quantity
   * for lines present in both.
   */
  useEffect(() => {
    if (!ready || !user || !isFirebaseConfigured) return;
    if (mergedForUid.current === user.uid) return;
    mergedForUid.current = user.uid;

    let cancelled = false;
    (async () => {
      try {
        const ref = doc(getDb(), "users", user.uid, "private", "cart");
        const snap = await getDoc(ref);
        const remote = snap.exists() ? ((snap.data().lines ?? []) as CartLine[]) : [];
        const remoteWishlist = snap.exists() ? ((snap.data().wishlist ?? []) as string[]) : [];
        if (cancelled) return;

        setLines((local) => {
          const merged = new Map(remote.map((l) => [l.lineId, l]));
          for (const l of local) {
            const existing = merged.get(l.lineId);
            merged.set(l.lineId, existing ? { ...l, quantity: Math.max(existing.quantity, l.quantity) } : l);
          }
          return [...merged.values()];
        });
        setWishlist((local) => [...new Set([...remoteWishlist, ...local])]);
      } catch (err) {
        console.error("[cart] could not restore saved cart", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  // Push changes back up for signed-in customers.
  useEffect(() => {
    if (!ready || !user || !isFirebaseConfigured) return;
    if (mergedForUid.current !== user.uid) return;
    const t = setTimeout(() => {
      setDoc(
        doc(getDb(), "users", user.uid, "private", "cart"),
        { lines, wishlist, updatedAt: Date.now() },
        { merge: true },
      ).catch((err) => console.error("[cart] could not save cart", err));
    }, 600);
    return () => clearTimeout(t);
  }, [lines, wishlist, ready, user]);

  useEffect(() => {
    if (!user) mergedForUid.current = null;
  }, [user]);

  const add = useCallback(
    (product: Product, quantity = 1, options: Record<string, string> = {}) => {
      const lineId = makeLineId(product.id, options);
      setLines((prev) => {
        const existing = prev.find((l) => l.lineId === lineId);
        const cap = Math.max(1, product.stock || 99);
        if (existing) {
          return prev.map((l) =>
            l.lineId === lineId ? { ...l, quantity: Math.min(cap, l.quantity + quantity) } : l,
          );
        }
        return [
          ...prev,
          {
            lineId,
            productId: product.id,
            slug: product.slug,
            title: product.title,
            image: product.image,
            price: product.price,
            mrp: product.mrp,
            quantity: Math.min(cap, quantity),
            selectedOptions: options,
            maxStock: cap,
          },
        ];
      });
      setLastAddedAt(Date.now());
    },
    [],
  );

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.lineId !== lineId)
        : prev.map((l) =>
            l.lineId === lineId ? { ...l, quantity: Math.min(l.maxStock || 99, quantity) } : l,
          ),
    );
  }, []);

  const remove = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );
  }, []);

  const value = useMemo<CartValue>(() => {
    // Re-price against the live catalog so an admin price change is reflected
    // in a cart that was filled before the change.
    const priced = lines.map((l) => {
      const product = byId.get(l.productId);
      return product ? { ...l, price: product.price, mrp: product.mrp, title: product.title } : l;
    });
    const subtotal = priced.reduce((sum, l) => sum + l.price * l.quantity, 0);
    const savings = priced.reduce((sum, l) => sum + Math.max(0, l.mrp - l.price) * l.quantity, 0);

    return {
      lines: priced,
      wishlist,
      count: priced.reduce((sum, l) => sum + l.quantity, 0),
      subtotal,
      savings,
      ready,
      add,
      setQuantity,
      remove,
      clear,
      toggleWishlist,
      inWishlist: (id: string) => wishlist.includes(id),
      lastAddedAt,
    };
  }, [lines, wishlist, byId, ready, add, setQuantity, remove, clear, toggleWishlist, lastAddedAt]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
