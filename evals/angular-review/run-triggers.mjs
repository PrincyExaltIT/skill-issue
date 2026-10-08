#!/usr/bin/env node
// Trigger-rate eval (agentskills.io method): replay each prompt of triggers.json in headless Claude Code
// and check whether the model loads the skill. Each query runs --runs times; it "triggers" when the rate ≥ 0.5.
//
//   node evals/angular-review/run-triggers.mjs --cwd ../skill-issue-playground [--runs 3] [--model sonnet] [--limit 4] [--only 0,10]
//
// Needs the skill installed in <cwd>/.claude/skills. Costs real tokens: start with --limit.
// The run stops after the first turns (--max-turns 2): we only look at whether the Skill tool was called.

import { spawnSync } from 'node:child_process';
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
const set = JSON.parse(readFileSync(join(here, 'triggers.json'), 'utf8'));

const cases = [
  ...set.should_trigger.map((q) => ({ q, expected: true })),
  ...set.should_not_trigger.map((q) => ({ q, expected: false })),
].filter((_, i) => !arg('only') || String(arg('only')).split(',').map(Number).includes(i)).slice(0, limit);

let correct = 0;
for (const c of cases) {
  let hits = 0;
  for (let r = 0; r < runs; r++) {
    const res = spawnSync('claude', ['-p', c.q, '--output-format', 'stream-json', '--verbose', '--max-turns', '2', ...(model ? ['--model', model] : [])],
      { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); // no shell: the prompt must reach claude as ONE argument
    const used = (res.stdout ?? '').split('\n').some((line) => {
      try {
        const e = JSON.parse(line);
        return e.type === 'assistant' && (e.message?.content ?? []).some((b) => b.type === 'tool_use' && b.name === 'Skill' && String(b.input?.skill ?? '').endsWith(skill));
      } catch { return false; }
    });
    if (used) hits++;
  }
  const rate = hits / runs;
  const triggered = rate >= 0.5;
  const ok = triggered === c.expected;
  if (ok) correct++;
  console.log(`${ok ? '✔' : '✖'} ${(rate * 100).toFixed(0).padStart(3)} %  ${c.expected ? 'attendu' : 'interdit'}  « ${c.q} »`);
}
console.log(`\n${correct}/${cases.length} correct(s) (${Math.round((correct / cases.length) * 100)} %). Cible : ≥ 90 % sur les deux listes.`);
