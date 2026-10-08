#!/usr/bin/env node
// Snapshot tests for the deterministic half of angular-review (scan.mjs).
//   node evals/angular-review/run-scan-tests.mjs           compare with expected.json
//   node evals/angular-review/run-scan-tests.mjs --update  rewrite expected.json after a deliberate rule change
// The clean fixture must stay at zero candidates: that is the precision guard.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, 'cases', 'fixture-app');
const scan = join(here, '..', '..', 'skills', 'angular-review', 'scripts', 'scan.mjs');
const expectedPath = join(here, 'cases', 'expected.json');

const files = walk(join(fixture, 'src')).map((f) => relative(fixture, f).replace(/\\/g, '/')).filter((f) => /\.(ts|html)$/.test(f)).sort();
const out = join(fixture, '.review', 'scan-test.json');
execFileSync(process.execPath, [scan, '--root', fixture, '--files', files.join(','), '--all', '--format', 'json', '--out', out], { stdio: ['ignore', 'ignore', 'inherit'] });
const report = JSON.parse(readFileSync(out, 'utf8'));
rmSync(join(fixture, '.review'), { recursive: true, force: true });

const actual = Object.fromEntries(files.map((f) => [f, report.candidates.filter((c) => c.file === f).map((c) => `${c.ruleId}:${c.line}`).sort()]));

if (process.argv.includes('--update')) {
  writeFileSync(expectedPath, JSON.stringify(actual, null, 2) + '\n');
  console.log(`expected.json mis à jour (${report.candidates.length} candidats).`);
  process.exit(0);
}

const expected = JSON.parse(readFileSync(expectedPath, 'utf8'));
let failures = 0;
for (const file of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
  const exp = new Set(expected[file] ?? []);
  const act = new Set(actual[file] ?? []);
  const missing = [...exp].filter((x) => !act.has(x));
  const extra = [...act].filter((x) => !exp.has(x));
  const ok = missing.length === 0 && extra.length === 0;
  if (!ok) failures++;
  console.log(`${ok ? '✔' : '✖'} ${file} — ${act.size} candidat(s)${missing.length ? ` | manquants: ${missing.join(', ')}` : ''}${extra.length ? ` | en trop: ${extra.join(', ')}` : ''}`);
}
const clean = Object.entries(actual).filter(([f]) => f.includes('/clean/')).flatMap(([, v]) => v);
if (clean.length) { failures++; console.log(`✖ fixtures "clean" : ${clean.length} faux positif(s) : ${clean.join(', ')}`); }
console.log(failures ? `\n${failures} échec(s).` : '\nTous les snapshots passent.');
process.exit(failures ? 1 : 0);

function walk(dir) {
  return readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
}
