# feitosa-daniel.github.io

Daniel Feitosa's personal academic website — <https://feitosa-daniel.github.io>

A content-driven static site: every page is generated from a single structured data file,
the same `cv.yaml` that produces the LaTeX CV PDF. No page hardcodes content.

## Running it

```bash
npm install
npm run sync-cv    # pull cv.yaml and the CV PDF from the CV repository
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
```

`CV_SOURCE=/path/to/cv.yaml npm run sync-cv` overrides where the CV is read from.

## Stack

- **[Astro](https://astro.build/)** — static output, near-zero JavaScript. One small vanilla-JS
  island powers the publications filter; everything else is plain HTML.
- **Tailwind CSS v4** via `@tailwindcss/vite`, with design tokens in `src/styles/global.css`.
- **Zod** validates `cv.yaml` at build time, so a malformed CV fails the build loudly rather
  than shipping broken pages.

## How content flows

`cv.yaml` lives in a separate repository and is the source of truth. `npm run sync-cv` copies
it into `src/data/cv.yaml`, which is committed so CI can build without that repository present.
`src/lib/cv.ts` is the only module that reads it and exposes typed accessors to the pages.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site and publishes
it to GitHub Pages. The repository's Pages source must be **GitHub Actions**, not a branch.

## History

The previous Jekyll/AcademicPages version of this site is preserved at the
[`jekyll-legacy`](../../tree/jekyll-legacy) tag.
