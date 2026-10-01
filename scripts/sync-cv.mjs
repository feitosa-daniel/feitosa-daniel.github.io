#!/usr/bin/env node
// Copies the canonical cv.yaml and the public CV PDF into this checkout for a local build.
// Both copies are gitignored: cv.yaml is private and never committed here. Only the built
// site is published (see README, "Deployment").
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// Default: this repo is checked out next to a `cv/` folder holding the canonical CV.
const SOURCE = process.env.CV_SOURCE ?? resolve(here, '../../cv/cv.yaml');
const DEST = resolve(here, '../src/data/cv.yaml');

if (!existsSync(SOURCE)) {
  console.error(`\n  Cannot find the canonical CV at:\n    ${SOURCE}\n`);
  console.error('  Set CV_SOURCE to override, e.g.  CV_SOURCE=/path/to/cv.yaml npm run sync-cv\n');
  process.exit(1);
}

const incoming = readFileSync(SOURCE, 'utf8');
const current = existsSync(DEST) ? readFileSync(DEST, 'utf8') : null;

if (current === incoming) {
  console.log('cv.yaml is already up to date.');
} else {
  writeFileSync(DEST, incoming);
  const verb = current === null ? 'Created' : 'Updated';
  console.log(`${verb} src/data/cv.yaml from ${SOURCE}`);
}

// Also mirror the public CV PDF, which the site links to.
const PDF_SRC = resolve(dirname(SOURCE), 'Feitosa-CV-Public.pdf');
const PDF_DEST = resolve(here, '../public/Feitosa-CV-Public.pdf');
if (existsSync(PDF_SRC)) {
  const pdf = readFileSync(PDF_SRC);
  if (!existsSync(PDF_DEST) || !readFileSync(PDF_DEST).equals(pdf)) {
    writeFileSync(PDF_DEST, pdf);
    console.log('Updated public/Feitosa-CV-Public.pdf');
  }
} else {
  console.warn('No Feitosa-CV-Public.pdf next to the CV — the site will link a missing file.');
}
