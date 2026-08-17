import type { Metadata } from "next";

import { CartPage } from "@/components/cart/cart-page";

export const metadata: Metadata = {
  title: "Your bag",
  description: "Review the books, robes and stationery in your Sugat Book Depot bag.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <CartPage />;
}
