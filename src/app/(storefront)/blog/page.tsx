import type { Metadata } from "next";

import { BlogList } from "@/components/blog/blog-list";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Writing from Sugat Book Depot on Buddhist literature, Dr. Babasaheb Ambedkar's works, Chivar Daan and the practice of Dana.",
  alternates: { canonical: "/blog" },
};

export default function Page() {
  return <BlogList />;
}
