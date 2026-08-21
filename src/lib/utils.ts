import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** ₹1,250 — no decimals, because every price in this catalog is a whole rupee. */
export function formatPrice(value: number) {
  return inr.format(Math.round(value));
}

export function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** True when the string contains Devanagari, so we can switch the font. */
export function hasDevanagari(text: string) {
  return /[ऀ-ॿ]/.test(text);
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** SBD-7K2M9 — short, human-readable, and easy to read out over the phone. */
export function generateOrderNumber() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `SBD-${suffix}`;
}

/** Stable key for a product + chosen options, so the cart merges duplicates. */
export function makeLineId(productId: string, options: Record<string, string>) {
  const suffix = Object.keys(options)
    .sort()
    .map((k) => `${k}:${options[k]}`)
    .join("|");
  return suffix ? `${productId}__${suffix}` : productId;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: A) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Indian mobile numbers: 10 digits starting 6-9, optional +91 prefix. */
export function isValidPhone(phone: string) {
  return /^(\+?91[-\s]?)?[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, ""));
}

export function isValidPincode(pin: string) {
  return /^[1-9][0-9]{5}$/.test(pin.trim());
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Firebase auth error codes are not fit for humans. */
export function authErrorMessage(code: string) {
  const map: Record<string, string> = {
    "auth/invalid-email": "That email address does not look right.",
    "auth/user-disabled": "This account has been disabled. Please contact us.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/email-already-in-use": "An account already exists with that email.",
    "auth/weak-password": "Please choose a password of at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Network problem. Check your connection and try again.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/operation-not-allowed": "This sign-in method is not enabled for the project.",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}

/**
 * Pull the video id out of any shape of YouTube link people actually paste —
 * a watch URL, a share link, an embed, a Short, or the bare id itself.
 */
export function youtubeId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (/^[\w-]{11}$/.test(value)) return value;

  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = value.match(re);
    if (m) return m[1];
  }
  return null;
}

/** YouTube's own thumbnail, so a video needs no separate poster upload. */
export function youtubeThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
