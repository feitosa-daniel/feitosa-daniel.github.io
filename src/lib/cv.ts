/**
 * The single source of truth for every page: src/data/cv.yaml, a local, uncommitted copy of
 * the canonical CV made by `npm run sync-cv`. Nothing in this site should hardcode content
 * that lives there.
 *
 * Parsed and validated once at build time. A malformed CV fails the build loudly rather
 * than rendering broken HTML.
 */
import cvRaw from '../data/cv.yaml?raw';
import YAML from 'yaml';
import { z } from 'zod';

const scalar = z.union([z.string(), z.number()]).nullish();

const PublicationSchema = z
  .object({
    title: z.string(),
    authors: z.string().nullish(),
    year: z.union([z.string(), z.number()]).nullish(),
    doi: z.string().nullish(),
    journal: z.string().nullish(),
    booktitle: z.string().nullish(),
    book: z.string().nullish(),
    publisher: z.string().nullish(),
    volume: scalar,
    issue: scalar,
    pages: z.string().nullish(),
    location: z.string().nullish(),
    abstract: z.string().nullish(),
    inpress: z.boolean().nullish(),
    award: z.string().nullish(),
    themes: z.array(z.string()).nullish(),
  })
  .catchall(z.unknown());

const ThemeSchema = z.object({
  id: z.string(),
  title: z.string(),
  blurb: z.string(),
  keywords: z.array(z.string()).default([]),
  // Thematic analysis of what has actually been supervised; see the supervision page.
  supervision_topics: z.array(z.string()).default([]),
});

const CvSchema = z
  .object({
    name: z.string(),
    label: z.string(),
    email: z.string(),
    website: z.string().nullish(),
    location: z.object({ city: z.string(), region: z.string() }).catchall(z.unknown()),
    summary: z.string(),
    site: z.object({ tagline: z.string() }).catchall(z.unknown()).nullish(),
    research_themes: z.array(ThemeSchema).default([]),
    // Curated resources: cited in a paper, DOI/code-hosted, and containing a reusable dataset
    // or usable artifact. Deliberately a hand-curated list, not derived from every publication
    // that happens to have a replication package — most of those do not qualify.
    datasets: z.array(z.object({
      name: z.string(), description: z.string(),
      // A resource can live in more than one place — a catalog site, its source repo and a
      // DOI are all the same artifact. First link is the primary one.
      links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
      year: z.union([z.string(), z.number()]).nullish(),
      publications: z.array(z.string()).default([]),
    })).default([]),
    profiles: z.array(z.object({ network: z.string(), url: z.string(), username: z.string().nullish() })).default([]),
    employment: z.array(z.object({ role: z.string(), institution: z.string(), period: z.string() }).catchall(z.unknown())).default([]),
    education: z.array(z.object({ degree: z.string(), institution: z.string(), period: z.string() }).catchall(z.unknown())).default([]),
    languages: z.array(z.object({ language: z.string(), proficiency: z.string() })).default([]),
    memberships: z.array(z.object({ organization: z.string() }).catchall(z.unknown())).default([]),
    distinctions: z.array(z.object({ year: z.union([z.string(), z.number()]), award: z.string() }).catchall(z.unknown())).default([]),
    teaching: z.object({ lecturing: z.array(z.any()).default([]), assistance: z.array(z.any()).default([]) }),
    supervision: z.object({ phd: z.array(z.any()).default([]), msc: z.array(z.any()).default([]), bsc: z.array(z.any()).default([]) }),
    technical_contributions: z.array(z.object({
      project: z.string(), description: z.string(), url: z.string(), language: z.string().nullish(),
      // DOIs of the papers the tool belongs to. Presence of this field is also what puts the
      // tool on the website: a tool with no paper stays in the CV only.
      publications: z.array(z.string()).default([]),
    })).default([]),
    services: z.object({}).catchall(z.unknown()),
    funding: z.array(z.object({ year: z.union([z.string(), z.number()]), grant: z.string() }).catchall(z.unknown())).default([]),
    publications: z.object({
      journals: z.array(PublicationSchema).default([]),
      conferences: z.array(PublicationSchema).default([]),
      chapters: z.array(PublicationSchema).default([]),
      theses: z.array(z.any()).default([]),
    }),
  })
  .catchall(z.unknown());

export type PubKind = 'journal' | 'conference' | 'chapter';
export type Publication = z.infer<typeof PublicationSchema> & {
  kind: PubKind;
  id: string;
  yearNum: number;
  venue: string;
  venueShort: string | null;
  themeIds: string[];
};
export type ResearchTheme = z.infer<typeof ThemeSchema>;

function load() {
  const parsed = CvSchema.safeParse(YAML.parse(cvRaw));
  if (!parsed.success) {
    throw new Error(
      'src/data/cv.yaml failed validation. Fix the CV (or the schema in src/lib/cv.ts):\n' +
        JSON.stringify(parsed.error.issues, null, 2),
    );
  }
  return parsed.data;
}

export const cv = load();

/** Journal abbreviations. Presentation only — long venue names do not fit a compact row. */
const JOURNAL_SHORT: Record<string, string> = {
  'Journal of Systems and Software': 'JSS',
  'Empirical Software Engineering': 'EMSE',
  'IEEE Transactions on Software Engineering': 'TSE',
  'Information and Software Technology': 'IST',
  'Journal of Software: Evolution and Process': 'JSEP',
  'ACM SIGSOFT Software Engineering Notes': 'SIGSOFT SEN',
  'Ethics and Information Technology': 'Ethics & Inf. Tech.',
  'Current Issues in Tourism': 'Current Issues in Tourism',
  'IEEE Access': 'IEEE Access',
};

function shortVenue(p: z.infer<typeof PublicationSchema>): string | null {
  if (p.journal) return JOURNAL_SHORT[p.journal] ?? null;
  const bt = p.booktitle ?? p.book;
  if (!bt) return null;
  // Most proceedings titles carry their acronym in parentheses: "(TechDebt '26)", "(ESEM)".
  const m = bt.match(/\(([A-Za-z][A-Za-z0-9&+\- ]{1,18}?)\s*'?\d{0,4}\)/);
  return m ? m[1]!.trim() : null;
}

const KIND_RANK: Record<PubKind, number> = { journal: 0, conference: 1, chapter: 2 };

function buildPublications(): Publication[] {
  const out: Publication[] = [];
  const buckets: Array<[PubKind, z.infer<typeof PublicationSchema>[]]> = [
    ['journal', cv.publications.journals],
    ['conference', cv.publications.conferences],
    ['chapter', cv.publications.chapters],
  ];

  for (const [kind, list] of buckets) {
    list.forEach((p, i) => {
      out.push({
        ...p,
        kind,
        id: `${kind}-${i}`,
        yearNum: Number(p.year ?? 0),
        venue: (p.journal ?? p.booktitle ?? p.book ?? '') as string,
        venueShort: shortVenue(p),
        themeIds: p.themes ?? [],
        // preserve file order for the sort tie-break
        _index: i,
      } as Publication & { _index: number });
    });
  }

  // De-duplicate: one CIbSE 2024 entry appears twice
  // in cv.yaml. Handled here rather than by editing the CV, so the site is correct without
  // pre-empting Daniel's decision about his own record.
  const seen = new Map<string, Publication>();
  for (const p of out) {
    const doi = (p.doi ?? '').trim().toLowerCase();
    const key = doi !== '' ? `doi:${doi}` : `t:${p.title.trim().toLowerCase()}|${p.yearNum}`;
    if (!seen.has(key)) seen.set(key, p);
  }

  // Sort: newest first, then journals before conferences before chapters, then file order.
  // PROVISIONAL — see REVIEW finding #1: cv.yaml has only `year`, so within a year the
  // ordering is a convention, not a fact. Add a `date:` (YYYY-MM) to make this derivable.
  return [...seen.values()].sort((a, b) => {
    if (b.yearNum !== a.yearNum) return b.yearNum - a.yearNum;
    if (KIND_RANK[a.kind] !== KIND_RANK[b.kind]) return KIND_RANK[a.kind] - KIND_RANK[b.kind];
    return ((a as any)._index ?? 0) - ((b as any)._index ?? 0);
  });
}

export const publications = buildPublications();

export const publicationsByTheme = (id: string) => publications.filter((p) => p.themeIds.includes(id));

export interface ThemeView extends ResearchTheme {
  recent: Publication[];
  awarded: Publication[];
  count: number;
  mscCount: number;
}

/**
 * Evidence under each theme. Deliberately aggregate: nothing here is hand-picked.
 *
 * `recent` is the first `recentCount` publications in the theme under the site-wide sort
 * (year descending, then journal/conference/chapter, then file order). cv.yaml records only
 * a `year`, so within a year the order is a stable convention rather than true recency —
 * which is why these rows are labelled "Recent" and not "Latest". Daniel decided against
 * adding month-level dates; the label carries the weaker, true claim instead.
 */
export function themeViews(recentCount = 2): ThemeView[] {
  const mscThemes = (cv.supervision.msc as any[]).flatMap((m) => (m.themes ?? []) as string[]);
  return cv.research_themes.map((t) => {
    const mine = publicationsByTheme(t.id);
    const awarded = mine.filter((p) => (p.award ?? '').trim() !== '');
    const recent = mine.filter((p) => !awarded.includes(p)).slice(0, recentCount);
    return {
      ...t,
      count: mine.length,
      recent,
      awarded,
      mscCount: mscThemes.filter((x) => x === t.id).length,
    };
  });
}

export const publicationYears = [...new Set(publications.map((p) => p.yearNum))].sort((a, b) => b - a);

export const stats = {
  publications: publications.length,
  journals: publications.filter((p) => p.kind === 'journal').length,
  conferences: publications.filter((p) => p.kind === 'conference').length,
  phdCurrent: cv.supervision.phd.filter((s: any) => String(s.period ?? '').includes('present')).length,
  phdTotal: cv.supervision.phd.length,
  msc: cv.supervision.msc.length,
  bsc: cv.supervision.bsc.length,
  tools: cv.technical_contributions.length,
};


/* ---- venue label helpers (shared by /service and the homepage Recognition block) ---- */

/** Leading acronym from a venue's trailing parenthetical. Digits inside it survive
 *  ("TD4Vis"), a parenthetical that is only a year yields nothing and the name is used. */
export function venueAcronym(venue: string): string {
  const head = venue.replace(/\s*\([^)]*\)\s*$/, '').replace(/\.\s*$/, '').trim();
  const paren = venue.match(/\(([^)]+)\)\s*$/);
  if (!paren) return head || venue;
  return paren[1]!.match(/^[A-Za-z][A-Za-z0-9&+.\-]*/)?.[0] ?? head ?? venue;
}

/** "TechDebt 2026", "MSR 2025" — always a four-digit year, never a mix of '26 and 2025. */
export const venueWithYear = (venue: string, year: string | number) =>
  `${venueAcronym(venue)} ${year}`;

/** Edition years out of an event string: "(TechDebt '27)" -> "2027",
 *  "(ISAPS '23 - '26)" -> "2023–2026". Returns '' when there is nothing to show. */
export function editionYears(event: string): string {
  const paren = event.match(/\(([^)]+)\)\s*$/);
  if (!paren) return '';
  const years = [...paren[1]!.matchAll(/'(\d{2})|\b(\d{4})\b/g)].map((m) =>
    m[1] ? 2000 + Number(m[1]) : Number(m[2]),
  );
  if (years.length === 0) return '';
  const lo = Math.min(...years), hi = Math.max(...years);
  return lo === hi ? String(lo) : `${lo}\u2013${hi}`;
}


/**
 * Funding summarised for the homepage: "<n> grants — <total> awarded from <funders>".
 * Totals are summed PER CURRENCY — the grants are a mix of EUR and USD and no exchange
 * rate is invented here. Marked approximate if any contributing grant is itself approximate.
 */
export function fundingSummary() {
  const list = cv.funding as any[];
  const byCurrency = new Map<string, { total: number; approx: boolean }>();
  for (const f of list) {
    if (typeof f.amount_value !== 'number') continue;
    const cur = String(f.amount_currency ?? 'EUR');
    const acc = byCurrency.get(cur) ?? { total: 0, approx: false };
    acc.total += f.amount_value;
    acc.approx = acc.approx || Boolean(f.amount_approximate);
    byCurrency.set(cur, acc);
  }
  const symbol: Record<string, string> = { EUR: '\u20ac', USD: '$', GBP: '\u00a3' };
  const totals = [...byCurrency.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cur, { total, approx }]) =>
      `${approx ? 'approx. ' : ''}${symbol[cur] ?? cur + ' '}${total.toLocaleString('en-US')}`,
    );
  const funders = [...new Set(list.map((f) => f.funder).filter(Boolean))] as string[];
  const join = (xs: string[]) =>
    xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
  return { count: list.length, amount: join(totals), funders: join(funders) };
}


/**
 * The "In the community" block on the homepage. Two named roles plus aggregate figures.
 *
 * Both roles are picked by RULE, not by list position, so they stay correct as the CV grows:
 *  - `editorial` is the membership whose role names an editor.
 *  - `chairing` is the professional-service entry with the LATEST edition year, i.e. the
 *    current or upcoming chairing role. Today that is Program Co-Chair of TechDebt 2027.
 */
export function communityHighlights() {
  const editorial = (cv.memberships as any[]).find((m) => /editor/i.test(String(m.role ?? '')));

  const professional = ((cv.services as any).professional ?? []) as any[];
  const chairing = professional
    .map((r) => ({ ...r, _year: Number(editionYears(String(r.event ?? '')).slice(-4)) || 0 }))
    .sort((a, b) => b._year - a._year)[0];

  const reviews = (cv.services as any).reviews ?? {};
  const venues = Object.values(reviews).reduce<number>(
    (n, l) => n + (Array.isArray(l) ? l.length : 0), 0);

  return {
    editorial,
    chairing,
    chairingLabel: chairing
      ? `${venueAcronym(String(chairing.event))} ${editionYears(String(chairing.event)).slice(-4)}`
      : '',
    organizingRoles: professional.length,
    venues,
  };
}


/**
 * Distinctions grouped by their `kind` in cv.yaml, newest first.
 *
 * Grouping is driven by the data, not by matching award names: "Best Paper Award" and
 * "ACM SIGSOFT Distinguished Paper Award" both carry `kind: paper-award` and therefore fold
 * into one line. The community cares that a paper was recognized, not which label the venue
 * used. Wording lives here because it is presentation; the classification lives in cv.yaml.
 */
const KIND_LABEL: Record<string, { one: string; many: string }> = {
  'paper-award': { one: 'paper award', many: 'paper awards' },
  'reviewer-award': { one: 'reviewer award', many: 'reviewer awards' },
  'teaching-award': { one: 'teaching award', many: 'teaching awards' },
  'thesis-award': { one: 'thesis award nomination', many: 'thesis award nominations' },
};

export interface DistinctionGroup {
  kind: string;
  label: string;
  count: number;
  venues: string[];
}

export function distinctionGroups(kinds: string[]): DistinctionGroup[] {
  return kinds.flatMap((kind) => {
    const items = (cv.distinctions as any[])
      .filter((d) => d.kind === kind)
      .sort((a, b) => Number(b.year) - Number(a.year));
    if (items.length === 0) return [];
    const words = KIND_LABEL[kind] ?? { one: kind, many: kind };
    return [{
      kind,
      label: items.length === 1 ? words.one : `${items.length} ${words.many}`,
      count: items.length,
      venues: items.map((d) => venueWithYear(String(d.venue ?? d.institution ?? ''), d.year)),
    }];
  });
}


/** Tools that belong to at least one paper. Tools without a linked publication stay in the
 *  CV but are not research output, so they do not appear on the site. */
export const linkedTools = cv.technical_contributions.filter((t) => t.publications.length > 0);

/** Resolve a DOI to the publication record, for rendering a tool's paper by title. */
export const publicationByDoi = (doi: string) =>
  publications.find((p) => (p.doi ?? '').trim().toLowerCase() === doi.trim().toLowerCase());

export const profile = (network: string) => cv.profiles.find((p) => p.network === network)?.url;
export const tagline = cv.site?.tagline ?? cv.summary;
export const currentRole = cv.employment[0];
