#!/usr/bin/env node
// build.mjs — assemble the course into ONE self-contained HTML file.
//   node site/build.mjs        -> site/dist/index.html (full document) + site/dist/artifact.html (body-only variant)
// Data shown on the site (the reference skill, its measured scores, harnesses, triggers, the package's rules) is READ
// from the repository itself, so the course cannot drift from what it teaches. Dates come from the data too (never from
// the clock), so the same inputs always give the same page. The build fails on a broken in-page link (see checkAnchors).

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const src = join(here, 'src');
const dist = join(here, 'dist');
const skill = join(repo, 'skills', 'angular-review');                       // the package (bonus)
const course = join(repo, 'course', 'revue-angular', 'etape-5', 'revue-angular'); // the skill learners build
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

// ── Data: anatomy of the reference skill (step 5), with real excerpts ─────
const excerpt = (p, from = 1, to = 18) => read(join(course, p)).split('\n').slice(from - 1, to).join('\n');
const lineCount = (p) => read(join(course, p)).split('\n').length;
const refLines = readdirSync(join(course, 'references')).reduce((n, f) => n + lineCount(join('references', f)), 0);
const anatomy = [
  { path: 'revue-angular/', name: 'revue-angular/', depth: 0, dir: true, level: 0, role: "Le skill, c'est ce dossier. Son nom est identique au champ <code>name</code> du frontmatter. On le commite dans <code>.agents/skills/</code> et <code>.claude/skills/</code> : rien d'autre à installer." },
  { path: 'revue-angular/SKILL.md', name: 'SKILL.md', depth: 1, level: 1, role: "Le seul fichier obligatoire. Le <b>frontmatter</b> (name + description, environ {{TAILLE:n1}} tokens) est chargé dans <b>toutes</b> les sessions : niveau 1. Le <b>corps</b>, la procédure en 7 étapes, n'arrive que quand la description correspond à la demande : niveau 2.", excerpt: excerpt('SKILL.md', 1, 18) },
  { path: 'revue-angular/references/', name: 'references/', depth: 1, dir: true, level: 3, role: `Les règles de l'équipe, un fichier par domaine (${refLines} lignes au total). Le <code>SKILL.md</code> dit quand charger chacun : un diff sans template ne charge pas l'accessibilité. Niveau 3.` },
  { path: 'revue-angular/references/angular-22.md', name: 'angular-22.md', depth: 2, level: 3, role: "Composants, templates, routes, formulaires, à jour d'Angular 22 : OnPush par défaut, <code>Eager</code>, control flow, <code>input()</code>, <code>inject()</code>.", excerpt: excerpt('references/angular-22.md', 1, 14) },
  { path: 'revue-angular/references/reactivite.md', name: 'reactivite.md', depth: 2, level: 3, role: "Signals, RxJS et zoneless : les bugs les plus fréquents depuis l'arrivée des signals (NG0203, mutation en place, effect qui dérive un état).", excerpt: excerpt('references/reactivite.md', 1, 12) },
  { path: 'revue-angular/references/…', name: '… securite.md, accessibilite.md, tests.md', depth: 2, level: 3, role: "Même format partout : un identifiant, une gravité, <b>Pourquoi</b>, <b>À repérer</b>, <b>Correction</b>. Les identifiants sont ceux que cite le rapport et que reprend le script." },
  { path: 'revue-angular/scripts/', name: 'scripts/', depth: 1, dir: true, level: 'x', role: "Ce qui doit être <b>exact</b> est du code, pas de la prose. Les scripts sont <b>exécutés</b> : seule leur sortie entre dans le contexte. Node 18 ou plus, zéro dépendance." },
  { path: 'revue-angular/scripts/perimetre.mjs', name: 'perimetre.mjs', depth: 2, level: 'x', role: "Lit <code>git diff --unified=0</code> et écrit <code>.review/perimetre.json</code> : chaque fichier modifié et ses lignes ajoutées ou modifiées, sans les dossiers d'outillage.", excerpt: excerpt('scripts/perimetre.mjs', 1, 12) },
  { path: 'revue-angular/scripts/verifs.mjs', name: 'verifs.mjs', depth: 2, level: 'x', role: "Une table de motifs passée sur les lignes du périmètre : des <b>pistes</b> en moins d'une seconde, sans modèle. En CI, la même commande ferme la porte sur un BLOCKER et annote la PR.", excerpt: excerpt('scripts/verifs.mjs', 14, 30) },
  { path: 'revue-angular/assets/', name: 'assets/', depth: 1, dir: true, level: 3, role: "Ce qui sert à <b>produire</b> la sortie : le gabarit du rapport, et les exemples (bons findings, pièges à écarter)." },
  { path: 'revue-angular/assets/rapport.md', name: 'rapport.md', depth: 2, level: 3, role: "Le gabarit de <code>.review/REVIEW.md</code> : verdict, compteurs, un bloc par finding, et les écartés à la vérification.", excerpt: excerpt('assets/rapport.md', 1, 14) },
  { path: 'revue-angular/assets/exemples.md', name: 'exemples.md', depth: 2, level: 3, role: "Deux findings modèles inventés hors du lab, et les pièges que l'équipe a déjà vus. Quand la review se trompe, on ajoute le cas ici.", excerpt: excerpt('assets/exemples.md', 22, 32) },
  { path: 'revue-angular/evals/', name: 'evals/', depth: 1, dir: true, level: 0, role: "Les tests du skill : demandes qui doivent (ou ne doivent pas) le déclencher, et comment noter une review. La procédure ne les charge jamais." },
  { path: 'revue-angular/evals/declenchement.json', name: 'declenchement.json', depth: 2, level: 0, role: "10 demandes qui doivent déclencher le skill, 10 quasi-positifs qui ne doivent pas.", excerpt: excerpt('evals/declenchement.json', 1, 9) },
  { path: 'revue-angular/agents/openai.yaml', name: 'agents/openai.yaml', depth: 1, level: 0, role: "Métadonnées d'affichage propres à Codex. Les autres harnesses l'ignorent : c'est une <b>extension</b>, rangée hors du <code>SKILL.md</code> pour qu'il reste standard.", excerpt: read(join(course, 'agents', 'openai.yaml')) },
];

// ── Data: measured scores of the reference skill ─────────────────────────
const results = json(join(repo, 'course', 'resultats.json'));
const harnesses = json(join(repo, 'kit', 'harnesses.json'));

// ── Dates: from the data, written in French in prose ("9 octobre 2026"), never from the clock ──
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const parseDate = (text, where) => {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text).trim());
  const fr = /^(\d{1,2})(?:er)?\s+(\p{L}+)\s+(\d{4})$/u.exec(String(text).trim());
  const [y, m, d] = iso ? [+iso[1], +iso[2] - 1, +iso[3]] : fr ? [+fr[3], MONTHS.indexOf(fr[2].toLowerCase()), +fr[1]] : [NaN, -1, NaN];
  const date = new Date(Date.UTC(y, m, d));
  if (m < 0 || date.getUTCMonth() !== m || date.getUTCDate() !== d) throw new Error(`${where} : date illisible « ${text} » (attendu 2026-10-08 ou « 8 octobre 2026 »)`);
  return date;
};
const frDate = (date) => `${date.getUTCDate() === 1 ? '1er' : date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
const harnessDate = parseDate(harnesses.checked, 'kit/harnesses.json « checked »');
const resultsDate = parseDate(results.date, 'course/resultats.json « date »');
const latestDate = new Date(Math.max(harnessDate, resultsDate));  // every other "à jour au" stamp

const STEPS = [
  { n: '0', what: 'Le squelette : dix lignes' },
  { n: '1', what: 'La procédure et le gabarit' },
  { n: '2', what: "Les règles de l'équipe" },
  { n: '3', what: 'Les scripts' },
  { n: '4', what: 'Exemples et vérification' },
];
const fr = (v) => String(v).replace('.', ',');
const bar = (v, cls) => (v == null ? '<td>—</td>' : `<td><span class="bar ${cls}"><i style="width:${v}%"></i><b>${v} %</b></span></td>`);
const progression = `<div class="table-wrap scoreboard"><table>
  <caption>Mesuré le ${frDate(resultsDate)} sur la PR du lab, avec ${results.modeles.opus.harness}. Une ligne = un run par modèle.</caption>
  <thead><tr><th scope="col">Étape</th><th scope="col">Rappel · Opus 5.5</th><th scope="col">Rappel · Haiku 5.5</th><th scope="col">Précision O / H</th><th scope="col">Leurres O / H</th><th scope="col">Tours O / H</th><th scope="col">Coût Opus</th></tr></thead>
  <tbody>
${STEPS.map(({ n, what }) => {
  const o = results.runs.opus[n] ?? {};
  const h = results.runs.haiku[n] ?? {};
  return `    <tr><th scope="row"><span class="mono">v${n}</span> · ${what}</th>${bar(o.rappel, 'o')}${bar(h.rappel, 'h')}<td>${o.precision ?? '—'} / ${h.precision ?? '—'} %</td><td>${o.leurres ?? '—'} / ${h.leurres ?? '—'}</td><td>${o.tours ?? '—'} / ${h.tours ?? '—'}</td><td>${o.cout == null ? '—' : fr(o.cout) + ' $'}</td></tr>`;
}).join('\n')}
    <tr class="ref"><th scope="row">Le package de Princy <span class="small muted">(bonus)</span></th>${bar(results.package.claude.rappel, 'o')}<td>—</td><td>${results.package.claude.precision} % · Codex ${results.package.codex.rappel} %</td><td>${results.package.claude.leurres}</td><td>${results.package.claude.tours}</td><td>${fr(results.package.claude.cout)} $</td></tr>
  </tbody></table></div>
<p class="small muted">${results.methode} Haiku 5.5 à l'étape 0 n'a pas écrit de rapport : sa réponse dans le chat a été notée. Coûts Haiku non affichés : Claude Code ne connaissait pas encore son tarif sur ce poste. Les rapports bruts sont dans <code>docs/sample-review/formation/</code>.</p>`;
const duree = (s) => (s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`);
const format = (run, key, where) => {
  const value = key === 'duree' ? run?.secondes : run?.[key];
  if (value == null) throw new Error(`resultats.json : pas de valeur ${where}/${key}`);
  return key === 'duree' ? duree(value) : key === 'cout' ? fr(value) : String(value);
};
const metric = (model, step, key) => format(results.runs[model]?.[step], key, `${model}/${step}`);

// ── The real run of the module 3 chain (course/resultats-chaine.json, collected from the run logs; artefacts in docs/sample-review/formation/chaine/) ──
// {{CH:commits}}, {{CH:tests_apres.verts}}, {{CH:etapes.corrige.cout}} … ; dates, costs and durations are formatted like the rest.
const chaine = json(join(repo, 'course', 'resultats-chaine.json'));
const declenchement = json(join(repo, 'course', 'resultats-declenchement.json'));
// A value from a results file by dotted path; dates, costs, durations and lists are formatted like the rest of the page.
const resultValue = (data, file, path) => {
  const value = path.split('.').reduce((o, k) => o?.[k], data);
  if (Array.isArray(value)) return value.map((v) => `« ${v} »`).join(', ');
  if (value == null || typeof value === 'object') throw new Error(`${file} : pas de valeur simple pour ${path}`);
  if (path.endsWith('date')) return frDate(parseDate(value, `${file} « ${path} »`));
  if (/cout/.test(path)) return `${fr(value)} $`;
  if (/duree/.test(path)) return duree(value);
  // Text written by an agent: escape it, and turn its `code` spans into <code>.
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/`([^`]+)`/g, '<code>$1</code>');
};

// ── Data: harnesses & triggers ────────────────────────────────────────────
const cases = json(join(course, 'evals', 'declenchement.json'));
const triggers = { skill: cases.skill, should_trigger: cases.doit_declencher, should_not_trigger: cases.ne_doit_pas_declencher };
// Lab PR: the key lists 27 problems to find (mustFind: true), optional findings the score ignores (mustFind: false) and the decoys.
const key = json(join(repo, 'evals', 'angular-review', 'playground-key.json'));
const labIssues = key.issues.filter((i) => i.mustFind === true).length;
const labDecoys = key.decoys.length;
// The score of every run is out of the same number of problems as the key: a stale key or a stale run fails the build.
const allRuns = [
  ...Object.entries(results.runs).flatMap(([m, steps]) => Object.entries(steps).map(([step, r]) => [`runs/${m}/${step}`, r])),
  ...Object.entries(results.repetitions ?? {}).flatMap(([m, steps]) => Object.entries(steps).map(([step, r]) => [`repetitions/${m}/${step}`, r])),
  ...Object.entries(results.package ?? {}).map(([h, r]) => [`package/${h}`, r]),
];
for (const [where, r] of allRuns) {
  if (r.attendus !== labIssues) throw new Error(`resultats.json : ${where} attend ${r.attendus} problèmes, le corrigé (playground-key.json, mustFind) en compte ${labIssues}`);
}

// ── Harness status: « Mesuré » when resultats.json holds runs of that harness, « Documenté » otherwise ──
// A model entry of results.modeles belongs to a harness when its `harness` string starts with the harness id
// ("Claude Code 2.1.289" -> claude, "Codex CLI 0.149.1" -> codex); results.package is keyed by harness id.
for (const h of harnesses.list) {
  const models = Object.entries(results.modeles).filter(([, m]) => m.harness.toLowerCase().startsWith(h.id));
  const runs = models.reduce((n, [model]) => n + Object.keys(results.runs[model] ?? {}).length + Object.keys(results.repetitions?.[model] ?? {}).length, 0)
    + (results.package?.[h.id] ? 1 : 0);
  const versions = [...new Set(models.map(([, m]) => m.harness))].join(', ');
  // `short` goes next to the badge in the overview table, `detail` in the harness pane.
  h.status = runs > 0 ? { key: 'mesure', label: 'Mesuré', short: `${runs} run${runs > 1 ? 's' : ''}`, detail: `${runs} run${runs > 1 ? 's' : ''} · ${versions}` }
    : /code source/i.test(h.note ?? '') ? { key: 'documente', label: 'Documenté', short: 'lu dans le code source', detail: `lu dans le code source de ${h.name}, faute de documentation publiée ; aucun run` }
    : { key: 'documente', label: 'Documenté', short: '', detail: "d'après les sources citées ci-dessous ; aucun run" };
}
const harnessesMeasured = harnesses.list.filter((h) => h.status.key === 'mesure').length;

// ── Sizes of the reference skill (etape 5), measured here so the page never types them by hand ──
// validate.mjs is the single source for N1 and the body's line count; the other levels use the same ratio (3,6 characters per token).
const validated = execFileSync(process.execPath, [join(repo, 'skills', 'skill-smith', 'scripts', 'validate.mjs'), course], { encoding: 'utf8' });
const [, n1Exact, bodyLines] = validated.match(/N1 ≈ (\d+) tokens · corps (\d+) lignes/) ?? [];
if (!n1Exact) throw new Error(`validate.mjs n'a pas donné N1 pour ${course}`);
const tokensOf = (files) => Math.round(files.reduce((sum, f) => sum + read(f).length, 0) / 3.6);
const filesIn = (dir) => readdirSync(join(course, dir)).filter((f) => !f.startsWith('.')).map((f) => join(course, dir, f));
const skillMd = read(join(course, 'SKILL.md'));
const level3 = [...filesIn('references'), ...filesIn('assets')];
const nbsp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const round = (n, step) => nbsp(Math.round(n / step) * step);
const sizes = {
  n1exact: n1Exact, lignes: bodyLines,
  n1: round(Number(n1Exact), 10),
  n2: round(skillMd.slice(skillMd.indexOf('---', 3) + 3).length / 3.6, 100),
  n3: round(tokensOf(level3), 100),
  n3min: round(Math.min(...level3.map((f) => tokensOf([f]))), 100),
  n3max: round(Math.max(...level3.map((f) => tokensOf([f]))), 100),
  exec: round(tokensOf(filesIn('scripts')), 100),
};

// ── Durations: a module lasts the sum of its lessons' minutes (the « N min » of each hunk header) ──
// {{DUREE:m2}} → « ~80 min » ; {{DUREE:m1+m2+m3}} → « ~4 h ». Rounded to 5 min, or to the half hour from 100 min.
const lessonMinutes = (m) => [...read(join(src, 'partials', `${m}.html`)).matchAll(/<div class="hunk">.*?<span>(\d+) min<\/span><\/div>/g)].reduce((sum, x) => sum + Number(x[1]), 0);
const moduleDuree = (mods) => {
  const total = mods.split('+').reduce((sum, m) => sum + lessonMinutes(m), 0);
  if (!total) throw new Error(`{{DUREE:${mods}}} : aucune minute trouvée dans les en-têtes de leçon`);
  if (total < 100) return `~${Math.round(total / 5) * 5} min`;
  const half = Math.round(total / 30) / 2;
  return `~${Math.floor(half)} h${half % 1 ? ' 30' : ''}`;
};

const dataBlock = (id, value) => `<script type="application/json" id="${id}">${JSON.stringify(value).replace(/</g, '\\u003c')}</script>`;
// The matrix says when the harnesses were checked: that date is harnesses.json « checked », whichever placeholder the partial uses.
html = html.replace(/(état vérifié au\s+)\{\{BUILD_DATE\}\}/g, '$1{{HARNESS_DATE}}');
// Function replacers: a string replacement would interpret "$$", "$&"… inside the injected code.
html = html
  .replace('<!-- @data -->', () => [dataBlock('data-rules', rules), dataBlock('data-anatomy', anatomy), dataBlock('data-harnesses', harnesses), dataBlock('data-triggers', triggers), dataBlock('data-results', results)].join('\n'))
  .replace('/* @styles */', () => read(join(src, 'styles.css')))
  .replace('/* @script */', () => read(join(src, 'app.js')))
  .replaceAll('{{RULES_TOTAL}}', String(rules.length))
  .replaceAll('{{RULES_MECH}}', String(rules.filter((r) => r.mechanical).length))
  .replaceAll('{{BUILD_DATE}}', frDate(latestDate))          // "à jour au": the most recent of harnesses.json « checked » and resultats.json « date »
  .replaceAll('{{HARNESS_DATE}}', frDate(harnessDate))       // harnesses.json « checked »
  .replaceAll('{{RESULTS_DATE}}', frDate(resultsDate))       // resultats.json « date »
  .replaceAll('{{LAB_ISSUES}}', String(labIssues))           // key issues with mustFind: true
  .replaceAll('{{LAB_DECOYS}}', String(labDecoys))           // key decoys
  .replaceAll('{{HARNESS_TOTAL}}', String(harnesses.list.length))
  .replaceAll('{{HARNESS_MEASURED}}', String(harnessesMeasured))
  .replaceAll('{{PROGRESSION}}', () => progression)
  .replaceAll('{{CODEX_MODEL}}', results.modeles.codex.id)
  .replace(/\{\{DUREE:([\w+]+)\}\}/g, (_, mods) => moduleDuree(mods))
  .replace(/\{\{CH:([\w.]+)\}\}/g, (_, path) => resultValue(chaine, 'resultats-chaine.json', path))
  .replace(/\{\{DECL:([\w.]+)\}\}/g, (_, path) => resultValue(declenchement, 'resultats-declenchement.json', path))
  .replace(/\{\{TAILLE:(\w+)\}\}/g, (_, k) => { if (!(k in sizes)) throw new Error(`{{TAILLE:${k}}} inconnu`); return sizes[k]; })
  .replace(/\{\{R:(\w+):(\w+):(\w+)\}\}/g, (_, model, step, key) => metric(model, step, key))
  .replace(/\{\{PKG:(\w+):(\w+)\}\}/g, (_, harness, key) => format(results.package[harness], key, `package/${harness}`))
  .replace(/\{\{REP:(\w+):(\w+):(\w+)\}\}/g, (_, model, step, key) => format(results.repetitions[model]?.[step], key, `repetitions/${model}/${step}`));

const left = html.match(/\{\{[A-Za-z_:0-9]+\}\}/g);
if (left) throw new Error(`placeholders non remplacés : ${[...new Set(left)].join(', ')}`);

// ── Check: every in-page link (<a href="#x">) lands on an element inside a view ──
// The router shows the view that contains the target, so a link to a missing id, or to an id outside every
// <… class="view"> (apart from the skip-link target), would silently land on the wrong page.
const SKIP_LINK_TARGETS = new Set(['main']);
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
function checkAnchors(page) {
  const text = page.replace(/<!--[\s\S]*?-->|<(script|style)\b[\s\S]*?<\/\1\s*>/gi, ''); // inline JS/CSS and comments are not markup
  const attrOf = (attrs, name) => { const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(attrs); return m ? (m[1] ?? m[2]) : null; };
  const owner = new Map();            // id -> id of the view that contains it ('' = outside every view)
  const duplicates = new Set();
  const links = [];
  const open = [];                    // open elements: { tag, view } (view = the element's id when it is a view, else '')
  const TAG = /<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  for (let m; (m = TAG.exec(text));) {
    const [, closing, name, attrs] = m;
    const tag = name.toLowerCase();
    if (closing) { const i = open.findLastIndex((e) => e.tag === tag); if (i >= 0) open.length = i; continue; }
    const id = attrOf(attrs, 'id');
    const isView = Boolean(id) && (attrOf(attrs, 'class') ?? '').split(/\s+/).includes('view');
    const view = isView ? id : (open.findLast((e) => e.view)?.view ?? '');
    if (id) { if (owner.has(id)) duplicates.add(id); else owner.set(id, view); }
    const href = tag === 'a' ? attrOf(attrs, 'href') : null;
    if (href && href.startsWith('#') && href.length > 1) { let target = href.slice(1); try { target = decodeURIComponent(target); } catch { /* keep raw */ } links.push(target); }
    if (!VOID_TAGS.has(tag) && !attrs.trimEnd().endsWith('/')) open.push({ tag, view: isView ? id : '' });
  }
  const missing = [...new Set(links.filter((id) => !owner.has(id)))];
  const outside = [...new Set(links.filter((id) => owner.has(id) && !owner.get(id) && !SKIP_LINK_TARGETS.has(id)))];
  if (missing.length || outside.length) {
    // Point at the source file (partial) and line of each offending link: the page is assembled from several files.
    const files = [join(src, 'index.html'), ...readdirSync(join(src, 'partials')).map((f) => join(src, 'partials', f))];
    const where = (id) => files.flatMap((f) => read(f).split('\n').flatMap((line, i) => (line.includes(`href="#${id}"`) ? [`${f.slice(src.length + 1).replaceAll('\\', '/')}:${i + 1}`] : []))).join(', ');
    throw new Error([
      `liens internes cassés : ${missing.length + outside.length} cible(s) sur ${new Set(links).size} ancres distinctes`,
      ...missing.map((id) => `  #${id} : aucun élément avec cet id (liens : ${where(id) || '?'})`),
      ...outside.map((id) => `  #${id} : l'élément existe mais hors de toute section .view, le routeur ne peut pas l'afficher (liens : ${where(id) || '?'})`),
    ].join('\n'));
  }
  if (duplicates.size) console.warn(`attention : ids en double (le routeur prend le premier) : ${[...duplicates].map((d) => '#' + d).join(', ')}`);
  return new Set(links).size;
}
const anchorsChecked = checkAnchors(html);

writeFileSync(join(dist, 'index.html'), html);

// Artifact variant: the host wraps the page itself, so drop doctype/html/head/body wrappers.
const head = /<head>([\s\S]*?)<\/head>/.exec(html)[1].replace(/<meta charset[^>]*>\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '');
const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)[1];
writeFileSync(join(dist, 'artifact.html'), head.trim() + '\n' + body.trim() + '\n');

const size = (p) => (statSync(p).size / 1024).toFixed(0) + ' KB';
console.log(`site/dist/index.html ${size(join(dist, 'index.html'))} · artifact.html ${size(join(dist, 'artifact.html'))} · ${rules.length} règles (${rules.filter((r) => r.mechanical).length} mécaniques) · ${anatomy.length} nœuds · ${harnesses.list.length} harnesses (${harnessesMeasured} mesurés) · ${anchorsChecked} ancres internes vérifiées`);
