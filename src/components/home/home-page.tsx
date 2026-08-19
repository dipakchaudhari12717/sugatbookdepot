"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookMarked, Handshake, Package, Sparkles } from "lucide-react";
import { useMemo } from "react";

import { useCatalog } from "@/lib/catalog-context";
import { cn, formatPrice } from "@/lib/utils";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { LinkButton, Reveal, SectionHeading } from "@/components/ui";
import { Hero } from "./hero";
import { ProductRail } from "./product-rail";

export function HomePage() {
  const { products, categories, banners, loading, countFor } = useCatalog();

  const { bestsellers, newArrivals, featured, chivar } = useMemo(() => {
    const isBook = (c: string) => !["stationery"].includes(c);
    return {
      bestsellers: products
        .filter((p) => p.badge?.toLowerCase().includes("best") && isBook(p.category))
        .slice(0, 10),
      newArrivals: products.filter((p) => p.badge === "New").slice(0, 10),
      featured: products.filter((p) => p.featured).slice(0, 8),
      chivar: products.find((p) => p.category === "chivar"),
    };
  }, [products]);

  const activeBanner = banners.find((b) => b.active);

  return (
    <>
      <Hero />

      {/* ---------------- Value strip ---------------- */}
      <section className="border-y border-rule bg-paper-raised">
        <div className="container-page">
          <div className="grid divide-y divide-rule sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {[
              [BookMarked, "Established 1967", "Sugat Prakashan, Nagpur"],
              [Handshake, "Chivar Daan support", "Bulk orders for viharas"],
              [Package, "Delivered across India", "Free above ₹499"],
              [Sparkles, "Marathi · Hindi · Pali · English", "Titles in four languages"],
            ].map(([Icon, title, sub], i) => {
              const I = Icon as typeof BookMarked;
              return (
                <Reveal key={title as string} delay={i * 70} className="flex items-start gap-3.5 px-1 py-6 sm:px-6">
                  <I className="mt-0.5 size-5 shrink-0 text-saffron" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-ink">{title as string}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">{sub as string}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- Admin-managed banner ---------------- */}
      {activeBanner && (
        <section className="container-page pt-14">
          <Reveal>
            <Link
              href={activeBanner.ctaHref || "/shop"}
              className="group relative flex flex-col justify-center overflow-hidden rounded-3xl border border-rule bg-gradient-to-br from-saffron-wash via-paper-raised to-paper-sunk px-7 py-10 shadow-page sm:px-12 sm:py-14"
            >
              {activeBanner.image && (
                <Image
                  src={activeBanner.image}
                  alt=""
                  fill
                  sizes="100vw"
                  className="object-cover opacity-25 transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <div className="relative max-w-xl">
                <h2 className="font-display text-2xl leading-tight font-semibold text-ink sm:text-4xl">
                  {activeBanner.title}
                </h2>
                {activeBanner.subtitle && (
                  <p className="mt-3 text-sm text-ink-soft sm:text-base">{activeBanner.subtitle}</p>
                )}
                {activeBanner.ctaLabel && (
                  <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-saffron px-5 py-2.5 text-sm font-medium text-white transition-colors group-hover:bg-saffron-deep">
                    {activeBanner.ctaLabel}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </div>
            </Link>
          </Reveal>
        </section>
      )}

      {/* ---------------- Categories ---------------- */}
      <section className="container-page pt-20">
        <Reveal>
          <SectionHeading
            eyebrow="Browse"
            title="Find your shelf"
            description="Seven collections, from the Pali canon to school stationery."
          />
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, i) => {
            const sample = products.filter((p) => p.category === category.slug).slice(0, 3);
            const isChivar = category.slug === "chivar";
            return (
              <Reveal key={category.slug} delay={i * 60} as="article">
                <Link
                  href={`/shop?category=${category.slug}`}
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden rounded-2xl border p-6 transition-all duration-400 ease-[var(--ease-paper)]",
                    "hover:-translate-y-1 hover:shadow-lift",
                    isChivar
                      ? "border-saffron/35 bg-gradient-to-br from-saffron-wash to-paper-raised"
                      : "border-rule bg-paper-raised hover:border-saffron/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-xl leading-tight font-semibold text-ink transition-colors group-hover:text-saffron-deep">
                        {category.name}
                      </h3>
                      <p className="mt-1 text-xs text-saffron-deep">{category.tagline}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-paper-sunk px-2.5 py-1 text-[0.6875rem] font-semibold text-ink-soft">
                      {countFor(category.slug)}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                    {category.description}
                  </p>

                  {/* Mini spine preview */}
                  <div className="mt-6 flex items-end gap-1.5">
                    {sample.map((p, idx) =>
                      p.image ? (
                        <div
                          key={p.id}
                          className="relative overflow-hidden rounded-[1px_3px_3px_1px] shadow-page transition-transform duration-400 ease-[var(--ease-paper)] group-hover:-translate-y-1"
                          style={{
                            width: 44,
                            height: 58 + idx * 5,
                            transitionDelay: `${idx * 55}ms`,
                          }}
                        >
                          <Image src={p.image} alt="" fill sizes="44px" className="object-cover" />
                        </div>
                      ) : null,
                    )}
                    <ArrowRight className="mb-1.5 ml-auto size-4 text-ink-faint transition-all duration-300 group-hover:translate-x-1 group-hover:text-saffron" />
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ---------------- Chivar spotlight ---------------- */}
      {chivar && (
        <section className="container-page pt-20">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-saffron/25 bg-gradient-to-br from-saffron-wash via-paper-raised to-paper-sunk">
              <div className="grid gap-0 lg:grid-cols-2">
                <div className="relative min-h-72 lg:min-h-[26rem]">
                  {chivar.image && (
                    <Image
                      src={chivar.image}
                      alt={chivar.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover"
                    />
                  )}
                  <div
                    aria-hidden
                    className="absolute inset-0 lg:bg-gradient-to-r lg:from-transparent lg:to-paper-raised/25"
                  />
                </div>

                <div className="flex flex-col justify-center p-8 sm:p-12">
                  <p className="eyebrow">Chivar Daan · Varshavas &amp; Kathina</p>
                  <h2 className="mt-4 font-display text-3xl leading-tight font-semibold text-ink sm:text-4xl">
                    Offer a robe to the Sangha
                  </h2>
                  <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
                    Woven to Vinaya-prescribed patterns in breathable cotton, in three traditional
                    shades. Sponsoring a Chivar during Varshavas is among the most revered forms of
                    merit-making — and we handle bulk orders for viharas and monastery trusts.
                  </p>

                  <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                    {[
                      "Orange, Brown & Yellow",
                      "Free size, 2-piece set",
                      "Thoughtfully packaged",
                      "Bulk pricing available",
                    ].map((point) => (
                      <li key={point} className="flex items-center gap-2 text-sm text-ink-soft">
                        <span className="size-1.5 shrink-0 rounded-full bg-saffron" />
                        {point}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <LinkButton href={`/product/${chivar.slug}`} size="lg">
                      Order a Chivar
                      <ArrowRight className="size-4" />
                    </LinkButton>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-2xl font-semibold text-ink">
                        {formatPrice(chivar.price)}
                      </span>
                      {chivar.salePrice != null && (
                        <span className="text-sm text-ink-faint line-through">
                          {formatPrice(chivar.mrp)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* ---------------- Rails ---------------- */}
      {loading ? (
        <section className="container-page pt-20">
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </section>
      ) : (
        <>
          {bestsellers.length > 0 && (
            <ProductRail
              eyebrow="Most read"
              title="Bestselling titles"
              description="The books our customers come back for, year after year."
              products={bestsellers}
              href="/shop?sort=popular"
            />
          )}

          {featured.length > 0 && (
            <section className="container-page pt-20">
              <Reveal>
                <SectionHeading
                  eyebrow="Editor's shelf"
                  title="Essential reading"
                  description="Where to begin with the Dhamma and with Babasaheb's writings."
                  action={
                    <LinkButton href="/shop" variant="secondary" size="sm">
                      View all
                      <ArrowRight className="size-3.5" />
                    </LinkButton>
                  }
                />
              </Reveal>
              <div className="shelf mt-10 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
                {featured.map((p, i) => (
                  <Reveal key={p.id} delay={i * 55} as="div">
                    <ProductCard product={p} />
                  </Reveal>
                ))}
              </div>
            </section>
          )}

          {newArrivals.length > 0 && (
            <ProductRail
              eyebrow="Just in"
              title="New arrivals"
              description="Recently added to the depot."
              products={newArrivals}
              href="/shop?sort=newest"
            />
          )}
        </>
      )}

      {/* ---------------- Heritage ---------------- */}
      <section className="container-page pt-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-rule bg-ink px-8 py-14 text-paper sm:px-14 sm:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(80% 60% at 85% 10%, rgba(224,138,43,0.24) 0%, transparent 60%)",
              }}
            />
            <div className="relative max-w-2xl">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-saffron-bright">
                Our story
              </p>
              <h2 className="mt-5 font-display text-3xl leading-tight font-semibold sm:text-[2.75rem]">
                “You didn't come this far to stop.”
              </h2>
              <p className="mt-6 text-[0.9375rem] leading-relaxed text-paper/72">
                Since 1967 Sugat Book Depot has published and sold the literature of the
                Buddhist and Ambedkarite movement — from the Pali commentaries to Babasaheb's
                collected writings, in the languages our readers actually speak. What began as a
                single shop in Nagpur now reaches readers, viharas and institutions across India.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <LinkButton href="/about" variant="secondary" size="md">
                  Read our story
                </LinkButton>
                <LinkButton
                  href="/contact"
                  variant="ghost"
                  size="md"
                  className="text-paper hover:bg-white/10 hover:text-white"
                >
                  Get in touch
                </LinkButton>
              </div>

              <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-white/12 pt-8">
                {[
                  ["1967", "Established"],
                  ["47", "Titles & products"],
                  ["4", "Languages"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="font-display text-3xl font-semibold text-saffron-bright sm:text-4xl">
                      {value}
                    </dt>
                    <dd className="mt-1 text-xs text-paper/60">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
