import type { Metadata } from "next";
import { Suspense } from "react";

import { ShopPage } from "@/components/shop/shop-page";
import { ProductCardSkeleton } from "@/components/product-card";

export const metadata: Metadata = {
  title: "Shop all — books, Chivar, statues & stationery",
  description:
    "Browse the full Sugat Book Depot catalogue: Buddhist literature, Dr. Babasaheb Ambedkar's writings, biographies, competitive-exam books, Chivar monk robes, Buddha statues and stationery.",
  alternates: { canonical: "/shop" },
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-14">
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      }
    >
      <ShopPage />
    </Suspense>
  );
}
