"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, ShieldCheck, Truck } from "lucide-react";

import { useCatalog } from "@/lib/catalog-context";
import { cn, formatPrice } from "@/lib/utils";
import { LinkButton } from "@/components/ui";

/**
 * Homepage hero (SRS §5): light and calm rather than the legacy dark banner,
 * with Chivar given equal billing to the book collections.
 *
 * The right-hand side is a small 3D shelf built from real catalog covers — the
 * Chivar leads, three books fan out behind it.
 */
export function Hero() {
  const { bySlug, products } = useCatalog();

  const chivar = bySlug.get("chivar-traditional-buddhist-monk-robe-or-pure-lightweight-and-comfortable");

  // Three recognisable titles behind the robe.
  const spineTitles = [
    "the-buddha-and-his-dhamma",
    "milind-prashna-book",
    "annihilation-of-caste-marathi-translation-",
  ]
    .map((s) => bySlug.get(s))
    .filter(Boolean)
    .slice(0, 3);

  const fallbackBooks = products.filter((p) => p.category !== "stationery").slice(0, 3);
  const books = spineTitles.length === 3 ? spineTitles : fallbackBooks;

  return (
    <section className="relative overflow-hidden">
      {/* Warm light wash — the "calm, monastic" ground */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 80% at 78% 12%, rgba(224,138,43,0.16) 0%, rgba(224,138,43,0.05) 38%, transparent 70%), radial-gradient(90% 60% at 10% 90%, rgba(168,128,31,0.10) 0%, transparent 60%)",
        }}
      />

      <div className="container-page">
        <div className="grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-20">
          {/* ---------------- Copy ---------------- */}
          <div className="max-w-xl">
            <p
              className="eyebrow flex items-center gap-2"
              style={{ animation: "rise 0.6s var(--ease-paper) both" }}
            >
              <span className="h-px w-6 bg-saffron" />
              Established 1967 · Nagpur
            </p>

            <h1
              className="mt-5 font-display text-[2.6rem] leading-[1.06] font-semibold tracking-tight text-ink sm:text-6xl"
              style={{ animation: "rise 0.7s var(--ease-paper) 0.06s both" }}
            >
              The Dhamma,
              <br />
              <span className="text-saffron-deep">in your language.</span>
            </h1>

            <p
              className="mt-6 max-w-lg text-base leading-relaxed text-ink-soft"
              style={{ animation: "rise 0.7s var(--ease-paper) 0.14s both" }}
            >
              Since 1967, publishing and retailing Buddhist literature and the writings of
              Dr. Babasaheb Ambedkar — alongside Chivar for the Sangha, hand-finished Buddha
              statues, and everyday stationery.
            </p>

            <div
              className="mt-8 flex flex-wrap items-center gap-3"
              style={{ animation: "rise 0.7s var(--ease-paper) 0.22s both" }}
            >
              <LinkButton href="/shop" size="lg">
                Browse the collection
                <ArrowRight className="size-4" />
              </LinkButton>
              <LinkButton href="/shop?category=chivar" variant="secondary" size="lg">
                Chivar Daan
              </LinkButton>
            </div>

            {/* Trust row */}
            <div
              className="mt-10 flex flex-wrap gap-x-7 gap-y-3"
              style={{ animation: "rise 0.7s var(--ease-paper) 0.3s both" }}
            >
              {[
                [BookOpen, "47 titles in stock"],
                [Truck, "Delivered across India"],
                [ShieldCheck, "Secure checkout"],
              ].map(([Icon, label]) => {
                const I = Icon as typeof BookOpen;
                return (
                  <div key={label as string} className="flex items-center gap-2">
                    <I className="size-4 text-saffron" aria-hidden />
                    <span className="text-[0.8125rem] text-ink-soft">{label as string}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ---------------- Shelf ---------------- */}
          <div
            className="relative"
            style={{ animation: "rise 0.9s var(--ease-paper) 0.2s both" }}
          >
            <div className="book-stage relative mx-auto aspect-square w-full max-w-lg">
              {/* Books fanned behind */}
              {books.map((book, i) => {
                if (!book?.image) return null;
                const layout = [
                  { className: "left-0 top-[14%] w-[38%]", rotate: -9, z: 1 },
                  { className: "left-[13%] top-[3%] w-[36%]", rotate: -4, z: 2 },
                  { className: "right-[2%] top-[22%] w-[34%]", rotate: 8, z: 1 },
                ][i];
                return (
                  <Link
                    key={book.id}
                    href={`/product/${book.slug}`}
                    aria-label={book.title}
                    className={cn(
                      "group absolute overflow-hidden rounded-[2px_5px_5px_2px] shadow-book transition-transform duration-500 ease-[var(--ease-paper)] hover:-translate-y-2",
                      layout.className,
                    )}
                    style={{
                      transform: `rotate(${layout.rotate}deg)`,
                      zIndex: layout.z,
                      animation: `drift ${7 + i * 1.6}s ease-in-out ${i * 0.7}s infinite`,
                    }}
                  >
                    <div className="relative aspect-3/4 w-full">
                      <Image
                        src={book.image}
                        alt={book.title}
                        fill
                        sizes="(max-width: 1024px) 30vw, 180px"
                        className="object-cover"
                      />
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-[12%]"
                        style={{
                          background:
                            "linear-gradient(90deg, rgba(0,0,0,0.4), rgba(0,0,0,0.05) 60%, transparent)",
                        }}
                      />
                    </div>
                  </Link>
                );
              })}

              {/* Chivar in front */}
              {chivar?.image && (
                <Link
                  href={`/product/${chivar.slug}`}
                  className="group absolute bottom-[2%] left-1/2 z-3 w-[52%] -translate-x-1/2 transition-transform duration-500 ease-[var(--ease-paper)] hover:-translate-y-2.5"
                  aria-label={chivar.title}
                >
                  <div className="relative aspect-4/5 w-full overflow-hidden rounded-xl border border-white/50 shadow-[0_8px_18px_rgba(36,29,22,0.16),0_28px_56px_rgba(36,29,22,0.2)]">
                    <Image
                      src={chivar.image}
                      alt={chivar.title}
                      fill
                      priority
                      sizes="(max-width: 1024px) 50vw, 280px"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(36,29,22,0.6) 0%, rgba(36,29,22,0.1) 42%, transparent 68%)",
                      }}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="text-[0.5625rem] font-semibold uppercase tracking-[0.16em] text-saffron-bright">
                        Chivar Daan · Varshavas
                      </p>
                      <p className="mt-1 font-display text-sm leading-snug font-semibold text-white">
                        Chivar — Buddhist Monk Robe
                      </p>
                      <p className="mt-1.5 flex items-baseline gap-2">
                        <span className="font-display text-base font-semibold text-white">
                          {formatPrice(chivar.price)}
                        </span>
                        {chivar.salePrice != null && (
                          <span className="text-[0.6875rem] text-white/60 line-through">
                            {formatPrice(chivar.mrp)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </Link>
              )}
            </div>

            {/* Shelf plank */}
            <div
              aria-hidden
              className="mx-auto h-2.5 w-[86%] max-w-lg rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--color-paper-deep) 10%, var(--color-paper-deep) 90%, transparent)",
                boxShadow: "0 8px 22px rgba(36,29,22,0.13)",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
