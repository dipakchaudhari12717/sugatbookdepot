import type { Metadata } from "next";

import { BlogPostView } from "@/components/blog/blog-post";

export async function generateMetadata(props: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
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
  const { slug } = await props.params;
  return <BlogPostView slug={slug} />;
}
