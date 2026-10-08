#!/usr/bin/env node
// Claude Code PostToolUse hook: after the agent edits an Angular file, run the deterministic scan on that file.
// High-confidence BLOCKER/MAJOR candidates are sent back to the agent (exit code 2 → stderr goes to the model).
// Wire it with kit/hooks/claude-settings.json. Needs the angular-review skill in .claude/skills or .agents/skills.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, isAbsolute } from 'node:path';

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }
const file = input.tool_input?.file_path ?? input.tool_input?.path;
if (!file || !/\.(ts|html)$/.test(file) || /\.spec\.ts$/.test(file)) process.exit(0);

const root = input.cwd ?? process.cwd();
const scan = ['.claude/skills', '.agents/skills'].map((d) => join(root, d, 'angular-review', 'scripts', 'scan.mjs')).find(existsSync);
if (!scan) process.exit(0);

const rel = (isAbsolute(file) ? relative(root, file) : file).replace(/\\/g, '/');
let report;
try {
  const out = execFileSync(process.execPath, [scan, '--root', root, '--files', rel, '--all', '--format', 'json', '--no-save'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  report = JSON.parse(out);
} catch { process.exit(0); }

const serious = report.candidates.filter((c) => ['BLOCKER', 'MAJOR'].includes(c.severity) && c.evidence.confidence === 'high');
if (serious.length === 0) process.exit(0);
console.error(`angular-review (scan) sur ${rel} :\n` + serious.map((c) => `- ${c.severity} ${c.ruleId} L${c.line} : ${c.title}. ${c.suggestion}`).join('\n'));
process.exit(2);
