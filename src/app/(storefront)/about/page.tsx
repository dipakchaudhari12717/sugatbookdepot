import type { Metadata } from "next";
import Link from "next/link";

import { LinkButton } from "@/components/ui";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Sugat Book Depot has published and retailed Buddhist literature and Dr. Babasaheb Ambedkar's writings for thirty years, from Nagpur to readers across India.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="container-page py-12 lg:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Our story</p>
        <h1 className="rule-ornament mt-4 font-display text-4xl leading-tight font-semibold text-ink sm:text-5xl">
          Thirty years of the Dhamma in print
        </h1>

        <div className="prose-book mt-10 text-base">
          <p>
            Sugat Book Depot began in Nagpur with a straightforward conviction: that the literature
            of the Buddhist and Ambedkarite movement should be available to the people it was
            written for, in the languages they actually read.
          </p>
          <p>
            For three decades we have published and sold that literature — the Pali commentaries and
            the Jataka tales, the collected writings and speeches of Dr. Babasaheb Ambedkar, the
            biographies of the reformers who shaped modern India. Much of it we publish ourselves
            under the <strong>Sugat Prakashan</strong> imprint, in Marathi, Hindi, Pali and English.
          </p>
          <p>
            Alongside the books we supply <strong>Chivar</strong> — monastic robes woven to
            Vinaya-prescribed patterns — for Varshavas, for Kathina robe-offering season, and for the
            daily life of the Sangha. We serve individual devotees making an offering of Dana, and
            viharas and monastery trusts ordering in bulk.
          </p>
          <p>
            We also stock hand-finished Buddha statues for home altars and meditation spaces, and the
            everyday stationery that a neighbourhood book depot is expected to carry: pens, pencils,
            erasers, scales and sharpeners from the brands families have trusted for generations.
          </p>
          <p>
            What began as a single shop now reaches readers, practitioners, students and institutions
            across India. The shop counter is still there. This site simply widens the door.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {[
            ["30+", "Years in publishing"],
            ["47", "Titles & products"],
            ["4", "Languages in stock"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-rule bg-paper-raised p-6 text-center">
              <p className="font-display text-4xl font-semibold text-saffron-deep">{value}</p>
              <p className="mt-1.5 text-xs text-ink-faint">{label}</p>
            </div>
          ))}
        </div>

        <blockquote className="mt-12 border-l-2 border-saffron pl-6">
          <p className="font-display text-2xl leading-snug font-semibold text-ink">
            “You didn't come this far to stop.”
          </p>
          <footer className="mt-3 text-sm text-ink-faint">— The words we work by</footer>
        </blockquote>

        <div className="mt-12 flex flex-wrap gap-3">
          <LinkButton href="/shop" size="lg">
            Browse the collection
          </LinkButton>
          <LinkButton href="/contact" variant="secondary" size="lg">
            Get in touch
          </LinkButton>
        </div>

        <p className="mt-10 text-sm text-ink-soft">
          Looking for something we don't list?{" "}
          <Link href="/contact" className="font-medium text-saffron-deep underline underline-offset-2">
            Ask us
          </Link>{" "}
          — we can often source it.
        </p>
      </div>
    </div>
  );
}
