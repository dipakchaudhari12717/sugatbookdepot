import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Noto_Serif_Devanagari } from "next/font/google";

import "./globals.css";
import { Providers } from "@/components/providers";

/** Literary, slightly bookish display face for headings and prices. */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/** Many titles in this catalog are Marathi/Hindi — they need a real face. */
const notoDeva = Noto_Serif_Devanagari({
  variable: "--font-noto-deva",
  subsets: ["devanagari"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const SITE_URL = "https://sugatbookdepot.in";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Sugat Book Depot — Buddhist Literature, Ambedkar Sahitya & Chivar",
    template: "%s | Sugat Book Depot",
  },
  description:
    "Established 1967. Publishing and retailing Buddhist literature and Dr. Babasaheb Ambedkar's writings. Books in Marathi, Hindi, Pali and English, Chivar (monk robes), Buddha statues and stationery — delivered across India.",
  keywords: [
    "Buddhist books",
    "Ambedkar books",
    "Chivar",
    "monk robe",
    "Chivar Daan",
    "Buddha and His Dhamma",
    "Marathi Buddhist literature",
    "Sugat Prakashan",
    "Buddha statue",
    "Nagpur book depot",
  ],
  authors: [{ name: "Sugat Book Depot" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "Sugat Book Depot",
    title: "Sugat Book Depot — Buddhist Literature, Ambedkar Sahitya & Chivar",
    description:
      "Since 1967 — Buddhist and Ambedkarite literature, Chivar (monk robes) and devotional artefacts. Delivered across India.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sugat Book Depot",
    description: "Buddhist literature, Ambedkar Sahitya, Chivar and Buddha statues.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#fbf7ef",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `data-scroll-behavior` tells Next that the smooth scrolling in globals.css
    // is intentional, so it suppresses smooth-scroll during route transitions
    // (which would otherwise animate the jump to the top of a new page).
    <html lang="en-IN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${inter.variable} ${notoDeva.variable} antialiased`}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-saffron focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
