import { AdminOrderDetail } from "@/components/admin/admin-order-detail";

export const metadata = { title: "Order" };

export default async function Page(props: PageProps<"/admin/orders/[id]">) {
  const { id } = await props.params;
  return <AdminOrderDetail orderId={id} />;
}
