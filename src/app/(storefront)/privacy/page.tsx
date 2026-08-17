import type { Metadata } from "next";

import { PolicyPage } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Sugat Book Depot collects, uses and protects your personal information.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return (
    <PolicyPage
      eyebrow="Policy"
      title="Privacy policy"
      intro="We ask for as little as we need to get your order to you, and we do not sell your information to anyone."
      sections={[
        {
          heading: "What we collect",
          body: [
            "When you place an order we collect your name, delivery address, phone number and email address. If you create an account we also store your saved addresses and wishlist.",
            "Payment details are never stored on our servers. Cash on Delivery is settled with the courier; UPI transfers happen inside your own UPI app and we only record the reference number you give us.",
          ],
        },
        {
          heading: "How we use it",
          body: [
            "To pack and deliver your order, to keep you updated on its status, and to answer your questions when you contact us.",
            "If you subscribe to our newsletter we will occasionally email you about new titles and festival offers. Every such email has an unsubscribe option.",
          ],
        },
        {
          heading: "Who we share it with",
          body: [
            "Only with the courier partner delivering your parcel, and only the details they need to deliver it.",
            "Our website and database run on Google Firebase, which processes data on our behalf under Google's own security and privacy commitments.",
          ],
        },
        {
          heading: "Cookies and analytics",
          body: [
            "We use minimal browser storage to remember your bag and wishlist between visits. We use Google Analytics to understand which pages are useful, in aggregate.",
          ],
        },
        {
          heading: "Your choices",
          body: [
            "You can view and edit your profile and saved addresses at any time from your account page.",
            "To have your account and its data deleted, write to us at sugat4books@gmail.com and we will action it.",
          ],
        },
      ]}
    />
  );
}
