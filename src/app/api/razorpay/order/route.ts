import { NextResponse } from "next/server";

import {
  RAZORPAY_KEY_ID,
  createRazorpayOrder,
  isRazorpayReady,
  toPaise,
} from "@/lib/razorpay-server";

/** Never prerender or cache — every call mints a fresh Razorpay order. */
export const dynamic = "force-dynamic";

/**
 * Opens a Razorpay order so the browser has something to hand the checkout
 * widget. The secret stays here; the browser only ever learns the order id and
 * the publishable key id.
 */
export async function POST(request: Request) {
  if (!isRazorpayReady()) {
    return NextResponse.json(
      { error: "Razorpay is not configured on this deployment." },
      { status: 503 },
    );
  }

  let body: { amount?: unknown; receipt?: unknown; email?: unknown; phone?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
  }
  // A book shop has no legitimate ten-lakh order; this only exists so a bad
  // request cannot open an absurd order against the account.
  if (amount > 1_000_000) {
    return NextResponse.json({ error: "Amount is out of range." }, { status: 400 });
  }

  try {
    const order = await createRazorpayOrder({
      amountPaise: toPaise(amount),
      receipt: typeof body.receipt === "string" ? body.receipt : `sbd-${Date.now()}`,
      notes: {
        email: typeof body.email === "string" ? body.email.slice(0, 120) : "",
        phone: typeof body.phone === "string" ? body.phone.slice(0, 20) : "",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("[razorpay] could not create order", err);
    return NextResponse.json({ error: "Could not start the payment." }, { status: 502 });
  }
}
