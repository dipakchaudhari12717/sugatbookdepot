/** Domain types shared by the storefront and the admin panel. */

export type CategorySlug =
  | "chivar"
  | "buddhism"
  | "ambedkar"
  | "biographies"
  | "academics"
  | "statues"
  | "stationery";

export interface Category {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  order: number;
  featured: boolean;
  tagline: string;
  description: string;
  productCount?: number;
}

export interface ProductOption {
  title: string;
  values: string[];
}

export interface SizeGuideRow {
  label: string;
  detail: string;
}

export interface Product {
  id: string;
  slug: string;
  sku: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  category: string;
  description: string;
  descriptionHtml: string;
  images: string[];
  image: string | null;
  /** Printed / list price in rupees. */
  mrp: number;
  /** Discounted price in rupees, or null when sold at MRP. */
  salePrice: number | null;
  /** Effective price customers pay. */
  price: number;
  discountPercent: number;
  currency: string;
  stock: number;
  inStock: boolean;
  author: string | null;
  language: string | null;
  publisher: string | null;
  binding: string | null;
  brand: string | null;
  material: string | null;
  care: string | null;
  sizeGuide: SizeGuideRow[] | null;
  bulkEnquiry: boolean;
  featured: boolean;
  tags: string[];
  options: ProductOption[];
  /**
   * Images grouped by an option value, so picking a colour swaps the gallery
   * the way Flipkart does. Shape: { Color: { Orange: [url, ...], ... } }.
   * Anything not listed under a value is treated as shared across all values.
   */
  optionImages?: Record<string, Record<string, string[]>> | null;
  searchTokens: string[];
  rating: number | null;
  reviewCount: number;
  createdAt?: number;
  updatedAt?: number;
}

/** A product plus the specific option values chosen, as stored in the cart. */
export interface CartLine {
  productId: string;
  slug: string;
  title: string;
  image: string | null;
  price: number;
  mrp: number;
  quantity: number;
  /** e.g. { Size: "Free size 2 piece set", Color: "Orange" } */
  selectedOptions: Record<string, string>;
  /** Stable key for a product + option combination. */
  lineId: string;
  maxStock: number;
}

export interface Address {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
}

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
];

export type PaymentMethod = "cod" | "upi";
export type PaymentStatus = "pending" | "awaiting_verification" | "paid" | "refunded" | "failed";

export interface OrderEvent {
  status: OrderStatus;
  at: number;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  /** Set for guest checkouts (FR-3.4). */
  isGuest: boolean;
  email: string;
  phone: string;
  address: Address;
  lines: CartLine[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  shipping: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  /** UPI reference / UTR the customer submits for manual verification. */
  paymentReference: string | null;
  timeline: OrderEvent[];
  trackingCarrier: string | null;
  trackingNumber: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Coupon {
  id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  active: boolean;
  startsAt: number | null;
  expiresAt: number | null;
  usageLimit: number | null;
  usedCount: number;
  description: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  image: string | null;
  active: boolean;
  order: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  addresses: Address[];
  wishlist: string[];
  role: "customer" | "admin";
  createdAt: number;
  orderCount?: number;
  totalSpent?: number;
}

export interface StoreSettings {
  /** Orders at or above this subtotal ship free. */
  freeShippingThreshold: number;
  shippingFlatRate: number;
  /** Pincode prefixes the shop delivers to; empty = deliver everywhere. */
  serviceablePincodes: string[];
  codEnabled: boolean;
  upiEnabled: boolean;
  upiId: string;
  announcement: string;
  /** Which shopfront banner sits at the very top: Marathi, English, or none. */
  bannerLang: "mr" | "en" | "off";
  whatsappNumber: string;
  contactEmail: string;
  contactPhone: string;
}

/* -------------------------------------------------------------------------
   Gallery & blog — both authored in the admin panel, both public to read
   ------------------------------------------------------------------------- */

export interface GalleryItem {
  id: string;
  title: string;
  description: string;
  image: string;
  /** Free-text grouping shown as filter chips, e.g. "Shop", "Chivar Daan". */
  album: string;
  /** Lower numbers appear first; ties fall back to newest. */
  order: number;
  published: boolean;
  takenOn: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  /** Body as HTML, authored in the admin editor. */
  contentHtml: string;
  coverImage: string | null;
  author: string;
  tags: string[];
  published: boolean;
  publishedAt: number | null;
  readingMinutes: number;
  createdAt: number;
  updatedAt: number;
}

export const GALLERY_ALBUMS = [
  "Shop",
  "Chivar Daan",
  "Events",
  "Publications",
  "Community",
] as const;
