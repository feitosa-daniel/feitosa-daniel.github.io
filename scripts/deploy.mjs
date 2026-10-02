#!/usr/bin/env node
// Builds the site locally and publishes ONLY the built output (dist/) to the `gh-pages`
// branch, which GitHub Pages serves. The CV data never leaves this machine: cv.yaml is read
// at build time and nothing but rendered HTML, CSS, images and the public CV PDF is pushed.
//
//   npm run deploy            sync the CV, build, check, publish
//   npm run deploy -- --dry   do everything except the push
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const BRANCH = 'gh-pages';
const dry = process.argv.includes('--dry');

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit', ...opts });
const git = (args, cwd = root) =>
  execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const fail = (msg) => { console.error(`\n  deploy: ${msg}\n`); process.exit(1); };

// 1. Build from the canonical CV.
run('node', ['scripts/sync-cv.mjs']);
run('npx', ['astro', 'build']);

// 2. Leak check: refuse to publish data files or anything that names private sources.
const files = [];
const walk = (d) => readdirSync(d).forEach((f) => {
  const p = join(d, f);
  statSync(p).isDirectory() ? walk(p) : files.push(p);
});
walk(dist);

const dataFiles = files.filter((f) => /\.(ya?ml|json|tex|bib)$/i.test(f));
if (dataFiles.length) fail(`data files in dist/:\n    ${dataFiles.map((f) => relative(root, f)).join('\n    ')}`);

const cv = YAML.parse(readFileSync(join(root, 'src/data/cv.yaml'), 'utf8')) ?? {};
const forbidden = [/\.ts\.net\b/i, /gitea/i, /tailscale/i, /tailnet/i];
const phone = cv.phone ?? cv.basics?.phone;
if (phone) forbidden.push(new RegExp(String(phone).replace(/[^0-9]/g, '').split('').join('[\\s().-]*')));
for (const f of files.filter((f) => /\.(html|xml|txt|js|css|svg)$/i.test(f))) {
  const text = readFileSync(f, 'utf8');
  const hit = forbidden.find((re) => re.test(text));
  if (hit) fail(`${relative(root, f)} matches ${hit} — not publishing.`);
}
if (!existsSync(join(dist, '.nojekyll'))) fail('dist/.nojekyll is missing (Pages would run Jekyll on it).');
console.log(`Leak check passed (${files.length} files).`);

// 3. Commit dist/ onto gh-pages in a throwaway worktree, so the main checkout is untouched.
const source = git(['rev-parse', '--short', 'HEAD']);
const dirty = git(['status', '--porcelain']) !== '';
const wt = mkdtempSync(join(tmpdir(), 'gh-pages-'));
const remoteHasBranch = (() => {
  try { git(['ls-remote', '--exit-code', '--heads', 'origin', BRANCH]); return true; } catch { return false; }
})();

try {
  if (remoteHasBranch) {
    git(['fetch', '-q', 'origin', BRANCH]);
    git(['worktree', 'add', '-q', '--detach', wt, `origin/${BRANCH}`]);
  } else {
    git(['worktree', 'add', '-q', '--detach', wt]);
    git(['checkout', '-q', '--orphan', `${BRANCH}-deploy`], wt);
  }
  git(['rm', '-rqf', '--ignore-unmatch', '.'], wt);
  cpSync(dist, wt, { recursive: true });
  git(['add', '-A'], wt);

  if (git(['status', '--porcelain'], wt) === '') {
    console.log('The built site is identical to what is published. Nothing to deploy.');
  } else {
    const msg = `Deploy ${source}${dirty ? ' (with uncommitted changes)' : ''}`;
    git(['commit', '-q', '-m', msg], wt);
    if (dry) {
      console.log(`Dry run: committed "${msg}" locally in ${wt}, not pushed.`);
    } else {
      execFileSync('git', ['push', 'origin', `HEAD:refs/heads/${BRANCH}`], { cwd: wt, stdio: 'inherit' });
      console.log(`Published ${source} to ${BRANCH}. Pages updates in a minute or two.`);
    }
  }
} finally {
  git(['worktree', 'remove', '--force', wt]);
  try { git(['branch', '-D', `${BRANCH}-deploy`]); } catch {}
}
