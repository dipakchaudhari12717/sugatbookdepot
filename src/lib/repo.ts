"use client";

/**
 * Firestore data access. Everything the storefront reads goes through a
 * realtime subscription, so an edit in /admin shows up on the storefront
 * without a refresh — that is the "admin and shop stay in sync" requirement.
 *
 * Read budget: the catalog is ~50 documents. `onSnapshot` charges for the
 * initial document set and then only for changes, which keeps a small shop
 * comfortably inside the Firestore free tier.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";

import { getDb, isFirebaseConfigured } from "./firebase";
import { FALLBACK_CATEGORIES, FALLBACK_PRODUCTS } from "./catalog-fallback";
import type {
  Banner,
  BlogPost,
  Category,
  Coupon,
  GalleryItem,
  Order,
  OrderStatus,
  Product,
  StoreSettings,
  UserProfile,
} from "./types";
import { generateOrderNumber } from "./utils";

export const DEFAULT_SETTINGS: StoreSettings = {
  freeShippingThreshold: 499,
  shippingFlatRate: 49,
  serviceablePincodes: [],
  codEnabled: true,
  upiEnabled: true,
  upiId: "sugatbookdepot@upi",
  announcement: "Free delivery across India on orders above ₹499",
  whatsappNumber: "917709001950",
  contactEmail: "sugat4books@gmail.com",
  contactPhone: "+91 90286 04644",
};

/* -------------------------------------------------------------------------
   Products
   ------------------------------------------------------------------------- */

function normaliseProduct(id: string, data: Record<string, unknown>): Product {
  const mrp = Number(data.mrp ?? 0);
  const salePrice = data.salePrice == null ? null : Number(data.salePrice);
  const price = salePrice != null && salePrice < mrp ? salePrice : mrp;
  return {
    ...(data as unknown as Product),
    id,
    mrp,
    salePrice,
    price,
    discountPercent: salePrice && mrp > 0 ? Math.round(((mrp - salePrice) / mrp) * 100) : 0,
    images: Array.isArray(data.images) ? (data.images as string[]) : [],
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    options: Array.isArray(data.options) ? (data.options as Product["options"]) : [],
    searchTokens: Array.isArray(data.searchTokens) ? (data.searchTokens as string[]) : [],
    stock: Number(data.stock ?? 0),
  };
}

/**
 * Subscribe to the whole catalog. Falls back to the bundled snapshot when
 * Firebase is unconfigured or the collection is still empty.
 */
export function subscribeProducts(
  onData: (products: Product[], source: "firestore" | "fallback") => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    onData(FALLBACK_PRODUCTS, "fallback");
    return () => {};
  }
  try {
    return onSnapshot(
      collection(getDb(), "products"),
      (snap) => {
        if (snap.empty) {
          onData(FALLBACK_PRODUCTS, "fallback");
          return;
        }
        onData(
          snap.docs.map((d) => normaliseProduct(d.id, d.data())),
          "firestore",
        );
      },
      (err) => {
        console.error("[repo] products subscription failed", err);
        onData(FALLBACK_PRODUCTS, "fallback");
        onError?.(err);
      },
    );
  } catch (err) {
    onData(FALLBACK_PRODUCTS, "fallback");
    onError?.(err as Error);
    return () => {};
  }
}

export function subscribeCategories(
  onData: (categories: Category[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    onData(FALLBACK_CATEGORIES);
    return () => {};
  }
  try {
    return onSnapshot(
      query(collection(getDb(), "categories"), orderBy("order")),
      (snap) => {
        if (snap.empty) {
          onData(FALLBACK_CATEGORIES);
          return;
        }
        onData(snap.docs.map((d) => ({ ...(d.data() as Category), id: d.id })));
      },
      (err) => {
        console.error("[repo] categories subscription failed", err);
        onData(FALLBACK_CATEGORIES);
        onError?.(err);
      },
    );
  } catch (err) {
    onData(FALLBACK_CATEGORIES);
    onError?.(err as Error);
    return () => {};
  }
}

export async function saveProduct(id: string | null, data: Partial<Product>) {
  const db = getDb();
  const payload = { ...data, updatedAt: Date.now() };
  if (id) {
    await updateDoc(doc(db, "products", id), payload);
    return id;
  }
  const ref = await addDoc(collection(db, "products"), {
    ...payload,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(getDb(), "products", id));
}

export async function setProductStock(id: string, stock: number) {
  await updateDoc(doc(getDb(), "products", id), {
    stock,
    inStock: stock > 0,
    updatedAt: Date.now(),
  });
}

/* -------------------------------------------------------------------------
   Categories
   ------------------------------------------------------------------------- */

export async function saveCategory(id: string | null, data: Partial<Category>) {
  const db = getDb();
  if (id) {
    await updateDoc(doc(db, "categories", id), data);
    return id;
  }
  const ref = await addDoc(collection(db, "categories"), data);
  return ref.id;
}

export async function deleteCategory(id: string) {
  await deleteDoc(doc(getDb(), "categories", id));
}

/* -------------------------------------------------------------------------
   Orders
   ------------------------------------------------------------------------- */

function normaliseOrder(id: string, data: Record<string, unknown>): Order {
  return { ...(data as unknown as Order), id };
}

export async function createOrder(
  input: Omit<Order, "id" | "orderNumber" | "createdAt" | "updatedAt" | "timeline" | "status">,
): Promise<Order> {
  const now = Date.now();
  const order = {
    ...input,
    orderNumber: generateOrderNumber(),
    status: "placed" as OrderStatus,
    timeline: [{ status: "placed" as OrderStatus, at: now, note: "Order received" }],
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(collection(getDb(), "orders"), order);
  return { ...order, id: ref.id };
}

export async function getOrder(id: string): Promise<Order | null> {
  const snap = await getDoc(doc(getDb(), "orders", id));
  return snap.exists() ? normaliseOrder(snap.id, snap.data()) : null;
}

/** Look an order up by its human-facing number (used by guest tracking). */
export async function findOrderByNumber(orderNumber: string): Promise<Order | null> {
  const snap = await getDocs(
    query(collection(getDb(), "orders"), where("orderNumber", "==", orderNumber.trim().toUpperCase()), fsLimit(1)),
  );
  const first = snap.docs[0];
  return first ? normaliseOrder(first.id, first.data()) : null;
}

export function subscribeUserOrders(
  userId: string,
  onData: (orders: Order[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(getDb(), "orders"), where("userId", "==", userId)),
    (snap) => {
      const orders = snap.docs.map((d) => normaliseOrder(d.id, d.data()));
      orders.sort((a, b) => b.createdAt - a.createdAt);
      onData(orders);
    },
    (err) => {
      console.error("[repo] user orders subscription failed", err);
      onError?.(err);
    },
  );
}

export function subscribeAllOrders(
  onData: (orders: Order[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(getDb(), "orders"), orderBy("createdAt", "desc"), fsLimit(300)),
    (snap) => onData(snap.docs.map((d) => normaliseOrder(d.id, d.data()))),
    (err) => {
      console.error("[repo] all orders subscription failed", err);
      onError?.(err);
    },
  );
}

export async function updateOrderStatus(order: Order, status: OrderStatus, note?: string) {
  await updateDoc(doc(getDb(), "orders", order.id), {
    status,
    timeline: [...order.timeline, { status, at: Date.now(), ...(note ? { note } : {}) }],
    updatedAt: Date.now(),
  });
}

export async function updateOrder(id: string, patch: Partial<Order>) {
  await updateDoc(doc(getDb(), "orders", id), { ...patch, updatedAt: Date.now() });
}

/**
 * Decrement stock for each line of a paid/confirmed order. Runs as one batch so
 * the catalog never ends up half-updated.
 */
export async function decrementStockForOrder(order: Order, products: Product[]) {
  const db = getDb();
  const batch = writeBatch(db);
  let touched = 0;
  for (const line of order.lines) {
    const product = products.find((p) => p.id === line.productId);
    if (!product) continue;
    const next = Math.max(0, product.stock - line.quantity);
    batch.update(doc(db, "products", product.id), {
      stock: next,
      inStock: next > 0,
      updatedAt: Date.now(),
    });
    touched++;
  }
  if (touched) await batch.commit();
}

/* -------------------------------------------------------------------------
   Coupons
   ------------------------------------------------------------------------- */

export function subscribeCoupons(onData: (coupons: Coupon[]) => void): Unsubscribe {
  if (!isFirebaseConfigured) {
    onData([]);
    return () => {};
  }
  return onSnapshot(
    collection(getDb(), "coupons"),
    (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as Coupon), id: d.id }))),
    (err) => {
      console.error("[repo] coupons subscription failed", err);
      onData([]);
    },
  );
}

export async function findCoupon(code: string): Promise<Coupon | null> {
  const snap = await getDocs(
    query(collection(getDb(), "coupons"), where("code", "==", code.trim().toUpperCase()), fsLimit(1)),
  );
  const first = snap.docs[0];
  return first ? { ...(first.data() as Coupon), id: first.id } : null;
}

export async function saveCoupon(id: string | null, data: Partial<Coupon>) {
  const db = getDb();
  if (id) {
    await updateDoc(doc(db, "coupons", id), data);
    return id;
  }
  const ref = await addDoc(collection(db, "coupons"), { ...data, usedCount: 0 });
  return ref.id;
}

export async function deleteCoupon(id: string) {
  await deleteDoc(doc(getDb(), "coupons", id));
}

/**
 * Validate a coupon against a cart subtotal and return the discount in rupees.
 * Returns an `error` string instead of throwing so the cart can show it inline.
 */
export function evaluateCoupon(
  coupon: Coupon | null,
  subtotal: number,
): { discount: number; error: string | null } {
  if (!coupon) return { discount: 0, error: "That code is not recognised." };
  if (!coupon.active) return { discount: 0, error: "This code is no longer active." };

  const now = Date.now();
  if (coupon.startsAt && now < coupon.startsAt) {
    return { discount: 0, error: "This code is not active yet." };
  }
  if (coupon.expiresAt && now > coupon.expiresAt) {
    return { discount: 0, error: "This code has expired." };
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { discount: 0, error: "This code has reached its usage limit." };
  }
  if (subtotal < coupon.minOrder) {
    return { discount: 0, error: `Spend ₹${coupon.minOrder} or more to use this code.` };
  }

  let discount =
    coupon.type === "percent" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, subtotal);

  return { discount, error: null };
}

/* -------------------------------------------------------------------------
   Banners
   ------------------------------------------------------------------------- */

export function subscribeBanners(onData: (banners: Banner[]) => void): Unsubscribe {
  if (!isFirebaseConfigured) {
    onData([]);
    return () => {};
  }
  return onSnapshot(
    collection(getDb(), "banners"),
    (snap) => {
      const banners = snap.docs.map((d) => ({ ...(d.data() as Banner), id: d.id }));
      banners.sort((a, b) => a.order - b.order);
      onData(banners);
    },
    () => onData([]),
  );
}

export async function saveBanner(id: string | null, data: Partial<Banner>) {
  const db = getDb();
  if (id) {
    await updateDoc(doc(db, "banners", id), data);
    return id;
  }
  const ref = await addDoc(collection(db, "banners"), data);
  return ref.id;
}

export async function deleteBanner(id: string) {
  await deleteDoc(doc(getDb(), "banners", id));
}

/* -------------------------------------------------------------------------
   Settings
   ------------------------------------------------------------------------- */

export function subscribeSettings(onData: (settings: StoreSettings) => void): Unsubscribe {
  if (!isFirebaseConfigured) {
    onData(DEFAULT_SETTINGS);
    return () => {};
  }
  return onSnapshot(
    doc(getDb(), "settings", "store"),
    (snap) =>
      onData(snap.exists() ? { ...DEFAULT_SETTINGS, ...(snap.data() as StoreSettings) } : DEFAULT_SETTINGS),
    () => onData(DEFAULT_SETTINGS),
  );
}

export async function saveSettings(patch: Partial<StoreSettings>) {
  await setDoc(doc(getDb(), "settings", "store"), patch, { merge: true });
}

/* -------------------------------------------------------------------------
   Users
   ------------------------------------------------------------------------- */

export async function ensureUserProfile(
  uid: string,
  seed: { email: string; displayName?: string },
): Promise<UserProfile> {
  const ref = doc(getDb(), "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { ...(snap.data() as UserProfile), uid };

  const profile: UserProfile = {
    uid,
    email: seed.email,
    displayName: seed.displayName ?? seed.email.split("@")[0],
    phone: "",
    addresses: [],
    wishlist: [],
    role: "customer",
    createdAt: Date.now(),
  };
  await setDoc(ref, profile);
  return profile;
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getDb(), "users", uid),
    (snap) => onData(snap.exists() ? { ...(snap.data() as UserProfile), uid } : null),
    () => onData(null),
  );
}

export async function updateUserProfile(uid: string, patch: Partial<UserProfile>) {
  await updateDoc(doc(getDb(), "users", uid), patch);
}

export function subscribeAllUsers(onData: (users: UserProfile[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(getDb(), "users"), fsLimit(500)),
    (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as UserProfile), uid: d.id }))),
    () => onData([]),
  );
}

/** True when this uid is listed in /admins (the rules check the same thing). */
export async function isAdminUid(uid: string) {
  try {
    const snap = await getDoc(doc(getDb(), "admins", uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function grantAdmin(uid: string, email: string) {
  await setDoc(doc(getDb(), "admins", uid), { email, grantedAt: serverTimestamp() });
}

export async function revokeAdmin(uid: string) {
  await deleteDoc(doc(getDb(), "admins", uid));
}

/* -------------------------------------------------------------------------
   Enquiries (bulk Chivar orders, contact form)
   ------------------------------------------------------------------------- */

export async function createEnquiry(data: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  kind: "contact" | "bulk" | "newsletter";
}) {
  await addDoc(collection(getDb(), "enquiries"), { ...data, createdAt: Date.now(), handled: false });
}

export function subscribeEnquiries(
  onData: (rows: (Record<string, unknown> & { id: string })[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(getDb(), "enquiries"), orderBy("createdAt", "desc"), fsLimit(200)),
    (snap) => onData(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
    () => onData([]),
  );
}

export async function markEnquiryHandled(id: string, handled: boolean) {
  await updateDoc(doc(getDb(), "enquiries", id), { handled });
}

/* -------------------------------------------------------------------------
   Gallery
   ------------------------------------------------------------------------- */

/**
 * `includeDrafts` is only ever true inside the admin panel. The storefront
 * filters client-side rather than with a `where` clause so we do not need a
 * composite index for a collection this small.
 */
export function subscribeGallery(
  onData: (items: GalleryItem[]) => void,
  includeDrafts = false,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    onData([]);
    return () => {};
  }
  return onSnapshot(
    collection(getDb(), "gallery"),
    (snap) => {
      const items = snap.docs
        .map((d) => ({ ...(d.data() as GalleryItem), id: d.id }))
        .filter((item) => includeDrafts || item.published !== false);
      items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (b.createdAt ?? 0) - (a.createdAt ?? 0));
      onData(items);
    },
    (err) => {
      console.error("[repo] gallery subscription failed", err);
      onData([]);
    },
  );
}

export async function saveGalleryItem(id: string | null, data: Partial<GalleryItem>) {
  const db = getDb();
  const now = Date.now();
  if (id) {
    await updateDoc(doc(db, "gallery", id), { ...data, updatedAt: now });
    return id;
  }
  const ref = await addDoc(collection(db, "gallery"), { ...data, createdAt: now, updatedAt: now });
  return ref.id;
}

export async function deleteGalleryItem(id: string) {
  await deleteDoc(doc(getDb(), "gallery", id));
}

/* -------------------------------------------------------------------------
   Blog
   ------------------------------------------------------------------------- */

export function subscribeBlogPosts(
  onData: (posts: BlogPost[]) => void,
  includeDrafts = false,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    onData([]);
    return () => {};
  }
  return onSnapshot(
    collection(getDb(), "posts"),
    (snap) => {
      const posts = snap.docs
        .map((d) => ({ ...(d.data() as BlogPost), id: d.id }))
        .filter((post) => includeDrafts || post.published !== false);
      posts.sort(
        (a, b) => (b.publishedAt ?? b.createdAt ?? 0) - (a.publishedAt ?? a.createdAt ?? 0),
      );
      onData(posts);
    },
    (err) => {
      console.error("[repo] blog subscription failed", err);
      onData([]);
    },
  );
}

export async function saveBlogPost(id: string | null, data: Partial<BlogPost>) {
  const db = getDb();
  const now = Date.now();
  if (id) {
    await updateDoc(doc(db, "posts", id), { ...data, updatedAt: now });
    return id;
  }
  const ref = await addDoc(collection(db, "posts"), { ...data, createdAt: now, updatedAt: now });
  return ref.id;
}

export async function deleteBlogPost(id: string) {
  await deleteDoc(doc(getDb(), "posts", id));
}

/** Rough reading time so posts can show "4 min read" without a word-count field. */
export function estimateReadingMinutes(html: string) {
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
