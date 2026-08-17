import { ProductEditor } from "@/components/admin/product-editor";

export const metadata = { title: "Edit product" };

export default async function Page(props: PageProps<"/admin/products/[id]">) {
  const { id } = await props.params;
  return <ProductEditor productId={id} />;
}
