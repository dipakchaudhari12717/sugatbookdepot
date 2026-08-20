import type { Metadata } from "next";

import { WishlistPage } from "@/components/wishlist-page";

export const metadata: Metadata = {
  title: "Your wishlist",
  description: "Titles you have saved to read or order later.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <WishlistPage />;
}
