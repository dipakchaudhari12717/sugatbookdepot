/**
 * Razorpay, server side only.
 *
 * Nothing in this file may be imported from a client component: it reads
 * RAZORPAY_KEY_SECRET, which must never reach the browser. The route handlers
 * under src/app/api/razorpay are the only callers.
 *
 * Talks to the REST API with plain fetch and signs with node:crypto, so there
 * is no SDK to install or keep up to date.
 */
import crypto from "node:crypto";

const API = "https://api.razorpay.com/v1";

export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";

/** Both halves must be present — the id alone only gets you a 401. */
export function isRazorpayReady() {
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

function authHeader() {
  const basic = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
  return `Basic ${basic}`;
}

async function callRazorpay<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (body as { error?: { description?: string } })?.error?.description ??
      `Razorpay responded ${res.status}`;
    throw new Error(message);
  }
  return body as T;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string | null;
  status: string;
  amount_paid: number;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  email: string | null;
  contact: string | null;
}

/**
 * Razorpay counts in paise, and rejects anything that is not a whole number,
 * so the rupee total is rounded here rather than at the call site.
 */
export function toPaise(rupees: number) {
  return Math.round(rupees * 100);
}

export function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  return callRazorpay<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
      payment_capture: 1,
      notes: input.notes ?? {},
    }),
  });
}

export function fetchRazorpayPayment(paymentId: string) {
  return callRazorpay<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

/**
 * The handshake Razorpay documents: HMAC-SHA256 of "<order_id>|<payment_id>"
 * keyed with the secret. Compared in constant time so a wrong signature cannot
 * be narrowed down by timing the response.
 */
export function isValidPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  const given = Buffer.from(input.signature, "utf8");
  const mine = Buffer.from(expected, "utf8");
  return given.length === mine.length && crypto.timingSafeEqual(given, mine);
}
