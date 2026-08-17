import type { Metadata } from "next";
import { Suspense } from "react";

import { OrdersPage } from "@/components/orders/orders-page";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = {
  title: "Your orders",
  description: "Track your Sugat Book Depot orders and view your order history.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container-page flex min-h-[50vh] items-center justify-center">
          <Spinner className="size-7" />
        </div>
      }
    >
      <OrdersPage />
    </Suspense>
  );
}
