#!/usr/bin/env node
// build.mjs — assemble the course into ONE self-contained HTML file.
//   node site/build.mjs        -> site/dist/index.html (full document) + site/dist/artifact.html (body-only variant)
// Data shown on the site (rules, skill anatomy, harnesses, triggers) is READ from the kit itself,
// so the course cannot drift from the skill it teaches.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const src = join(here, 'src');
const dist = join(here, 'dist');
const skill = join(repo, 'skills', 'angular-review');
mkdirSync(dist, { recursive: true });

const read = (p) => readFileSync(p, 'utf8');
const json = (p) => JSON.parse(read(p));

// ── Template with includes ────────────────────────────────────────────────
let html = read(join(src, 'index.html'));
const INCLUDE = /<!--\s*@include\s+([\w./-]+)\s*-->/g;
for (let pass = 0; pass < 5 && INCLUDE.test(html); pass++) {
  INCLUDE.lastIndex = 0;
  html = html.replace(INCLUDE, (_, f) => read(join(src, f)));
}

// ── Data: rules catalogue parsed from references/*.md ─────────────────────
const { RULES } = await import(new URL('../skills/angular-review/scripts/lib/rules.mjs', import.meta.url));
const mechanical = new Set(RULES.map((r) => r.id));
const GATES = {
  'R-PERF-020': 'selon version', 'R-ARCH-010': 'v19+', 'R-ARCH-028': 'déprécié v20', 'R-ARCH-034': 'v22+', 'R-ARCH-035': 'v20.2+',
  'R-SIG-007': 'stable v22', 'R-SIG-009': 'v22+', 'R-PERF-035': 'zoneless', 'R-TEST-005': 'zoneless', 'R-PERF-016': 'SSR', 'R-PERF-019': 'SSR', 'R-PERF-026': 'SSR',
};
const ADDED_V2 = /^(R-SIG|R-RX|R-TEST)-|^R-ARCH-0(2[7-9]|3\d)$|^R-PERF-03[4-7]$|^R-A11Y-014$/;
const rules = [];
for (const f of readdirSync(join(skill, 'references')).filter((n) => n.endsWith('_REVIEW.md'))) {
  const md = read(join(skill, 'references', f)).replace(/<!--[\s\S]*?-->/g, ''); // rules inside HTML comments are examples, not rules
  const domain = /^domain:\s*(.+)$/m.exec(md)?.[1].trim() ?? f;
  const sections = md.split(/^### /m).slice(1);
  for (const sec of sections) {
    const head = /^(R-[A-Z0-9]+-\d+)\s+—\s+(.+)$/m.exec(sec);
    if (!head || head[2].includes('<titre')) continue;
    const sevLine = /\*\*Sévérité\*\*\s*:\s*(.+)$/m.exec(sec)?.[1] ?? '';
    const sevs = [...new Set((sevLine.match(/BLOCKER|MAJOR|MINOR|INFO/g) ?? []))];
    const alias = /\*\*v2 — alias\*\*/.test(sec);
    rules.push({
      id: head[1], title: head[2].replace(/`/g, '').trim(), severity: sevs.join('/') || 'INFO', domain,
      mechanical: mechanical.has(head[1]), gate: GATES[head[1]] ?? (alias ? 'alias' : ''), added: ADDED_V2.test(head[1]),
    });
  }
}
rules.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));

// ── Data: anatomy of the angular-review skill, with real excerpts ─────────
const excerpt = (p, from = 1, to = 18) => read(join(skill, p)).split('\n').slice(from - 1, to).join('\n');
const mechCount = new Set(RULES.map((r) => r.id)).size;
const anatomy = [
  { path: 'angular-review/', name: 'angular-review/', depth: 0, dir: true, level: 0, role: "Le skill, c'est ce dossier. Son nom doit être identique au champ <code>name</code> du frontmatter. On le copie (ou on le lie) dans le dossier de skills du harness : rien d'autre à installer." },
  { path: 'angular-review/SKILL.md', name: 'SKILL.md', depth: 1, level: 1, role: "Le seul fichier obligatoire. Le <b>frontmatter</b> (name + description, ~100 tokens) est chargé dans <b>toutes</b> les sessions : c'est le niveau 1. Le <b>corps</b> (le workflow en 6 étapes) n'est chargé que quand la description correspond à la demande : niveau 2.", excerpt: excerpt('SKILL.md', 1, 16) },
  { path: 'angular-review/scripts/', name: 'scripts/', depth: 1, dir: true, level: 'x', role: "Ce qui doit être <b>exact</b> est du code, pas de la prose. Les scripts sont <b>exécutés</b> : seul leur résultat entre dans le contexte, jamais leur source. Node ≥ 18, zéro dépendance." },
  { path: 'angular-review/scripts/scope.mjs', name: 'scope.mjs', depth: 2, level: 'x', role: "Délimite le diff (merge-base, CI GitHub/GitLab, staged) et détecte le contexte Angular : version, OnPush par défaut (v22), zoneless, SSR, runner de tests, fichier de bonnes pratiques officiel. Écrit <code>.review/scope.json</code>.", excerpt: excerpt('scripts/scope.mjs', 1, 12) },
  { path: 'angular-review/scripts/scan.mjs', name: 'scan.mjs', depth: 2, level: 'x', role: `Passe mécanique : ${mechCount} règles détectables par heuristique, <b>sur les lignes modifiées uniquement</b>. Produit des candidats, pas des verdicts. Exporte aussi en SARIF (GitHub), Code Quality (GitLab) et annotations : c'est la porte CI sans IA.`, excerpt: excerpt('scripts/scan.mjs', 1, 10) },
  { path: 'angular-review/scripts/findings.mjs', name: 'findings.mjs', depth: 2, level: 'x', role: "La moitié déterministe de la review : fusion et dédoublonnage, <b>vérification anti-hallucination</b> (l'extrait cité doit exister à la ligne indiquée), décisions keep/dismiss, verdict calculé, rendu du rapport. Refuse de rendre tant qu'un candidat n'est pas vérifié.", excerpt: excerpt('scripts/findings.mjs', 1, 14) },
  { path: 'angular-review/scripts/lib/', name: 'lib/  (rules, source, project, formats)', depth: 2, dir: true, level: 'x', role: "Le catalogue des règles mécaniques (<code>rules.mjs</code>), un mini-lecteur de code TS/HTML (pas un parseur : assez bon pour pointer une ligne), la détection projet et les formats CI." },
  { path: 'angular-review/references/', name: 'references/', depth: 1, dir: true, level: 3, role: "Le savoir, découpé par domaine. ~2 500 lignes au total, mais un reviewer ne charge <b>que son fichier</b>, et seulement si un fichier modifié correspond à son <code>applies_to</code>. C'est le niveau 3." },
  { path: 'angular-review/references/SECURITY_REVIEW.md', name: 'SECURITY_REVIEW.md', depth: 2, level: 3, role: '23 règles R-SEC (XSS, sanitizer, CSP, XSRF, SSR, secrets). Héritées de la v1, format de sortie unifié.', excerpt: excerpt('references/SECURITY_REVIEW.md', 1, 16) },
  { path: 'angular-review/references/REACTIVITY_REVIEW.md', name: 'REACTIVITY_REVIEW.md', depth: 2, level: 3, role: 'Nouveau en v2 : signals, contexte d\'injection (NG0203), resources, RxJS. Les bugs les plus fréquents depuis l\'arrivée des signals.', excerpt: excerpt('references/REACTIVITY_REVIEW.md', 1, 18) },
  { path: 'angular-review/references/…', name: '… ARCHITECTURE, PERFORMANCE, A11Y, TESTING, PROJECT', depth: 2, level: 3, role: 'Un fichier par reviewer. <code>PROJECT_COMPLIANCE_REVIEW.md</code> est le gabarit que l\'équipe remplit avec ses propres règles (R-PROJ) : le reviewer ne s\'active que s\'il contient au moins une règle.' },
  { path: 'angular-review/references/VERSION_GATES.md', name: 'VERSION_GATES.md', depth: 2, level: 3, role: "Ce qui change d'Angular 17 à 22 et quelles règles en dépendent. Exemple : sur Angular 22, OnPush est le défaut — réclamer OnPush devient un faux positif.", excerpt: excerpt('references/VERSION_GATES.md', 1, 8) },
  { path: 'angular-review/references/REVIEWER_PROMPT.md', name: 'REVIEWER_PROMPT.md', depth: 2, level: 3, role: 'Le prompt envoyé à chaque sous-agent reviewer, et la seule définition du format de sortie (source unique de vérité).', excerpt: excerpt('references/REVIEWER_PROMPT.md', 1, 10) },
  { path: 'angular-review/assets/', name: 'assets/', depth: 1, dir: true, level: 3, role: "Ce qui sert à <b>produire</b> la sortie sans être lu comme instruction : gabarit du rapport, schéma JSON du contrat <code>findings.json</code>." },
  { path: 'angular-review/assets/report-template.md', name: 'report-template.md', depth: 2, level: 3, role: 'Le gabarit du rapport en français, rempli par findings.mjs.', excerpt: excerpt('assets/report-template.md', 1, 10) },
  { path: 'angular-review/assets/findings.schema.json', name: 'findings.schema.json', depth: 2, level: 3, role: 'Le contrat de hand-off entre angular-review (écrit), review-fix et pr-handoff (lisent) et la CI.' },
  { path: 'angular-review/agents/openai.yaml', name: 'agents/openai.yaml', depth: 1, level: 0, role: "Métadonnées d'affichage propres à Codex (nom, description courte). Les autres harnesses l'ignorent : c'est une <b>extension</b>, pas le standard." },
  { path: 'evals/angular-review/', name: '../evals/ (hors du skill)', depth: 0, dir: true, level: 0, role: "Les tests du skill vivent <b>à côté</b>, pas dedans : fixtures + snapshots du scan, prompts de déclenchement, corrigé de la démo et script de score (rappel / précision). Ils ne sont jamais chargés par l'agent." },
];

// ── Data: harnesses & triggers ────────────────────────────────────────────
const harnesses = existsSync(join(repo, 'kit', 'harnesses.json')) ? json(join(repo, 'kit', 'harnesses.json')) : { list: [] };
const triggers = json(join(repo, 'evals', 'angular-review', 'triggers.json'));
const keyPath = join(repo, 'evals', 'angular-review', 'playground-key.json');
const labIssues = existsSync(keyPath) ? json(keyPath).issues.length : 'une vingtaine de';

const dataBlock = (id, value) => `<script type="application/json" id="${id}">${JSON.stringify(value).replace(/</g, '\\u003c')}</script>`;
// Function replacers: a string replacement would interpret "$$", "$&"… inside the injected code.
html = html
  .replace('<!-- @data -->', () => [dataBlock('data-rules', rules), dataBlock('data-anatomy', anatomy), dataBlock('data-harnesses', harnesses), dataBlock('data-triggers', triggers)].join('\n'))
  .replace('/* @styles */', () => read(join(src, 'styles.css')))
  .replace('/* @script */', () => read(join(src, 'app.js')))
  .replaceAll('{{RULES_TOTAL}}', String(rules.length))
  .replaceAll('{{RULES_MECH}}', String(rules.filter((r) => r.mechanical).length))
  .replaceAll('{{BUILD_DATE}}', new Date().toISOString().slice(0, 10))
  .replaceAll('{{LAB_ISSUES}}', String(labIssues));

writeFileSync(join(dist, 'index.html'), html);

// Artifact variant: the host wraps the page itself, so drop doctype/html/head/body wrappers.
const head = /<head>([\s\S]*?)<\/head>/.exec(html)[1].replace(/<meta charset[^>]*>\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '');
const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)[1];
writeFileSync(join(dist, 'artifact.html'), head.trim() + '\n' + body.trim() + '\n');

const size = (p) => (statSync(p).size / 1024).toFixed(0) + ' KB';
console.log(`site/dist/index.html ${size(join(dist, 'index.html'))} · artifact.html ${size(join(dist, 'artifact.html'))} · ${rules.length} règles (${rules.filter((r) => r.mechanical).length} mécaniques) · ${anatomy.length} nœuds · ${harnesses.list.length} harnesses`);
