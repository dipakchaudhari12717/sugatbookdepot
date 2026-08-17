"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { LinkButton, Reveal, SectionHeading } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Horizontally scrolling shelf. Snaps on touch, and shows arrow controls on
 * pointer devices once there is something to scroll to.
 */
export function ProductRail({
  eyebrow,
  title,
  description,
  products,
  href,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  products: Product[];
  href: string;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    setAtStart(el.scrollLeft < 8);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    sync();
    const el = rail.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  function scrollBy(direction: 1 | -1) {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(280, el.clientWidth * 0.75), behavior: "smooth" });
  }

  const canScroll = products.length > 2;

  return (
    <section className="pt-20">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            eyebrow={eyebrow}
            title={title}
            description={description}
            action={
              <div className="flex items-center gap-2">
                {canScroll && (
                  <div className="hidden gap-1.5 sm:flex">
                    <button
                      type="button"
                      onClick={() => scrollBy(-1)}
                      disabled={atStart}
                      aria-label="Scroll left"
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full border border-rule-strong bg-paper-raised text-ink-soft transition",
                        "hover:border-saffron hover:text-saffron-deep disabled:pointer-events-none disabled:opacity-35",
                      )}
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollBy(1)}
                      disabled={atEnd}
                      aria-label="Scroll right"
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full border border-rule-strong bg-paper-raised text-ink-soft transition",
                        "hover:border-saffron hover:text-saffron-deep disabled:pointer-events-none disabled:opacity-35",
                      )}
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                )}
                <LinkButton href={href} variant="secondary" size="sm">
                  View all
                  <ArrowRight className="size-3.5" />
                </LinkButton>
              </div>
            }
          />
        </Reveal>
      </div>

      <div className="relative mt-10">
        {/* Edge fades hint at more content */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-2 w-10 bg-gradient-to-r from-paper to-transparent transition-opacity duration-300",
            atStart && "opacity-0",
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 z-2 w-10 bg-gradient-to-l from-paper to-transparent transition-opacity duration-300",
            atEnd && "opacity-0",
          )}
        />

        <div
          ref={rail}
          className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-4 pb-2 sm:px-6 lg:px-10"
        >
          {products.map((p, i) => (
            <div
              key={p.id}
              className="w-[46vw] shrink-0 snap-start sm:w-56 lg:w-60"
              style={{ animation: `rise 0.5s var(--ease-paper) ${Math.min(i, 6) * 55}ms both` }}
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
