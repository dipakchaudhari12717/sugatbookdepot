import type { Metadata } from "next";

import { BlogPostView } from "@/components/blog/blog-post";
import { decodeSlugParam } from "@/lib/utils";

export async function generateMetadata(props: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const slug = decodeSlugParam((await props.params).slug);
  // Posts live only in Firestore, so the title is resolved on the client.
  // A readable fallback keeps the tab and share preview sensible.
  const readable = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: readable,
    description: "Writing from Sugat Book Depot.",
    alternates: { canonical: `/blog/${slug}` },
  };
}

export default async function Page(props: PageProps<"/blog/[slug]">) {
  // Devanagari slugs reach us percent-encoded; decode so the lookup against
  // the stored slug can match.
  const slug = decodeSlugParam((await props.params).slug);
  return <BlogPostView slug={slug} />;
}
