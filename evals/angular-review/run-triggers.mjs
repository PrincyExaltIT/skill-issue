#!/usr/bin/env node
// Trigger-rate eval (agentskills.io method): replay each prompt of triggers.json in a headless harness
// and check whether the model loads the skill. Each query runs --runs times; it "triggers" when the rate ≥ 0.5.
//
//   node evals/angular-review/run-triggers.mjs --cwd ../skill-issue-playground [--harness claude|codex] [--runs 3] [--model sonnet] [--limit 4] [--only 0,10]
//   your own skill: --cases .claude/skills/revue-angular/evals/declenchement.json --skill revue-angular
//
// Claude Code (default): needs the skill in <cwd>/.claude/skills; stops after 2 turns; "loaded" = the Skill tool was called.
// Codex (--harness codex): needs the skill in <cwd>/.agents/skills; read-only sandbox; "loaded" = a command read
// skills/<skill>/SKILL.md; the run is stopped at that point, or after 4 commands / 120 s without it.
// Other harnesses have no headless JSON output to read: use the manual protocol of lesson 2.6.
// Costs real tokens: start with --limit.

import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i === -1 ? d : argv[i + 1]; };
const cwd = resolve(arg('cwd', '.'));
const runs = Number(arg('runs', 3));
const limit = Number(arg('limit', Infinity));
const model = arg('model', null);
const skill = arg('skill', 'angular-review');
const harness = arg('harness', 'claude');
if (!['claude', 'codex'].includes(harness)) { console.error(`--harness ${harness} : claude ou codex`); process.exit(2); }
const set = JSON.parse(readFileSync(arg('cases') ? resolve(arg('cases')) : join(here, 'triggers.json'), 'utf8'));

// English keys (kit) or French keys (the course skill's evals/declenchement.json).
const cases = [
  ...(set.should_trigger ?? set.doit_declencher).map((q) => ({ q, expected: true })),
  ...(set.should_not_trigger ?? set.ne_doit_pas_declencher).map((q) => ({ q, expected: false })),
].filter((_, i) => !arg('only') || String(arg('only')).split(',').map(Number).includes(i)).slice(0, limit);

// Windows: npm installs codex as a shell/PowerShell shim that spawn() cannot start without a shell (and a shell would
// split the prompt). Run its JavaScript entry with node instead.
const launcher = (bin, args) => {
  if (process.platform !== 'win32' || bin !== 'codex') return [bin, args];
  const root = spawnSync('npm root -g', { encoding: 'utf8', shell: true }).stdout.trim();
  return [process.execPath, [join(root, '@openai', 'codex', 'bin', 'codex.js'), ...args]];
};

// One headless run; resolves to true when the harness loads the skill. No shell: the prompt reaches the CLI as ONE argument.
const runOnce = (q) => new Promise((done) => {
  const codex = harness === 'codex';
  const args = codex
    ? ['exec', '-C', cwd, '-s', 'read-only', '--json', ...(model ? ['-m', model] : []), q]
    : ['-p', q, '--output-format', 'stream-json', '--verbose', '--max-turns', '2', ...(model ? ['--model', model] : [])];
  const child = spawn(...launcher(harness, args), { cwd, stdio: ['ignore', 'pipe', 'ignore'] });
  const skillFile = new RegExp('skills[\\\\/]+' + skill + '[\\\\/]+SKILL\\.md', 'i'); // .agents\skills\x\SKILL.md or .agents/skills/x/SKILL.md
  let used = false, commands = 0, buffer = '', settled = false;
  const finish = () => { if (settled) return; settled = true; clearTimeout(timer); child.kill(); done(used); };
  const timer = setTimeout(finish, 120_000);
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      let e;
      try { e = JSON.parse(line); } catch { continue; }
      if (codex) {
        if (e.type === 'item.started' && e.item?.type === 'command_execution') {
          commands++;
          if (skillFile.test(e.item.command ?? '')) used = true;
          if (used || commands >= 4) return finish();
        }
      } else if (e.type === 'assistant' && (e.message?.content ?? []).some((b) => b.type === 'tool_use' && b.name === 'Skill' && String(b.input?.skill ?? '').endsWith(skill))) {
        used = true;
        return finish();
      }
    }
  });
  child.on('close', finish);
});

let correct = 0;
for (const c of cases) {
  let hits = 0;
  for (let r = 0; r < runs; r++) if (await runOnce(c.q)) hits++;
  const rate = hits / runs;
  const triggered = rate >= 0.5;
  const ok = triggered === c.expected;
  if (ok) correct++;
  console.log(`${ok ? '✔' : '✖'} ${(rate * 100).toFixed(0).padStart(3)} %  ${c.expected ? 'attendu' : 'interdit'}  « ${c.q} »`);
}
console.log(`\n${correct}/${cases.length} correct(s) (${Math.round((correct / cases.length) * 100)} %) avec ${harness}. Cible : ≥ 90 % sur les deux listes.`);
