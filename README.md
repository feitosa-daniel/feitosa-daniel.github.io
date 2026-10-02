# feitosa-daniel.github.io

Daniel Feitosa's personal academic website — <https://feitosa-daniel.github.io>

A content-driven static site: every page is generated from a single structured data file,
the same `cv.yaml` that produces the LaTeX CV PDF. No page hardcodes content.

## Running it

The CV data is private and is not in this repository, so building needs a local copy of the
canonical `cv.yaml`, expected at `../cv/cv.yaml`.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run deploy     # build and publish (see Deployment)
```

`dev` and `build` run `npm run sync-cv` first, which copies `cv.yaml` and the public CV PDF
into this checkout. Both copies are gitignored. `CV_SOURCE=/path/to/cv.yaml` overrides where
the CV is read from.

## Stack

- **[Astro](https://astro.build/)** — static output, near-zero JavaScript. One small vanilla-JS
  island powers the publications filter; everything else is plain HTML.
- **Tailwind CSS v4** via `@tailwindcss/vite`, with design tokens in `src/styles/global.css`.
- **Zod** validates `cv.yaml` at build time, so a malformed CV fails the build loudly rather
  than shipping broken pages.

## How content flows

`cv.yaml` is the source of truth. It lives in a separate, private repository and is never
committed here. `npm run sync-cv` copies it into `src/data/cv.yaml` (gitignored), and
`src/lib/cv.ts` is the only module that reads it and exposes typed accessors to the pages.

## Deployment

The site is built locally and only the built output is published. `npm run deploy` syncs
the CV, builds, checks `dist/` for data files and private references, and commits `dist/` to
the **`gh-pages`** branch, which GitHub Pages serves (Pages source: *Deploy from a branch*,
`gh-pages`, `/`). Pushing to `main` does not deploy. `npm run deploy -- --dry` does everything
except the push.

## History

The previous Jekyll/AcademicPages version of this site is preserved at the
[`jekyll-legacy`](../../tree/jekyll-legacy) tag.
