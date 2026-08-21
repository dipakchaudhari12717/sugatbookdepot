"use client";

import { MediaImage } from "@/components/media-image";
import { ChevronLeft, ChevronRight, ImageIcon, Play, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { subscribeGallery } from "@/lib/repo";
import type { GalleryItem } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { EmptyState, Reveal, Spinner } from "@/components/ui";

export function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [album, setAlbum] = useState("");
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(
    () =>
      subscribeGallery((next) => {
        setItems(next);
        setLoading(false);
      }),
    [],
  );

  const albums = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (item.album) counts.set(item.album, (counts.get(item.album) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const visible = useMemo(
    () => (album ? items.filter((i) => i.album === album) : items),
    [items, album],
  );

  // Reset the lightbox if the filter changes underneath it.
  useEffect(() => setLightbox(null), [album]);

  const step = useCallback(
    (delta: number) => {
      setLightbox((current) => {
        if (current == null || visible.length === 0) return current;
        return (current + delta + visible.length) % visible.length;
      });
    },
    [visible.length],
  );

  useEffect(() => {
    if (lightbox == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [lightbox, step]);

  const active = lightbox != null ? visible[lightbox] : null;

  return (
    <div className="container-page py-10 lg:py-14">
      <p className="eyebrow">Gallery</p>
      <h1 className="rule-ornament mt-4 font-display text-3xl leading-tight font-semibold text-ink sm:text-4xl">
        Moments from the depot
      </h1>
      <p className="mt-5 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">
        Photographs and videos — the shop counter in Nagpur, Chivar Daan offerings at Varshavas and
        Kathina, book launches, and the readers and viharas we have served since 1967.
      </p>

      {albums.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setAlbum("")}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-[0.8125rem] font-medium transition",
              !album
                ? "border-saffron bg-saffron text-white"
                : "border-rule bg-paper-raised text-ink-soft hover:border-saffron/50 hover:text-ink",
            )}
          >
            All <span className="ml-1 opacity-60">{items.length}</span>
          </button>
          {albums.map(([name, count]) => (
            <button
              key={name}
              type="button"
              onClick={() => setAlbum(name)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-[0.8125rem] font-medium transition",
                album === name
                  ? "border-saffron bg-saffron text-white"
                  : "border-rule bg-paper-raised text-ink-soft hover:border-saffron/50 hover:text-ink",
              )}
            >
              {name} <span className="ml-1 opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-10">
        {loading ? (
          <div className="flex min-h-60 items-center justify-center">
            <Spinner className="size-7" />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<ImageIcon className="size-6" />}
            title="Nothing here yet"
            description="Photographs and videos from the shop and from Chivar Daan events will appear here once they are added."
          />
        ) : (
          /* Masonry via CSS columns, so portrait and landscape shots keep their
             natural aspect ratio instead of being cropped to squares. */
          <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
            {visible.map((item, i) => (
              <Reveal key={item.id} delay={Math.min(i, 8) * 45}>
                <button
                  type="button"
                  onClick={() => setLightbox(i)}
                  className="group block w-full break-inside-avoid overflow-hidden rounded-xl border border-rule bg-paper-raised text-left shadow-page transition-all duration-400 ease-[var(--ease-paper)] hover:-translate-y-1 hover:shadow-lift"
                >
                  <div className="relative w-full overflow-hidden">
                    <MediaImage
                      src={item.image}
                      alt={item.title}
                      width={600}
                      height={800}
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-0 transition-opacity duration-400 group-hover:opacity-100"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(36,29,22,0.5) 0%, transparent 55%)",
                      }}
                    />

                    {item.kind === "video" && (
                      <span
                        aria-hidden
                        className="absolute inset-0 grid place-items-center"
                      >
                        <span className="flex size-12 items-center justify-center rounded-full bg-ink/70 text-white shadow-lift backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                          <Play className="ml-0.5 size-5 fill-current" />
                        </span>
                      </span>
                    )}
                  </div>
                  {(item.title || item.album) && (
                    <div className="p-3.5">
                      {item.album && (
                        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-saffron-deep">
                          {item.album}
                        </p>
                      )}
                      <p className="mt-1 font-display text-sm leading-snug font-semibold text-ink">
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-faint">
                          {item.description}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              </Reveal>
            ))}
          </div>
        )}
      </div>

      {active && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setLightbox(null)}
            className="absolute inset-0 bg-ink/85 backdrop-blur-sm"
            style={{ animation: "fade 0.2s var(--ease-paper)" }}
          />

          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute right-4 top-4 z-2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20"
          >
            <X className="size-5" />
          </button>

          {visible.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous photograph"
                className="absolute left-3 z-2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20 sm:left-6"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next photograph"
                className="absolute right-3 z-2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20 sm:right-6"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}

          <figure
            className="relative z-1 flex max-h-full w-full max-w-4xl flex-col items-center"
            style={{ animation: "rise 0.3s var(--ease-paper)" }}
          >
            {active.kind === "video" && active.youtubeId ? (
              <div className="w-full max-w-4xl">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl shadow-lift">
                  <iframe
                    key={active.youtubeId}
                    src={`https://www.youtube-nocookie.com/embed/${active.youtubeId}?rel=0&autoplay=1`}
                    title={active.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 size-full border-0"
                  />
                </div>
              </div>
            ) : (
              <MediaImage
                key={active.image}
                src={active.image}
                alt={active.title}
                width={1400}
                height={1000}
                sizes="100vw"
                className="max-h-[74vh] w-auto rounded-xl object-contain shadow-lift"
              />
            )}
            <figcaption className="mt-4 max-w-2xl text-center">
              <p className="font-display text-lg font-semibold text-white">{active.title}</p>
              {active.description && (
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">{active.description}</p>
              )}
              <p className="mt-2 text-xs text-white/45">
                {[active.album, active.takenOn ? formatDate(Date.parse(active.takenOn)) : null]
                  .filter(Boolean)
                  .join(" · ")}
                {visible.length > 1 && ` · ${(lightbox ?? 0) + 1} of ${visible.length}`}
              </p>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
