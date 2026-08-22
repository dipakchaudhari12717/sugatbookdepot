import type { Metadata } from "next";

import { PolicyPage } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Shipping & returns",
  description: "Delivery timelines, charges and the returns process at Sugat Book Depot.",
  alternates: { canonical: "/shipping" },
};

export default function Page() {
  return (
    <PolicyPage
      eyebrow="Policy"
      title="Shipping & returns"
      sections={[
        {
          heading: "Where we deliver",
          body: [
            "We deliver to addresses across India. Orders are dispatched from Nagpur, Maharashtra.",
            "If your PIN code is outside our current serviceable list, the checkout will tell you before you pay — message us on WhatsApp and we will usually still find a way to get your order to you.",
          ],
        },
        {
          heading: "Charges & timelines",
          body: [
            "Delivery is free on orders above ₹499. Below that, a flat charge applies and is shown at checkout before you pay.",
            "Orders are usually packed within 1–2 working days. Delivery typically takes 3–7 working days within Maharashtra and 5–10 working days elsewhere in India. Festival periods and Kathina season can add a few days.",
          ],
        },
        {
          heading: "Tracking your order",
          body: [
            "Every order gets an order number in the form SBD-12345-22082026 — a serial and the date it was placed. Use it on the Track order page, or open the order from your account.",
            "Once your parcel is handed to the courier, the tracking number appears on your order page.",
          ],
        },
        {
          heading: "Packing",
          body: [
            "Books are wrapped to arrive flat and dry. Chivar is folded and packed ready for offering. Statues are packed with additional protection.",
          ],
        },
        {
          heading: "Damage & returns",
          body: [
            "If a book arrives damaged or you receive the wrong title, tell us within 7 days of delivery with a photograph and we will replace it or refund you.",
            "Because Chivar is a religious article, we can only accept returns on robes that are unused, unwashed and in their original packing.",
            "Refunds for prepaid orders are returned to the original payment method. Cash on Delivery refunds are made by UPI transfer.",
          ],
        },
        {
          heading: "Bulk and institutional orders",
          body: [
            "Viharas, monastery trusts, schools and institutions can order in bulk at special pricing, with consolidated dispatch. Message us on WhatsApp for a quote.",
          ],
        },
      ]}
    />
  );
}
