import type { Metadata } from "next";

import { HomePage } from "@/components/home/home-page";

export const metadata: Metadata = {
  title: "Sugat Book Depot — Buddhist Literature, Ambedkar Sahitya & Chivar",
  description:
    "Since 1967, Buddhist and Ambedkarite literature in Marathi, Hindi, Pali and English. Chivar (monk robes) for Varshavas and Kathina, Buddha statues and school stationery — delivered across India.",
  alternates: { canonical: "/" },
};

export default function Page() {
  return <HomePage />;
}
