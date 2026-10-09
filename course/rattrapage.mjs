#!/usr/bin/env node
// Rattrapage : copie le skill de référence d'une étape dans le dépôt courant, à la place du tien.
//   node ../skill-issue/course/rattrapage.mjs <étape 0-5 | chaine> [--harness claude|codex|tous] [--dry-run]
// 0 à 5  : revue-angular tel qu'il est à la fin de cette étape
// chaine : les deux skills de l'atelier 7, corrige-review et raconte-branche (revue-angular n'est pas touché)
// claude (défaut) : .claude/skills/ (Claude Code, Continue)
// codex           : .agents/skills/ (Codex, Copilot, Cursor, Gemini CLI / Antigravity, OpenCode, Kilo Code)
// tous            : les deux
// Ton dossier actuel est mis de côté dans .review/ancien-skill/<claude|agents>/<skill> avant d'être remplacé.

import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ici = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const quoi = args[0] ?? '';
const harness = args.includes('--harness') ? args[args.indexOf('--harness') + 1] : 'claude';
const essai = args.includes('--dry-run');

const SKILLS = quoi === 'chaine'
  ? ['corrige-review', 'raconte-branche'].map((nom) => ({ nom, source: join(ici, 'chaine', nom) }))
  : [{ nom: 'revue-angular', source: join(ici, 'revue-angular', `etape-${quoi}`, 'revue-angular') }];
if ((quoi !== 'chaine' && !/^[0-5]$/.test(quoi)) || !SKILLS.every((s) => existsSync(s.source))) {
  console.error('Usage : node rattrapage.mjs <étape 0-5 | chaine> [--harness claude|codex|tous] [--dry-run]');
  process.exit(2);
}
const DOSSIERS = { claude: ['.claude/skills'], codex: ['.agents/skills'], tous: ['.claude/skills', '.agents/skills'] };
if (!DOSSIERS[harness]) {
  console.error(`Harness inconnu : ${harness} (claude, codex ou tous).`);
  process.exit(2);
}

let racine;
try {
  racine = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
} catch {
  console.error('Lance cette commande depuis le dépôt de démo (skill-issue-playground).');
  process.exit(2);
}

for (const dossier of DOSSIERS[harness]) {
  for (const { nom, source } of SKILLS) {
    const cible = resolve(racine, dossier, nom);
    console.log(`${essai ? '[essai] ' : ''}${quoi === 'chaine' ? 'chaîne' : `étape ${quoi}`} → ${dossier}/${nom}`);
    if (essai) continue;
    if (existsSync(cible)) {
      const sauvegarde = join(racine, '.review', 'ancien-skill', dossier.split('/')[0].slice(1), nom);
      rmSync(sauvegarde, { recursive: true, force: true });
      mkdirSync(dirname(sauvegarde), { recursive: true });
      renameSync(cible, sauvegarde);
      console.log(`  ton ancienne version est dans ${sauvegarde}`);
    }
    mkdirSync(dirname(cible), { recursive: true });
    cpSync(source, cible, { recursive: true });
  }
}
if (quoi === 'chaine' && !essai && !existsSync(join(racine, '.review', 'REVIEW.md'))) {
  console.log('La chaîne part de .review/REVIEW.md : lance d’abord /revue-angular sur la branche.');
}
