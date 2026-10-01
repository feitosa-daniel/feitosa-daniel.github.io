/**
 * Build an internal URL that respects Astro's `base`.
 *
 * At the real target (feitosa-daniel.github.io, a GitHub *user* site) base is "/" and this
 * is a no-op. For a preview deploy under a sub-path — e.g. example.org/preview/ — base is
 * "/preview/" and every internal link and asset must carry that prefix or it 404s.
 *
 * Set it at build time:  SITE_BASE=/preview/ npm run build
 */
export const url = (path: string): string => {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
};
