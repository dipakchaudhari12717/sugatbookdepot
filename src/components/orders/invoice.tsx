"use client";

import { useCatalog } from "@/lib/catalog-context";
import type { Order } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/utils";

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on Delivery",
  upi: "UPI transfer",
  razorpay: "Card / UPI / Net banking (Razorpay)",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Payable on delivery",
  awaiting_verification: "Awaiting verification",
  paid: "Paid",
  refunded: "Refunded",
  failed: "Failed",
};

/**
 * A printable invoice on the shop's letterhead.
 *
 * Laid out for A4 and printed straight from the browser rather than generated
 * as a PDF server-side — no extra dependency, no server round trip, and the
 * customer gets the same document whether they print it or save it as PDF from
 * the print dialog.
 *
 * `print.css` rules in globals.css hide the rest of the page while printing, so
 * this component is the only thing that reaches the paper.
 */
export function Invoice({ order }: { order: Order }) {
  const { settings } = useCatalog();

  const savings = order.lines.reduce(
    (sum, l) => sum + Math.max(0, l.mrp - l.price) * l.quantity,
    0,
  );

  return (
    <div id="invoice" className="invoice-sheet">
      {/* ---------------- Letterhead ---------------- */}
      <header className="invoice-head">
        <div className="invoice-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sugat-mark.png" alt="" className="invoice-mark" />
          <div>
            <p className="invoice-shop">Sugat Book Depot</p>
            <p className="invoice-tag">Buddhist Literature &middot; Since 1967</p>
            <p className="invoice-addr">
              Dr. Ambedkar Road, Nagpur 440017, Maharashtra
              <br />
              {settings.contactPhone} &middot; {settings.contactEmail}
            </p>
          </div>
        </div>

        <div className="invoice-meta">
          <p className="invoice-word">Invoice</p>
          <table className="invoice-metatable">
            <tbody>
              <tr>
                <td>Invoice no.</td>
                <th>{order.orderNumber}</th>
              </tr>
              <tr>
                <td>Date</td>
                <th>{formatDate(order.createdAt)}</th>
              </tr>
              <tr>
                <td>Payment</td>
                <th>{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</th>
              </tr>
              <tr>
                <td>Status</td>
                <th>{PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}</th>
              </tr>
            </tbody>
          </table>
        </div>
      </header>

      {/* ---------------- Parties ---------------- */}
      <section className="invoice-parties">
        <div>
          <p className="invoice-label">Billed to</p>
          <p className="invoice-name">{order.address.fullName}</p>
          <address className="invoice-addr">
            {order.address.line1}
            {order.address.line2 && (
              <>
                <br />
                {order.address.line2}
              </>
            )}
            <br />
            {order.address.city}, {order.address.state} {order.address.pincode}
            <br />
            {order.address.phone}
            <br />
            {order.email}
          </address>
        </div>

        <div>
          <p className="invoice-label">Dispatched from</p>
          <p className="invoice-name">Sugat Book Depot</p>
          <address className="invoice-addr">
            Dr. Ambedkar Road
            <br />
            Nagpur 440017
            <br />
            Maharashtra, India
          </address>
          {order.trackingNumber && (
            <p className="invoice-addr" style={{ marginTop: ".5rem" }}>
              <strong>{order.trackingCarrier ?? "Courier"}</strong>
              <br />
              {order.trackingNumber}
            </p>
          )}
        </div>
      </section>

      {/* ---------------- Lines ---------------- */}
      <table className="invoice-lines">
        <thead>
          <tr>
            <th className="col-num">#</th>
            <th>Description</th>
            <th className="col-qty">Qty</th>
            <th className="col-money">Rate</th>
            <th className="col-money">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line, i) => (
            <tr key={line.lineId}>
              <td className="col-num">{i + 1}</td>
              <td>
                <span className="line-title">{line.title}</span>
                {Object.entries(line.selectedOptions).length > 0 && (
                  <span className="line-opts">
                    {Object.entries(line.selectedOptions)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ")}
                  </span>
                )}
              </td>
              <td className="col-qty">{line.quantity}</td>
              <td className="col-money">{formatPrice(line.price)}</td>
              <td className="col-money">{formatPrice(line.price * line.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ---------------- Totals ---------------- */}
      <section className="invoice-totals">
        <table>
          <tbody>
            <tr>
              <td>Subtotal</td>
              <td className="col-money">{formatPrice(order.subtotal)}</td>
            </tr>
            {savings > 0 && (
              <tr>
                <td>Catalogue savings</td>
                <td className="col-money">−{formatPrice(savings)}</td>
              </tr>
            )}
            {order.discount > 0 && (
              <tr>
                <td>Coupon {order.couponCode ? `(${order.couponCode})` : ""}</td>
                <td className="col-money">−{formatPrice(order.discount)}</td>
              </tr>
            )}
            <tr>
              <td>Delivery</td>
              <td className="col-money">
                {order.shipping === 0 ? "Free" : formatPrice(order.shipping)}
              </td>
            </tr>
            <tr className="grand">
              <td>Total</td>
              <td className="col-money">{formatPrice(order.total)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <p className="invoice-words">
        Amount in words: <strong>{rupeesInWords(order.total)}</strong>
      </p>

      {/* ---------------- Footer ---------------- */}
      <footer className="invoice-foot">
        <p>
          All prices are in Indian Rupees and inclusive of applicable taxes. Goods once sold are
          covered by our returns policy at sugatbookdepot.in/shipping.
        </p>
        <p className="invoice-thanks">
          Thank you for supporting Sugat Book Depot — publishing the Dhamma since 1967.
        </p>
        <p className="invoice-computer">
          This is a computer-generated invoice and is valid without a signature.
        </p>
      </footer>
    </div>
  );
}

/** Indian numbering, so ₹1,20,500 reads "One Lakh Twenty Thousand Five Hundred". */
export function rupeesInWords(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return "Zero Rupees Only";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
    "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const twoDigits = (v: number): string => {
    if (v < 20) return ones[v];
    const t = Math.floor(v / 10);
    const o = v % 10;
    return tens[t] + (o ? ` ${ones[o]}` : "");
  };

  const parts: string[] = [];
  // Indian grouping: crore, lakh, thousand, hundred, then the remainder.
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1000);
  const hundred = Math.floor((n % 1000) / 100);
  const rest = n % 100;

  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ones[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));

  return `${parts.join(" ")} Rupees Only`;
}
