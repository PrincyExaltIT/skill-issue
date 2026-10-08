# Agent Skills — standard, harnesses, sécurité, évaluation (8 octobre 2026)

Synthèse des recherches qui ont nourri les modules 01 et 02. Chaque ligne renvoie à une source primaire ; « NON VÉRIFIÉ » marque ce qui n'a pas pu être confirmé.

## Chronologie

| Date | Événement | Source |
|---|---|---|
| 16/10/2025 | Lancement chez Anthropic (apps, Claude Code, API, Agent SDK) | claude.com/blog/skills ; anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills |
| déc. 2025 | Codex CLI expérimental (`~/.codex/skills`) ; Amp ; goose 1.16 | simonwillison.net/2025/Dec/12/openai-skills ; ampcode.com/news/agent-skills |
| 18/12/2025 | Standard ouvert agentskills.io ; GitHub Copilot (agent, CLI, VS Code Insiders) | claude.com/blog/organization-skills-and-directory ; github.blog/changelog/2025-12-18-github-copilot-now-supports-agent-skills |
| 22/12/2025 | OpenCode 1.0.186 | github.com/anomalyco/opencode/releases/tag/v1.0.186 |
| janv. 2026 | Gemini CLI 0.24 (stable en 0.27), Cline 3.48, Cursor 2.4 (22/01), `npx skills` + skills.sh (20/01) | changelogs respectifs ; vercel.com/changelog |
| févr. 2026 | Codex lit `.agents/skills` (PR #10317, #10437) ; VS Code 1.109 GA ; audits skills.sh | github.com/openai/codex ; code.visualstudio.com/updates/v1_109 |
| 16/04/2026 | `gh skill` (aperçu) | github.blog/changelog/2026-04-16-manage-agent-skills-with-github-cli |
| 15/05/2026 | Roo Code ferme | github.com/RooCodeInc/Roo-Code (archivé) |
| 02/06/2026 | Windsurf devient Devin Desktop | docs.devin.ai/desktop/changelog |
| 18/06/2026 | Gemini CLI → Antigravity CLI pour les comptes gratuits et AI Pro/Ultra | developers.googleblog.com |
| 29/07/2026 | Copilot code review : skills (`.github/skills`) et MCP en GA | github.blog/changelog/2026-07-29-… |

## Le standard (agentskills.io/specification)

- `name` : 1–64 caractères `a-z0-9-`, sans tiret en bord ni doublé, = nom du dossier. `description` : 1–1 024 caractères, ce que fait le skill **et** quand l'utiliser.
- Optionnels : `license`, `compatibility` (≤ 500), `metadata` (chaînes), `allowed-tools` (expérimental). Pas de champ `version` : `metadata.version`.
- Progressive disclosure : ~100 tokens par skill au démarrage ; corps < 5 000 tokens et < 500 lignes ; ressources à la demande ; références à un niveau ; le code d'un script n'entre jamais dans le contexte, seule sa sortie.
- Surfaces Anthropic : pas de balises XML, ni « anthropic » ni « claude » dans `name` ; upload claude.ai et API : **seuls les 6 champs du standard**, tout autre champ est une erreur.
- `skills-ref validate` refuse les champs hors standard (et accepte des lettres Unicode dans `name`, plus laxiste que le texte).
- Description : troisième personne (Anthropic) vs impératif un peu insistant (agentskills.io) ; accord sur « quoi + quand ».

## Où chaque harness cherche (voir `kit/harnesses.json`)

`.agents/skills` : Codex, Copilot, Cursor, Gemini CLI/Antigravity, OpenCode, Kilo (nouvelle plateforme), Amp, goose, Devin Desktop. **Pas Claude Code** (issue anthropics/claude-code#16345 ouverte), ni Continue, ni Cline, qui lisent `.claude/skills`. Deux dossiers couvrent donc tout.

Extensions notables : Claude Code (`disable-model-invocation`, `user-invocable`, `context: fork`, `agent`, `hooks`, `paths`, `model`, `effort`, `${CLAUDE_SKILL_DIR}`, `` !`cmd` ``, liste plafonnée à 1 % du contexte, description + when_to_use à 1 536 caractères) ; Codex (`agents/openai.yaml` : `interface`, `policy.allow_implicit_invocation`, `dependencies.tools`) ; Cursor (`paths`, `disable-model-invocation`, `icon`, `color`) ; VS Code Copilot (`argument-hint`, `user-invocable`, `disable-model-invocation`, `context: fork`) ; Gemini CLI (consentement à chaque activation) ; OpenCode (`permission.skill`).

## Sécurité

- Snyk « ToxicSkills » (05/02/2026) : 3 984 skills, 36,82 % avec au moins un défaut, 13,4 % critiques, 76 malveillants (91 % avec injection de prompt).
- arXiv 2601.10338 « Agent Skills in the Wild » : 31 132 skills, 26,1 % vulnérables ; exfiltration 13,3 %, escalade de privilèges 11,8 % ; skills avec scripts 2,12× plus exposés.
- Mesures : lire chaque fichier, épingler (sha), séparer auteur et relecteur, `Skill()` deny rules et `disableSkillShellExecution` (Claude Code), consentement (Gemini), `permission.skill: ask` (OpenCode), audits skills.sh, `gh skill install --pin` (provenance, sans vérification du contenu).

## Évaluation

- agentskills.io : `evals/evals.json`, chaque cas avec et sans skill, dans un contexte propre ; `benchmark.json` (moyenne, écart type, delta).
- Taux de déclenchement : ~20 requêtes (8–10 positives, 8–10 quasi-positives), 3 exécutions chacune, seuil 0,5, découpage 60/40, jusqu'à 5 itérations sur la description.
- `skill-creator` (anthropics/skills) : `run_eval.py`, `run_loop.py`, `improve_description.py`…
- `claude plugin eval` (Claude Code ≥ 2.1.269) : graders `regex`, `tool_used`, `tool_order`, `file_exists`, `llm`, `baseline` ; 3 exécutions avec et sans le plugin ; sous Windows natif, Bash demande WSL2.
- `/skill-doctor` : coût en contexte et usage de chaque skill.
