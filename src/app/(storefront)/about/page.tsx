import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { LinkButton } from "@/components/ui";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Established in 1967, Sugat Book Depot has published and retailed Buddhist literature and Dr. Babasaheb Ambedkar's writings from Nagpur to readers across India.",
  alternates: { canonical: "/about" },
};

const CDN =
  "https://cdn.zyrosite.com/cdn-ecommerce/store_01JR7BMNNH74ZJ9M31G9PQTTR7/assets/";

/** Photographs from the shop's own archive, carried over from the old site. */
const PHOTOS = [
  {
    src: `${CDN}11266cd1-3bbf-42a6-9bdf-30df1ccb453c.jpg`,
    caption: "Chivar Daan with the Sangha during Kathina season",
  },
  {
    src: `${CDN}ffb69886-0251-4c9d-a7e2-93523b9f5d89.jpg`,
    caption: "Robes folded and ready to be offered",
  },
  {
    src: `${CDN}ec1b9d90-683a-4e6c-a98a-17b5242b7177.webp`,
    caption: "A vihara prepared for the ceremony",
  },
  {
    src: `${CDN}27328488-c3af-4e8d-ba02-49e2b6547f2c.jpg`,
    caption: "Serving monks and practitioners across Maharashtra",
  },
];

const cn_ = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(" ");

export default function AboutPage() {
  return (
    <div className="container-page py-12 lg:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Our story</p>
        <h1 className="rule-ornament mt-4 font-display text-4xl leading-tight font-semibold text-ink sm:text-5xl">
          The Dhamma in print since 1967
        </h1>

        <div className="prose-book mt-10 text-base">
          <p>
            Sugat Book Depot began in Nagpur with a straightforward conviction: that the literature
            of the Buddhist and Ambedkarite movement should be available to the people it was
            written for, in the languages they actually read.
          </p>
          <p>
            For over half a century we have published and sold that literature — the Pali commentaries and
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

        {/* Photographs carried over from the shop's own archive */}
        <figure className="mt-14">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {PHOTOS.map((photo, i) => (
              <div
                key={photo.src}
                className={cn_(
                  "group relative overflow-hidden rounded-xl border border-rule bg-paper-sunk shadow-page",
                  // Give the first photograph more room on wider screens.
                  i === 0 ? "col-span-2 aspect-4/3 lg:col-span-2" : "aspect-square",
                )}
              >
                <Image
                  src={photo.src}
                  alt={photo.caption}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(36,29,22,0.55) 0%, rgba(36,29,22,0.05) 45%, transparent 70%)",
                  }}
                />
                <figcaption className="absolute inset-x-0 bottom-0 p-3">
                  <p className="text-[0.6875rem] font-medium leading-snug text-white/90">
                    {photo.caption}
                  </p>
                </figcaption>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-ink-faint">
            More photographs from the shop and from Chivar Daan events are in the{" "}
            <Link href="/gallery" className="text-saffron-deep underline underline-offset-2">
              gallery
            </Link>
            .
          </p>
        </figure>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {[
            ["1967", "Established"],
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
