/**
 * Browser half of the Razorpay flow.
 *
 * Razorpay's widget is a hosted script rather than an npm package, so it is
 * injected on demand — a shop that never switches card payments on pays no
 * download for it.
 */

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (payload: { error?: { description?: string } }) => void) => void;
}

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Not in a browser."));
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let a later attempt retry rather than caching the failure for good.
      scriptPromise = null;
      reject(new Error("Could not reach Razorpay. Check your connection and try again."));
    };
    if (!existing) document.body.appendChild(script);
  });

  return scriptPromise;
}

export class PaymentCancelled extends Error {
  constructor() {
    super("Payment was cancelled.");
    this.name = "PaymentCancelled";
  }
}

export interface PayInput {
  /** Rupees, as shown to the customer. Converted to paise on the server. */
  amount: number;
  receipt: string;
  name: string;
  email: string;
  phone: string;
  /** Shown as the line item inside the Razorpay modal. */
  description: string;
}

export interface PaidResult {
  paymentId: string;
  orderId: string;
  method: string | null;
}

/**
 * Opens the widget and resolves only once the server has confirmed the payment
 * with Razorpay. Rejects with PaymentCancelled if the customer closes the
 * modal, so the caller can stay quiet rather than showing an error.
 */
export async function payWithRazorpay(input: PayInput): Promise<PaidResult> {
  const orderRes = await fetch("/api/razorpay/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: input.amount,
      receipt: input.receipt,
      email: input.email,
      phone: input.phone,
    }),
  });
  const order = await orderRes.json();
  if (!orderRes.ok) throw new Error(order?.error ?? "Could not start the payment.");

  await loadScript();
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error("Could not reach Razorpay. Please try again.");

  const success = await new Promise<RazorpaySuccess>((resolve, reject) => {
    const rzp = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "Sugat Book Depot",
      description: input.description,
      image: "/brand/sugat-mark.png",
      prefill: { name: input.name, email: input.email, contact: input.phone },
      notes: { receipt: input.receipt },
      theme: { color: "#c9711f" },
      modal: {
        ondismiss: () => reject(new PaymentCancelled()),
      },
      handler: (response: RazorpaySuccess) => resolve(response),
    });

    rzp.on("payment.failed", (payload) => {
      reject(new Error(payload?.error?.description ?? "The payment did not go through."));
    });

    rzp.open();
  });

  const verifyRes = await fetch("/api/razorpay/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...success, amount: input.amount }),
  });
  const verified = await verifyRes.json();
  if (!verifyRes.ok || !verified.verified) {
    throw new Error(
      verified?.error ??
        "We could not confirm that payment. If money has left your account, contact us with the payment id.",
    );
  }

  return {
    paymentId: verified.paymentId,
    orderId: verified.orderId,
    method: verified.method ?? null,
  };
}
