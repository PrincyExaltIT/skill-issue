#!/usr/bin/env node
// The references are the single source of truth for rules. This check fails when scan.mjs drifts from them:
// a detector whose rule id is missing from references/, or whose severity is not one the reference allows.

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const skill = join(here, '..', '..', 'skills', 'angular-review');
const { RULES } = await import(new URL('../../skills/angular-review/scripts/lib/rules.mjs', import.meta.url));

const catalogue = new Map();
for (const f of readdirSync(join(skill, 'references')).filter((n) => n.endsWith('_REVIEW.md'))) {
  const md = readFileSync(join(skill, 'references', f), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  for (const sec of md.split(/^### /m).slice(1)) {
    const id = /^(R-[A-Z0-9]+-\d+)\s+—/.exec(sec)?.[1];
    if (!id || /^R-[A-Z0-9]+-\d+\s+—\s*</.test(sec)) continue; // le gabarit vide (« <titre court> ») n'est pas une règle
    const sevLine = /\*\*Sévérité\*\*\s*:\s*(.+)$/m.exec(sec)?.[1] ?? '';
    catalogue.set(id, new Set(sevLine.match(/BLOCKER|MAJOR|MINOR|INFO/g) ?? []));
  }
}

let failures = 0;
for (const r of RULES) {
  const allowed = catalogue.get(r.id);
  if (!allowed) { failures++; console.log(`✖ ${r.id} : détecteur sans règle dans references/`); continue; }
  if (!allowed.has(r.severity)) { failures++; console.log(`✖ ${r.id} : sévérité ${r.severity} absente de la référence (${[...allowed].join('/')})`); }
}
console.log(failures ? `${failures} incohérence(s) entre scan.mjs et references/.` : `✔ ${RULES.length} détecteurs cohérents avec ${catalogue.size} règles de référence.`);
process.exit(failures ? 1 : 0);
