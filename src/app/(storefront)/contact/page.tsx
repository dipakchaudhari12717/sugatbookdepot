import type { Metadata } from "next";

import { ContactPage } from "@/components/contact/contact-page";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Call, email or message Sugat Book Depot — Dr. Ambedkar Road, Nagpur. Questions about a title, an order, or a bulk Chivar order for your vihara.",
  alternates: { canonical: "/contact" },
};

export default function Page() {
  return <ContactPage />;
}
