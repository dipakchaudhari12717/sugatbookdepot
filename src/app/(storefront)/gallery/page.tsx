import type { Metadata } from "next";

import { GalleryPage } from "@/components/gallery/gallery-page";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Photographs from Sugat Book Depot — the shop in Nagpur, Chivar Daan offerings, vihara events and the community we have served since 1967.",
  alternates: { canonical: "/gallery" },
};

export default function Page() {
  return <GalleryPage />;
}
