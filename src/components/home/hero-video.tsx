"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * The shop's promotional film, playing silently behind the hero.
 *
 * It is eight seconds long and loops, so it reads as movement behind the page
 * rather than as something to sit and watch. Everything here serves keeping the
 * copy on top of it readable:
 *
 *   - a paper-coloured scrim, heaviest over the text column, so the headline
 *     keeps its contrast against whatever frame happens to be showing;
 *   - a slight blur, which softens detail that would otherwise compete with
 *     the type;
 *   - the poster frame painted underneath, so the hero is never empty while
 *     YouTube's player boots.
 *
 * The iframe is decorative: aria-hidden, and pointer-events-none so every click
 * lands on the page behind it.
 */

const VIDEO_ID = "HKFNC9ekMNU";
const POSTER = `https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`;
const RATIO = 16 / 9;

const PARAMS = new URLSearchParams({
  autoplay: "1",
  mute: "1",
  // YouTube only loops a single video when it is also given as the playlist.
  loop: "1",
  playlist: VIDEO_ID,
  controls: "0",
  disablekb: "1",
  fs: "0",
  modestbranding: "1",
  rel: "0",
  iv_load_policy: "3",
  playsinline: "1",
  enablejsapi: "1",
}).toString();

export function HeroVideo() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Painted as a poster first; the player is mounted once the page has settled
  // so it never competes with the hero's own render.
  const [showPlayer, setShowPlayer] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  // Honour a reduced-motion preference: poster only, no loop, no control.
  const [motionOk, setMotionOk] = useState(true);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setMotionOk(!q.matches);
    apply();
    q.addEventListener("change", apply);
    return () => q.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!motionOk) return;
    // Data Saver on: the poster says everything the film does, for a few KB.
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;
    const t = window.setTimeout(() => setShowPlayer(true), 400);
    return () => window.clearTimeout(t);
  }, [motionOk]);

  /**
   * An iframe has no object-fit, so the cover maths is done here: match the
   * container on whichever axis overflows and let the other spill past the
   * edges. Measured rather than derived from viewport units, because the hero
   * is not the height of the viewport.
   */
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const measure = (width: number, height: number) => {
      if (!width || !height) return;
      setSize(
        width / height > RATIO
          ? { w: width, h: width / RATIO }
          : { w: height * RATIO, h: height },
      );
    };

    // Measure once, directly. A ResizeObserver is tied to the rendering
    // lifecycle, so in a background tab it never fires and the film would
    // never size itself — the same trap Reveal hit with IntersectionObserver.
    const rect = el.getBoundingClientRect();
    measure(rect.width, rect.height);

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      measure(width, height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function toggle() {
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    const func = playing ? "pauseVideo" : "playVideo";
    win.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
    setPlaying(!playing);
  }

  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/*
          The film's own box. Full bleed from `sm` up; on a phone it is a band
          across the top instead. Covering a 375 x 1250 hero with a 16:9 film
          means a 2300px-wide player showing a vertical sliver of it — bad
          composition, and a lot of video for a 4G connection to carry.
        */}
        <div ref={boxRef} className="absolute inset-x-0 top-0 h-[22rem] sm:h-full">
          {/* Poster: visible immediately, and the whole picture under reduced motion. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={POSTER}
            alt=""
            className="absolute inset-0 size-full scale-105 object-cover blur-[2px]"
          />

          {showPlayer && size && (
            <iframe
              ref={frameRef}
              src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?${PARAMS}`}
              title="Sugat Book Depot promotional film"
              tabIndex={-1}
              allow="autoplay; encrypted-media"
              className="absolute left-1/2 top-1/2 origin-center -translate-x-1/2 -translate-y-1/2 scale-105 border-0 blur-[2px]"
              style={{ width: size.w, height: size.h }}
            />
          )}
        </div>

        {/* Scrim. On a phone it thickens quickly, dissolving the band into the
            page rather than cutting it off with an edge. */}
        <div
          className="absolute inset-0 sm:hidden"
          style={{
            background:
              "linear-gradient(to bottom, rgba(251,247,239,0.82) 0%, rgba(251,247,239,0.90) 40%, rgba(251,247,239,1) 72%)",
          }}
        />
        {/* From `sm` up the copy sits to the left, so the scrim is heaviest
            there and thins towards the shelf, where the film stays legible. */}
        <div
          className="absolute inset-0 hidden sm:block"
          style={{
            background:
              "linear-gradient(100deg, rgba(251,247,239,0.97) 0%, rgba(251,247,239,0.94) 30%, rgba(251,247,239,0.78) 55%, rgba(251,247,239,0.58) 100%)",
          }}
        />
        {/* Feather the join with the section below. */}
        <div
          className="absolute inset-x-0 bottom-0 h-28"
          style={{ background: "linear-gradient(to bottom, transparent, var(--color-paper))" }}
        />
      </div>

      {motionOk && showPlayer && (
        <button
          type="button"
          onClick={toggle}
          aria-pressed={!playing}
          className="absolute bottom-5 right-5 z-10 inline-flex items-center gap-1.5 rounded-full border border-rule bg-paper-raised/85 px-3 py-1.5 text-[0.6875rem] font-medium text-ink-soft shadow-page backdrop-blur-sm transition hover:border-saffron hover:text-saffron-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron"
        >
          {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
          {playing ? "Pause film" : "Play film"}
        </button>
      )}
    </>
  );
}
