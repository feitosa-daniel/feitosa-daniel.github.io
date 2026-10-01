// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// `site` and `base` default to the real target: feitosa-daniel.github.io, a GitHub USER
// site served at the domain root. For a preview deploy under a sub-path, override both:
//   SITE_URL=https://example.org SITE_BASE=/preview/ npm run build
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://feitosa-daniel.github.io',
  base: process.env.SITE_BASE ?? '/',
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});
