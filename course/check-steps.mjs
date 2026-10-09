#!/usr/bin/env node
// Coherence of the course material: every step is a skill, later steps reuse earlier files unchanged unless the
// course says otherwise, scripts parse and behave as the hook lesson says, the module 3 chain reads the report the
// skill writes, and the measured results cover what the site prints.
//   node course/check-steps.mjs

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const step = (n, ...p) => join(here, 'revue-angular', `etape-${n}`, 'revue-angular', ...p);
const read = (p) => readFileSync(p, 'utf8');
const errors = [];
const same = (a, b, what) => { if (read(a) !== read(b)) errors.push(`${what} diffère entre ${a.split('etape-')[1].slice(0, 1)} et ${b.split('etape-')[1].slice(0, 1)}`); };

for (let n = 0; n <= 5; n++) {
  if (!existsSync(step(n, 'SKILL.md'))) { errors.push(`étape ${n} : SKILL.md absent`); continue; }
  if (!/^name: revue-angular$/m.test(read(step(n, 'SKILL.md')))) errors.push(`étape ${n} : name ≠ revue-angular`);
}
// The rules written at step 2 travel unchanged; the scripts written at step 3 travel unchanged.
for (const f of readdirSync(step(2, 'references'))) for (const n of [3, 4, 5]) same(step(2, 'references', f), step(n, 'references', f), `references/${f}`);
for (const f of readdirSync(step(3, 'scripts'))) {
  try { execFileSync(process.execPath, ['--check', step(3, 'scripts', f)]); } catch { errors.push(`scripts/${f} : syntaxe invalide`); }
  for (const n of [4, 5]) same(step(3, 'scripts', f), step(n, 'scripts', f), `scripts/${f}`);
}
same(step(4, 'assets', 'exemples.md'), step(5, 'assets', 'exemples.md'), 'assets/exemples.md');

// The hook and the CI gate (lesson 3.5): with --echec-sur, verifs.mjs prints only what closes the gate and exits 1;
// without it, every piste. verifs.json always keeps every piste.
const bac = mkdtempSync(join(tmpdir(), 'verifs-'));
try {
  const git = (...a) => execFileSync('git', a, { cwd: bac, stdio: 'pipe' });
  git('init', '-q');
  writeFileSync(join(bac, 'README.md'), 'base\n');
  git('add', 'README.md');
  git('-c', 'user.name=check-steps', '-c', 'user.email=check-steps@example.invalid', 'commit', '-q', '-m', 'base');
  git('branch', 'base-du-test');
  mkdirSync(join(bac, 'src'));
  writeFileSync(join(bac, 'src', 'bio.ts'), 'const html = this.sanitizer.bypassSecurityTrustHtml(bio);\nconsole.log(html);\n');
  const run = (script, ...a) => spawnSync(process.execPath, [step(3, 'scripts', script), ...a], { cwd: bac, encoding: 'utf8' });
  run('perimetre.mjs', '--base', 'base-du-test', '--travail');
  const porte = run('verifs.mjs', '--echec-sur', 'BLOCKER');
  const tout = run('verifs.mjs');
  const json = JSON.parse(read(join(bac, '.review', 'verifs.json')));
  if (porte.status !== 1 || !porte.stdout.includes('[SEC-01]') || porte.stdout.includes('[NG-05]')) errors.push('verifs.mjs --echec-sur BLOCKER : doit afficher SEC-01 seul et sortir en 1');
  if (tout.status !== 0 || !tout.stdout.includes('[NG-05]')) errors.push('verifs.mjs sans seuil : doit afficher toutes les pistes et sortir en 0');
  if (!json.some((p) => p.regle === 'NG-05')) errors.push('verifs.json : doit garder toutes les pistes');
} catch (e) {
  errors.push(`test du hook impossible : ${String(e.message).split('\n')[0]}`);
} finally {
  rmSync(bac, { recursive: true, force: true });
}

// The chain of module 3 (atelier 6): two skills named after their folder, reading the report that revue-angular
// writes from assets/rapport.md. The template must keep the fields they rely on.
for (const nom of ['corrige-review', 'raconte-branche']) {
  const f = join(here, 'chaine', nom, 'SKILL.md');
  if (!existsSync(f)) { errors.push(`chaine/${nom} : SKILL.md absent`); continue; }
  if (!new RegExp(`^name: ${nom}$`, 'm').test(read(f))) errors.push(`chaine/${nom} : name ≠ ${nom}`);
  if (!read(f).includes('.review/REVIEW.md')) errors.push(`chaine/${nom} : ne lit pas .review/REVIEW.md`);
}
const rapport = read(step(5, 'assets', 'rapport.md'));
for (const champ of ['### <GRAVITÉ> · <RÈGLE', '`<chemin/du/fichier.ts:ligne>`', '**Correction**']) {
  if (!rapport.includes(champ)) errors.push(`assets/rapport.md : le contrat de la chaîne attend « ${champ} »`);
}

// What the site prints must exist in the measured results.
const results = JSON.parse(read(join(here, 'resultats.json')));
for (const model of ['opus', 'haiku']) for (let n = 0; n <= 4; n++) {
  const run = results.runs[model]?.[n];
  if (!run || run.rappel == null || run.precision == null || run.leurres == null) errors.push(`resultats.json : ${model}/${n} incomplet`);
}
if (results.runs.codex?.['5']?.rappel == null) errors.push('resultats.json : codex/5 absent');

if (errors.length) {
  for (const e of errors) console.error(`✖ ${e}`);
  process.exit(1);
}
console.log('✔ course : 6 étapes valides, règles et scripts identiques d’une étape à l’autre, porte de verifs.mjs conforme, chaîne en place, résultats complets');
