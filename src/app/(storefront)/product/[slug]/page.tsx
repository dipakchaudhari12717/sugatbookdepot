import type { Metadata } from "next";

import { ProductDetail } from "@/components/product/product-detail";
import { FALLBACK_PRODUCTS } from "@/lib/catalog-fallback";
import { decodeSlugParam } from "@/lib/utils";

/**
 * Pre-render the catalog we migrated. Products added later in the admin panel
 * still work — they render on demand and the client subscription fills in the
 * live data.
 */
export function generateStaticParams() {
  return FALLBACK_PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/product/[slug]">): Promise<Metadata> {
  const slug = decodeSlugParam((await props.params).slug);
  const product = FALLBACK_PRODUCTS.find((p) => decodeSlugParam(p.slug) === slug);

  if (!product) {
    return { title: "Product" };
  }

  const description = product.description.slice(0, 180).trim();
  return {
    title: product.title,
    description: description || product.subtitle || undefined,
    alternates: { canonical: `/product/${slug}` },
    openGraph: {
      title: product.title,
      description,
      images: product.image ? [{ url: product.image }] : undefined,
      type: "website",
    },
  };
}

export default async function Page(props: PageProps<"/product/[slug]">) {
  // Non-ASCII slugs arrive percent-encoded — decode so the catalog lookup hits.
  const slug = decodeSlugParam((await props.params).slug);
  return <ProductDetail slug={slug} />;
}
