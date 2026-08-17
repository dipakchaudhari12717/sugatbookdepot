import type { Metadata } from "next";

import { PolicyPage } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms on which Sugat Book Depot sells books, Chivar and related products.",
  alternates: { canonical: "/terms" },
};

export default function Page() {
  return (
    <PolicyPage
      eyebrow="Policy"
      title="Terms of service"
      intro="These terms apply when you order from sugatbookdepot.in."
      sections={[
        {
          heading: "Orders",
          body: [
            "Placing an order is an offer to buy. We confirm the order once we have checked stock and, for prepaid orders, received payment. If we cannot fulfil an item we will contact you and refund it.",
            "Prices are in Indian Rupees and inclusive of applicable taxes. We may correct pricing errors before dispatch; if a correction affects your order we will tell you first.",
          ],
        },
        {
          heading: "Stock",
          body: [
            "Availability shown on the site reflects our stock at the time of viewing. Occasionally a title sells out between your order and our packing — in that case we refund the item in full.",
          ],
        },
        {
          heading: "Chivar and religious articles",
          body: [
            "Chivar is supplied as a religious article for monastic use and for Dana offerings. Sizes are traditional rather than commercial garment sizes; please read the size guide on the product page before ordering.",
            "Returns on Chivar are accepted only where the robe is unused, unwashed and in original packing.",
          ],
        },
        {
          heading: "Cancellations",
          body: [
            "You may cancel an order any time before it is marked as packed by contacting us with your order number. After dispatch, the returns policy applies instead.",
          ],
        },
        {
          heading: "Content",
          body: [
            "Product descriptions, photographs and the text on this site belong to Sugat Book Depot. Book contents remain the property of their respective authors and publishers.",
          ],
        },
        {
          heading: "Governing law",
          body: [
            "These terms are governed by the laws of India, and disputes fall under the jurisdiction of the courts at Nagpur, Maharashtra.",
          ],
        },
      ]}
    />
  );
}
