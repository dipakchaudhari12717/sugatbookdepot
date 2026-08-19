# Brand assets

Drop the two files the shop supplied here, with exactly these names:

| File | What it is |
|---|---|
| `sugat-logo.png` | The green circular Sugat mark ("SINCE 1967") |
| `sugat-banner-en.png` | The blue shopfront banner, English |
| `sugat-banner-mr.png` | The blue shopfront banner, Marathi |

`BrandLogo` and `BrandBanner` in `src/components/brand-logo.tsx` look for these
paths. Until the files exist the header falls back to the typographic wordmark
and the banner renders nothing, so the site never shows a broken image.

Transparent PNG or SVG is preferred for the logo.
