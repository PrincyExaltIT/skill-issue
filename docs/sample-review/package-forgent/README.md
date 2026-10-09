# Le package installé par forgent, puis lancé de bout en bout

9 octobre 2026. Un clone neuf de `lab/speaker-spotlight` ; `angular-review` 2.1.0 installé avec `npx forgent@1.0.0 add --provider claude --dest .claude/skills angular-review` (et `.agents/skills`) depuis le registre `PrincyExaltIT/agent-skill`, `forgent verify` OK ; puis `claude -p "/angular-review Relis cette branche avant que je la merge sur depart."` (Claude Code 2.1.289, Opus 5.5).

- Rappel 96 % (26/27), BLOCKER 5/5, MAJOR 10/10 ; précision 86 % ; 1 leurre sur 7 (`score.txt`).
- 6 relecteurs lancés en parallèle comme sous-agents, tous sur le modèle de la session : 396 s, 5,35 $. Un sous-agent sur un modèle plus petit réduirait ce coût (leçon 3.9 de la formation).
- `forgent.lock.json` : le registre, la version et la sha256 de chaque fichier installé.
