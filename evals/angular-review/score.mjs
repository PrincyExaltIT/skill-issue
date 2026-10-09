#!/usr/bin/env node
// Score a review against the playground answer key.
//   node evals/angular-review/score.mjs --report ../skill-issue-playground/.review/REVIEW.md      any review (Markdown, text, JSON)
//   node evals/angular-review/score.mjs --findings ../skill-issue-playground/.review/findings.json  angular-review findings
//   options: --key <file> · --lenient (findings: any rule id) · --json (summary as JSON on stdout)
//
// --report: every `path:line` cited by the review counts as a finding, whatever its rule. Sections that list dismissed
// candidates (a heading containing "Écartés", "dismissed", "non retenus"…) and the explanation paragraphs of a finding
// (**Problème**, **Correction**…) are skipped. This is the mode for a skill
// you build yourself: the only contract is to cite `file:line`.
// --findings: an open finding explains an issue when it has one of the accepted rule ids (--lenient: any rule id).
//
// An issue is found when a finding sits in the same file, within ±3 lines (±2 with --report, which ignores rule ids)
// of the issue or of one of its `alsoAt` locations. File-level issues (a new unit without spec) are found by a finding on that file that talks about tests.
// Extras = findings that explain no issue. A decoy is hit by a finding on its line (±1) that explains no issue.

import { readFileSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(`--${k}`); return i === -1 ? undefined : argv[i + 1]; };
const key = JSON.parse(readFileSync(resolve(arg('key') ?? join(here, 'playground-key.json')), 'utf8'));
const reportPath = arg('report');
const mode = reportPath ? 'report' : 'findings';
const lenient = argv.includes('--lenient') || mode === 'report';

const FILE_LEVEL = new Set(['R-TEST-001']);
const isFileLevel = (issue) => issue.rules.some((r) => FILE_LEVEL.has(r));
const locations = (issue) => [{ file: issue.file, line: issue.line }, ...(issue.alsoAt ?? [])];
const keyFiles = [...new Set([...key.issues.flatMap(locations), ...(key.decoys ?? [])].map((l) => l.file))];

const findings = mode === 'report' ? fromReport(resolve(reportPath)) : fromFindings(resolve(arg('findings') ?? '.review/findings.json'));

// A finding covers lines [line, end]; it is near a location when that location is within `slack` lines of the range.
const SLACK = mode === 'report' ? 2 : 3;
const near = (f, loc, slack = SLACK) => f.file === loc.file && loc.line >= f.line - slack && loc.line <= (f.end ?? f.line) + slack;
const accepts = (issue, f) => lenient || issue.rules.includes(f.ruleId);
const explains = (issue, f) => {
  if (!accepts(issue, f)) return false;
  if (isFileLevel(issue)) {
    const files = locations(issue).map((l) => l.file);
    return files.includes(f.file) && (mode === 'findings' ? FILE_LEVEL.has(f.ruleId) || locations(issue).some((l) => near(f, l)) : /spec|test/i.test(f.context ?? ''));
  }
  return locations(issue).some((loc) => near(f, loc));
};

// --findings: a finding may explain several issues (its rule id keeps it specific).
// --report: one citation proves one issue at most, the closest one, so a line that sits between two issues
// cannot count twice.
// Distance from a citation to an issue: 0 inside the cited range; an `alsoAt` location counts half a line further
// than the main one, so a citation goes to the issue it is primarily about.
const gap = (f, l) => (l.line < f.line ? f.line - l.line : l.line > (f.end ?? f.line) ? l.line - (f.end ?? f.line) : 0);
const distance = (issue, f) => isFileLevel(issue) ? 0 : Math.min(...locations(issue).map((l, i) => (l.file === f.file ? gap(f, l) + (i ? 0.5 : 0) : Infinity)));
const SEVERITY = ['BLOCKER', 'MAJOR', 'MINOR', 'INFO'];
const hits = new Map();
if (mode === 'findings') {
  for (const issue of key.issues) hits.set(issue.id, findings.find((f) => explains(issue, f)));
} else {
  // Maximum matching (augmenting paths): required issues first, then the most severe, each trying its closest
  // citations first. When a review merges two problems into one finding, the citation credits the graver one.
  const options = new Map(key.issues.map((issue) => [issue.id, findings.filter((f) => explains(issue, f)).sort((a, b) => distance(issue, a) - distance(issue, b))]));
  const owner = new Map();
  const assign = (id, seen) => options.get(id).some((f) => {
    if (seen.has(f)) return false;
    seen.add(f);
    if (owner.has(f) && !assign(owner.get(f), seen)) return false;
    owner.set(f, id);
    return true;
  });
  const order = [...key.issues].sort((a, b) => (a.mustFind === false) - (b.mustFind === false) || SEVERITY.indexOf(a.severity) - SEVERITY.indexOf(b.severity));
  for (const issue of order) assign(issue.id, new Set());
  for (const [f, id] of owner) hits.set(id, f);
}
const rows = key.issues.map((issue) => ({ ...issue, hit: hits.get(issue.id) }));
const extras = findings.filter((f) => !key.issues.some((issue) => explains(issue, f)));
const decoyHits = (key.decoys ?? []).map((d) => ({ ...d, hit: extras.find((f) => near(f, d, 1)) })).filter((d) => d.hit);

const must = rows.filter((r) => r.mustFind !== false);
const found = must.filter((r) => r.hit);
const optional = rows.filter((r) => r.mustFind === false);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 100);
const bySeverity = Object.fromEntries(['BLOCKER', 'MAJOR', 'MINOR', 'INFO'].map((s) => {
  const all = must.filter((r) => r.severity === s);
  return [s, { found: all.filter((r) => r.hit).length, total: all.length }];
}).filter(([, v]) => v.total));
const summary = {
  mode,
  recall: pct(found.length, must.length), found: found.length, must: must.length, bySeverity,
  bonus: { found: optional.filter((r) => r.hit).length, total: optional.length },
  precision: pct(findings.length - extras.length, findings.length), explained: findings.length - extras.length, findings: findings.length,
  decoys: { hit: decoyHits.length, total: (key.decoys ?? []).length },
  missed: must.filter((r) => !r.hit).map((r) => r.id),
};

if (argv.includes('--json')) {
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
} else {
  const where = (f) => `${f.file}:${f.line}${f.end && f.end !== f.line ? `-${f.end}` : ''}`;
  for (const r of rows) console.log(`${r.hit ? '✔' : r.mustFind === false ? '·' : '✖'} ${r.id} ${r.severity.padEnd(7)} ${r.file.split('/').pop()}:${r.line}  ${r.title}${r.hit ? `  ← ${r.hit.ruleId ? `${r.hit.id ? r.hit.id + ' ' : ''}${r.hit.ruleId}` : where(r.hit)}` : ''}`);
  for (const e of extras) console.log(`? hors corrigé : ${where(e)}${e.ruleId ? ` ${e.ruleId}` : ''}${e.title ? ` — ${e.title}` : ''}`);
  for (const d of decoyHits) console.log(`⚠ leurre ${d.id} signalé : ${d.file}:${d.line} — ${d.why}`);
  const sev = Object.entries(bySeverity).map(([s, v]) => `${s} ${v.found}/${v.total}`).join(' · ');
  console.log(`\nRappel ${summary.recall} % (${found.length}/${must.length}) · ${sev} · bonus ${summary.bonus.found}/${summary.bonus.total}`);
  console.log(`Précision ${summary.precision} % (${summary.explained}/${findings.length} ${mode === 'report' ? 'emplacements cités' : 'findings'} expliqués par le corrigé ; un « hors corrigé » peut rester légitime)`);
  console.log(`Leurres signalés à tort : ${decoyHits.length}/${summary.decoys.total}`);
}

function fromFindings(path) {
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  return (doc.findings ?? doc.candidates ?? []).filter((f) => !f.status || ['open', 'candidate'].includes(f.status));
}

function fromReport(path) {
  const text = readFileSync(path, 'utf8');
  if (extname(path) === '.json') {
    const doc = JSON.parse(text);
    const list = Array.isArray(doc) ? doc : doc.findings ?? doc.candidates ?? [];
    return dedupe(list.filter((f) => f.file && f.line).map((f) => ({ ...f, file: resolveFile(f.file), line: Number(f.line), ruleId: null, context: `${f.title ?? ''} ${f.message ?? ''} ${f.ruleId ?? ''}` })));
  }
  const DISMISSED = /écart|ecart|dismiss|non retenu|rejet|faux positif|false positive/i;
  // The body of a finding cites other places as context ("comme talks.store.ts:9"): only its location counts.
  const EXPLANATION = /^\s*(?:[-*>]\s*)?\*\*(Problème|Correction|Correctif|Pourquoi|Impact|Preuve|Problem|Fix|Why)\b/i;
  const CITATION = /((?:[\w@.-]+[\\/])*[\w@-]+(?:\.[\w-]+)*\.(?:ts|html|scss|css|json))(?::(\d+)(?:\s*[-–]\s*L?(\d+))?|#L(\d+)(?:-L?(\d+))?|\s*[,(]\s*(?:l\.|lignes?|lines?)\s*(\d+))/g;
  const lines = text.split(/\r?\n/);
  const out = [];
  let skipLevel = 0;
  lines.forEach((raw, i) => {
    const heading = raw.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      if (skipLevel && level <= skipLevel) skipLevel = 0;
      if (!skipLevel && DISMISSED.test(heading[2])) skipLevel = level;
    }
    if (skipLevel || EXPLANATION.test(raw)) return;
    for (const m of raw.matchAll(CITATION)) {
      const line = Number(m[2] ?? m[4] ?? m[6]);
      const end = Number(m[3] ?? m[5] ?? line);
      out.push({ file: resolveFile(m[1]), line, end: Math.max(line, end), ruleId: null, context: lines.slice(Math.max(0, i - 1), i + 4).join(' ') });
    }
  });
  return dedupe(out);
}

// A cited path may be partial (talk-card.ts) or longer than the key's path: resolve it to the one key file it names.
function resolveFile(cited) {
  const c = String(cited).replace(/\\/g, '/').replace(/^\.\//, '');
  const hits = keyFiles.filter((k) => k === c || k.endsWith(`/${c}`) || c.endsWith(`/${k}`));
  return hits.length === 1 ? hits[0] : c;
}

function dedupe(list) {
  const seen = new Map();
  for (const f of list) {
    const id = `${f.file}:${f.line}-${f.end ?? f.line}`;
    if (seen.has(id)) seen.get(id).context += ` ${f.context ?? ''}`;
    else seen.set(id, { ...f });
  }
  return [...seen.values()];
}
