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

/**
 * Reads a JSON body without assuming there is one.
 *
 * A misconfigured deployment answers these endpoints with an HTML error page,
 * and calling .json() on that throws `Unexpected token '<'` — a parser message
 * shown to a customer trying to pay. Anything that is not JSON comes back as
 * null so the caller can say something useful instead.
 */
async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  if (!res.headers.get("content-type")?.includes("application/json")) return null;
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Raised when the payment endpoints are not reachable on this deployment. */
export class PaymentUnavailable extends Error {
  constructor() {
    super(
      "Online payment is not available on this site at the moment. " +
        "Please choose Cash on Delivery, or contact the shop to pay another way.",
    );
    this.name = "PaymentUnavailable";
  }
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
  const order = await readJson(orderRes);
  if (!orderRes.ok || !order) {
    // 404 means the route handler is not deployed at all, rather than the keys
    // being absent — which the endpoint itself reports as a 503.
    if (orderRes.status === 404 || !order) {
      console.error(
        `[razorpay] /api/razorpay/order answered ${orderRes.status} without JSON. ` +
          "The route handler is probably not deployed on this host.",
      );
      throw new PaymentUnavailable();
    }
    throw new Error(String(order.error ?? "Could not start the payment."));
  }

  await loadScript();
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error("Could not reach Razorpay. Please try again.");

  const success = await new Promise<RazorpaySuccess>((resolve, reject) => {
    const rzp = new Razorpay({
      key: order.keyId as string,
      order_id: order.orderId as string,
      amount: order.amount as number,
      currency: order.currency as string,
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
  const verified = await readJson(verifyRes);
  if (!verifyRes.ok || !verified?.verified) {
    throw new Error(
      String(
        verified?.error ??
          "We could not confirm that payment. If money has left your account, " +
            `contact us quoting ${success.razorpay_payment_id} — do not pay again.`,
      ),
    );
  }

  return {
    paymentId: String(verified.paymentId),
    orderId: String(verified.orderId),
    method: (verified.method as string | null) ?? null,
  };
}
