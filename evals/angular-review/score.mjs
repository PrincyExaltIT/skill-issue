#!/usr/bin/env node
// Score a review (full skill run, or scan alone) against the playground answer key.
//   node evals/angular-review/score.mjs --findings ../skill-issue-playground/.review/findings.json [--key playground-key.json] [--lenient]
//
// An issue is found when an open finding sits in the same file, within ±3 lines of the issue or of one of its
// `alsoAt` locations, with one of the accepted rule ids (--lenient: any rule id).
// Extras = findings that explain no issue location. Decoys hit by a finding are false positives.

import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(`--${k}`); return i === -1 ? undefined : argv[i + 1]; };
const lenient = argv.includes('--lenient');
const key = JSON.parse(readFileSync(resolve(arg('key') ?? join(here, 'playground-key.json')), 'utf8'));
const doc = JSON.parse(readFileSync(resolve(arg('findings') ?? '.review/findings.json'), 'utf8'));
const findings = (doc.findings ?? doc.candidates ?? []).filter((f) => !f.status || ['open', 'candidate'].includes(f.status));

const locations = (issue) => [{ file: issue.file, line: issue.line }, ...(issue.alsoAt ?? [])];
const near = (f, loc) => f.file === loc.file && Math.abs(f.line - loc.line) <= 3;
const accepts = (issue, f) => lenient || issue.rules.includes(f.ruleId);
const explains = (issue, f) => accepts(issue, f) && locations(issue).some((loc) => near(f, loc));

const rows = key.issues.map((issue) => ({ ...issue, hit: findings.find((f) => explains(issue, f)) }));
const extras = findings.filter((f) => !key.issues.some((issue) => explains(issue, f)));
const decoyHits = (key.decoys ?? []).map((d) => ({ ...d, hit: findings.find((f) => near(f, d)) })).filter((d) => d.hit);

for (const r of rows) console.log(`${r.hit ? '✔' : r.mustFind === false ? '·' : '✖'} ${r.id} ${r.severity.padEnd(7)} ${r.rules.join('|').padEnd(24)} ${r.file.split('/').pop()}:${r.line}  ${r.title}${r.hit ? `  ← ${r.hit.id ? r.hit.id + ' ' : ''}${r.hit.ruleId}` : ''}`);
for (const e of extras) console.log(`? hors corrigé : ${e.ruleId} ${e.file}:${e.line} — ${e.title ?? e.message}`);
for (const d of decoyHits) console.log(`⚠ leurre ${d.id} signalé : ${d.file}:${d.line} (${d.hit.ruleId}) — ${d.why}`);

const must = rows.filter((r) => r.mustFind !== false);
const found = must.filter((r) => r.hit);
const bySeverity = ['BLOCKER', 'MAJOR', 'MINOR', 'INFO'].map((s) => {
  const all = must.filter((r) => r.severity === s);
  return all.length ? `${s} ${all.filter((r) => r.hit).length}/${all.length}` : null;
}).filter(Boolean);
const optional = rows.filter((r) => r.mustFind === false);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 100);
console.log(`\nRappel ${pct(found.length, must.length)} % (${found.length}/${must.length}) · ${bySeverity.join(' · ')} · bonus ${optional.filter((r) => r.hit).length}/${optional.length}`);
console.log(`Précision ${pct(findings.length - extras.length, findings.length)} % (${findings.length - extras.length}/${findings.length} findings expliqués par le corrigé ; un « hors corrigé » peut rester légitime)`);
console.log(`Leurres signalés à tort : ${decoyHits.length}/${(key.decoys ?? []).length}`);
