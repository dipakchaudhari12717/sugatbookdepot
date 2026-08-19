# Brand assets

| File | What it is | Used by |
|---|---|---|
| `sugat-mark.png` | The green roundel alone, square, transparent | Header — stays legible at 36–44px |
| `sugat-logo.png` | Full lockup including "SINCE 1967", transparent | Footer, at 132px wide |
| `sugat-banner-en.png` | Blue shopfront banner, English | `BrandBanner lang="en"` |
| `sugat-banner-mr.png` | Blue shopfront banner, Marathi | `BrandBanner lang="mr"` |

The two logo files were derived from the supplied JPEG: it sat on a white
ground, which would have shown as a white box against the cream header, so the
white was keyed out to transparency and the roundel cropped square for small
sizes. If a vector (SVG) or transparent original ever turns up, replace these
and delete nothing else — the paths are what matter.

`BrandLogo` and `BrandBanner` in `src/components/brand-logo.tsx` read these
paths. If a file is missing the header falls back to the typographic wordmark
and the banner renders nothing, so the site never shows a broken image.
