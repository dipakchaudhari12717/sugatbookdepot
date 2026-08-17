import type { Metadata } from "next";
import { Suspense } from "react";

import { OrderDetail } from "@/components/orders/order-detail";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
};

export default async function Page(props: PageProps<"/orders/[id]">) {
  const { id } = await props.params;
  return (
    <Suspense
      fallback={
        <div className="container-page flex min-h-[50vh] items-center justify-center">
          <Spinner className="size-7" />
        </div>
      }
    >
      <OrderDetail orderId={id} />
    </Suspense>
  );
}
