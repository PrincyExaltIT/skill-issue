#!/usr/bin/env node
// install.mjs — put the kit's skills where each harness looks for them. No transformation: the folder IS the skill.
//
//   node kit/install.mjs --target ../my-angular-app                 project scope, every harness in kit/harnesses.json
//   node kit/install.mjs --target . --harness claude,codex          only some harnesses (ids from harnesses.json)
//   node kit/install.mjs --scope user --skills angular-review       user scope (your home folder)
//   node kit/install.mjs --mode link                                symlinks instead of copies (developing the skills)
//   node kit/install.mjs --dry-run                                  print the plan, write nothing
//   node kit/install.mjs --list                                     list harnesses and their folders
//
// Several harnesses share the same folder (.agents/skills): each destination is written once.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, lstatSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const args = parseArgs(process.argv.slice(2));
const config = JSON.parse(readFileSync(join(here, 'harnesses.json'), 'utf8'));

if (args.list) {
  for (const h of config.list) console.log(`${h.id.padEnd(10)} ${h.name.padEnd(16)} projet: ${(h.project ?? []).join(', ') || '—'} | utilisateur: ${(h.user ?? []).join(', ') || '—'}`);
  process.exit(0);
}

const scope = args.scope === 'user' ? 'user' : 'project';
const target = scope === 'user' ? homedir() : resolve(String(args.target ?? process.cwd()));
const mode = args.mode === 'link' ? 'link' : 'copy';
const wanted = args.harness && args.harness !== true ? new Set(String(args.harness).split(',')) : null;
const allSkills = readdirSync(join(repo, 'skills')).filter((d) => existsSync(join(repo, 'skills', d, 'SKILL.md')));
const skills = args.skills && args.skills !== true ? String(args.skills).split(',') : allSkills;

for (const s of skills) if (!allSkills.includes(s)) fail(`Skill inconnu : ${s} (disponibles : ${allSkills.join(', ')})`);
if (scope === 'project' && !existsSync(target)) fail(`Dossier cible introuvable : ${target}`);

// Destination folders, deduplicated (".agents/skills" serves several harnesses).
const destinations = new Map();
for (const h of config.list) {
  if (wanted && !wanted.has(h.id)) continue;
  const dirs = (scope === 'user' ? h.userInstall : h.projectInstall) ?? [];
  for (const d of dirs) {
    const abs = resolve(target, d.replace(/^~[\\/]/, ''));
    if (!destinations.has(abs)) destinations.set(abs, []);
    destinations.get(abs).push(h.name);
  }
}
if (destinations.size === 0) fail('Aucune destination : vérifier --harness (voir --list).');

console.log(`Installation ${mode === 'link' ? 'en liens' : 'par copie'} · portée ${scope} · cible ${target}`);
for (const [dir, harnesses] of destinations) {
  console.log(`\n${(relative(target, dir) || dir).replace(/\\/g, '/')}  ← ${harnesses.join(', ')}`);
  for (const s of skills) {
    const from = join(repo, 'skills', s);
    const to = join(dir, s);
    console.log(`  ${args['dry-run'] ? '[dry-run] ' : ''}${s}`);
    if (args['dry-run']) continue;
    mkdirSync(dir, { recursive: true });
    if (existsSync(to) || isLink(to)) rmSync(to, { recursive: true, force: true });
    if (mode === 'link') {
      try { symlinkSync(from, to, 'junction'); }
      catch (e) { fail(`Lien impossible (${e.code}). Relancer sans --mode link, ou avec les droits de créer des liens.`); }
    } else {
      cpSync(from, to, { recursive: true, filter: (src) => !/[\\/](node_modules|\.review)([\\/]|$)/.test(src) });
    }
  }
}

if (!args['dry-run']) {
  const validator = join(repo, 'skills', 'skill-smith', 'scripts', 'validate.mjs');
  if (existsSync(validator)) {
    const first = [...destinations.keys()][0];
    try {
      execFileSync(process.execPath, [validator, ...skills.map((s) => join(first, s))], { stdio: 'inherit' });
    } catch { fail('La validation a signalé une erreur (voir ci-dessus).'); }
  }
  console.log(`\n✔ ${skills.length} skill(s) installé(s) dans ${destinations.size} dossier(s).`);
  if (scope === 'project') console.log('  Pense à ajouter ".review/" au .gitignore du projet, et à commiter les dossiers de skills pour toute l\'équipe.');
}

function isLink(p) { try { return lstatSync(p).isSymbolicLink(); } catch { return false; } }
function parseArgs(argv) {
  const res = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) res[argv[i].slice(2)] = true;
    else { res[argv[i].slice(2)] = next; i++; }
  }
  return res;
}
function fail(msg) { console.error(`✖ ${msg}`); process.exit(2); }
