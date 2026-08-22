import { NextResponse } from "next/server";

import {
  fetchRazorpayPayment,
  isRazorpayReady,
  isValidPaymentSignature,
  toPaise,
} from "@/lib/razorpay-server";

export const dynamic = "force-dynamic";

/**
 * Confirms a payment actually happened before the order is written to
 * Firestore.
 *
 * Two independent checks, because the signature alone only proves the browser
 * saw a genuine Razorpay response — it says nothing about how much was paid:
 *
 *   1. the HMAC handshake, which rules out a forged callback, and
 *   2. a read straight from Razorpay confirming the payment is captured, is
 *      attached to the order we opened, and is for the amount we expected.
 */
export async function POST(request: Request) {
  if (!isRazorpayReady()) {
    return NextResponse.json(
      { error: "Razorpay is not configured on this deployment." },
      { status: 503 },
    );
  }

  let body: {
    razorpay_order_id?: unknown;
    razorpay_payment_id?: unknown;
    razorpay_signature?: unknown;
    amount?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const orderId = String(body.razorpay_order_id ?? "");
  const paymentId = String(body.razorpay_payment_id ?? "");
  const signature = String(body.razorpay_signature ?? "");
  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ verified: false, error: "Incomplete payment details." }, { status: 400 });
  }

  if (!isValidPaymentSignature({ orderId, paymentId, signature })) {
    console.warn("[razorpay] signature mismatch", { orderId, paymentId });
    return NextResponse.json({ verified: false, error: "Payment could not be verified." }, { status: 400 });
  }

  try {
    const payment = await fetchRazorpayPayment(paymentId);

    if (payment.order_id !== orderId) {
      return NextResponse.json(
        { verified: false, error: "Payment does not belong to this order." },
        { status: 400 },
      );
    }
    // "captured" is money settled to the account. "authorized" means the bank
    // has only put a hold on it, which for auto-capture should not happen.
    if (payment.status !== "captured") {
      return NextResponse.json(
        { verified: false, error: `Payment is ${payment.status}, not captured.` },
        { status: 400 },
      );
    }

    const expected = toPaise(Number(body.amount));
    if (Number.isFinite(expected) && expected > 0 && payment.amount !== expected) {
      console.warn("[razorpay] amount mismatch", { expected, paid: payment.amount, paymentId });
      return NextResponse.json(
        { verified: false, error: "Paid amount does not match the order." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      verified: true,
      paymentId: payment.id,
      orderId: payment.order_id,
      method: payment.method,
      amount: payment.amount,
    });
  } catch (err) {
    console.error("[razorpay] verification lookup failed", err);
    return NextResponse.json({ verified: false, error: "Could not confirm the payment." }, { status: 502 });
  }
}
