#!/usr/bin/env node
// fill-v2.mjs — inject a REAL review run into the v2 video template.
//   node studio/fill-v2.mjs ../skill-issue-playground/.review
// Reads scope.json, scan.json and findings.json produced by the angular-review skill on the demo branch.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(process.argv[2] ?? '../skill-issue-playground/.review');
const j = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const scope = j('scope.json'); const scan = j('scan.json'); const findings = j('findings.json');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const sevClass = { BLOCKER: 'blocker', MAJOR: 'major', MINOR: 'minor', INFO: 'info' };

const shown = scan.candidates.slice(0, 9);
const candidates = shown.map((c, i) => `    <div class="r" data-at="${(35.6 + i * 0.75).toFixed(2)}" data-fx="slide-l"><span class="sev ${sevClass[c.severity]}">${c.severity}</span><span>${c.ruleId}</span><span>${esc(c.file.split('/').pop())}:${c.line} · ${esc(c.title)}</span></div>`).join('\n');

const lanesDef = [
  ['angular-security-reviewer', 'R-SEC'], ['angular-architecture-reviewer', 'R-ARCH'], ['angular-reactivity-reviewer', 'R-SIG|R-RX'],
  ['angular-performance-reviewer', 'R-PERF'], ['angular-a11y-error-reviewer', 'R-A11Y|R-ERR'], ['angular-testing-reviewer', 'R-TEST'], ['project-compliance-reviewer', 'R-PROJ'],
];
const all = [...findings.findings, ...findings.dismissed];
const lanes = lanesDef.map(([name, prefix], i) => {
  const n = all.filter((f) => new RegExp(`^(${prefix})-`).test(f.ruleId)).length;
  const off = prefix === 'R-PROJ';
  const at = (51.6 + i * 0.35).toFixed(2);
  const dur = (2.5 + ((i * 7) % 5) * 0.6).toFixed(1);
  return `    <div class="lane${off ? ' off' : ''}" data-at="${at}" data-fx="slide-l"><span>${name}</span><span class="track">${off ? '<i style="transform:scaleX(0)"></i>' : `<i data-at="${(Number(at) + 0.4).toFixed(2)}" data-fx="grow" data-dur="${dur}"></i>`}</span><span class="n">${off ? 'inactif' : `<span data-at="${(Number(at) + 0.4 + Number(dur)).toFixed(2)}">${n} constat${n > 1 ? 's' : ''}</span>`}</span></div>`;
}).join('\n');

const kept = findings.findings.filter((f) => f.severity === 'BLOCKER').slice(0, 2);
const dropped = findings.dismissed.slice(0, 2);
const rows = [
  ...kept.map((f) => ({ id: f.id, text: `${f.ruleId} · ${f.file.split('/').pop()}:${f.line} — ${f.title ?? f.message}`, verdict: '<span class="keep">✓ gardé</span>' })),
  ...dropped.map((d) => ({ id: d.id, text: `${d.ruleId} · ${d.file.split('/').pop()}:${d.line} — ${d.reason}`, verdict: '<span class="drop">✗ écarté</span>' })),
];
const verify = rows.map((r, i) => `    <div class="vrow" data-at="${(69.4 + i * 1.6).toFixed(2)}" data-fx="rise"><span class="id">${esc(r.id)}</span><span>${esc(r.text).slice(0, 120)}</span>${r.verdict}</div>`).join('\n');

const count = (s) => findings.findings.filter((f) => f.severity === s).length;
let html = readFileSync(join(here, 'scenes', 'v2-review.template.html'), 'utf8');
const values = {
  FILES: scope.stats.files, ADDED: scope.stats.added, DELETED: scope.stats.deleted,
  CANDIDATES: candidates, TOTAL: scan.candidates.length, MECH: 41, LANES: lanes, VERIFY: verify,
  N_BLOCKER: count('BLOCKER'), N_MAJOR: count('MAJOR'), N_MINOR: count('MINOR'), N_INFO: count('INFO'),
};
html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => String(values[k] ?? ''));
writeFileSync(join(here, 'scenes', 'v2-review.html'), html);
console.log(`v2-review.html: ${scan.candidates.length} candidats, ${findings.findings.length} findings, ${findings.dismissed.length} écartés, verdict ${findings.verdict}`);
