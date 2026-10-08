# Chaînes de skills, review IA et outils du moment (8 octobre 2026)

Synthèse des recherches qui ont nourri le module 03. Chiffres d'éditeurs non vérifiés de façon indépendante.

## Écoles

- **Matt Pocock** — github.com/mattpocock/skills (MIT). Chaîne : `grill-me` → `to-spec` → `to-tickets` → `implement` (pilote `/tdd`, finit par `/code-review`) ou `implement-spec` (sous-agents par ticket prêt). Renommages : `to-prd` → `to-spec`, `to-issues` → `to-tickets`, `review` → `code-review`, `writing-great-skills` → `writing-for-agents`. Règle de composition : un skill manuel peut appeler des skills automatiques, jamais un autre skill manuel. `code-review` : deux axes Standards / Spec en sous-agents parallèles, jamais fusionnés ; 12 code smells de Fowler comme heuristiques ; on saute ce que l'outillage applique déjà.
- **Jesse Vincent (obra) — Superpowers** : brainstorming → using-git-worktrees → writing-plans → subagent-driven-development → test-driven-development → requesting-code-review → finishing-a-development-branch. Superpowers 5 (09/03/2026) : SDD par défaut, specs et plans dans `docs/superpowers/`, instructions utilisateur et AGENTS.md prioritaires. blog.fsck.com.
- **Spec Kit (GitHub)** : specify → plan → tasks → implement (+ constitution, clarify, checklist, analyze).
- **Compound engineering (Every, Kieran Klaassen)** : plan → work → review → compound ; leçons dans `docs/solutions` et CLAUDE.md.
- **Thariq Shihipar (équipe Claude Code)** : « Lessons from building Claude Code: How we use skills » ; exemple `adversarial-review` ; la section Gotchas est la plus précieuse ; la description est un déclencheur, pas un résumé.
- **Boucle Ralph** → successeurs intégrés : `/goal <condition>` dans Claude Code (hook Stop de session, complémentaire de l'auto mode) et dans Codex CLI.

## Outils (octobre 2026)

- **Claude Code** : auto mode par défaut pour les nouvelles sessions Pro/Max/Team depuis le 14/08/2026 (classifieur par appel d'outil) ; workflows dynamiques (`ultracode`, 16 agents simultanés, 1 000 par exécution, `.claude/workflows/`) ; `/code-review` (low → max, `--fix`, `--comment` GitHub ou GitLab via glab) ; `/code-review ultra` (flotte cloud, chaque finding reproduit) ; Code Review managé sur GitHub (`@claude review`, `REVIEW.md`, Important/Nit/Pre-existing, check neutre) ; routines (cron, API, événements GitHub) ; `/loop` ; `/batch` ; agent teams (expérimental).
- **Codex** : `@codex review` sur GitHub (P0/P1, règles dans `## Code Review Rules` d'AGENTS.md) ; GitLab en bêta ; `codex review --uncommitted|--base|--commit` ; `/goal` ; DevDay 29/09/2026 : environnements cloud réutilisables, vue `/agents`, workflow de review GitHub/GitLab, Codex Security Cloud. Docs déplacées vers learn.chatgpt.com.
- **OpenAI Dots** (29/09/2026, TechCrunch) : agents personnels permanents sur GPT-6 Astra, une machine cloud chacun, lançables depuis Codex ou ChatGPT, joignables depuis Slack et Teams (Pro, Business Premium). Leur usage pour du travail Codex sur les dépôts : NON VÉRIFIÉ.
- **Copilot** : code review agentique (GA 05/03/2026), AGENTS.md (18/06), instructions lues depuis la branche de la PR (17/07), skills `.github/skills` et MCP (GA 29/07), consomme des minutes Actions depuis le 01/06/2026.
- **Cursor Bugbot** : `BUGBOT.md` ; règles apprises ; autofix ; tarif à l'usage depuis juin 2026.
- **Kilo Code** : mode Orchestrator déprécié ; les agents lancent leurs sous-agents.

## CI

- `anthropics/claude-code-action@v1` : `prompt` (texte, `/skill`, `/plugin:skill`), `claude_args`, `anthropic_api_key` ou `claude_code_oauth_token`, `plugins`, `settings`, `trigger_phrase`… Migration depuis `@beta` : `direct_prompt` → `prompt`.
- `openai/codex-action@v1` : `openai-api-key`, `prompt` / `prompt-file`, `codex-args`, `sandbox`, `safety-strategy`… ; sortie `final-message` ; modèle recommandé : job agent en lecture seule + job séparé pour commenter.
- GitLab : Claude Code pour GitLab CI/CD (bêta, maintenu par GitLab, `claude -p`) ; intégration Codex (bêta).

## Pratiques convergentes de review IA

Corrections plutôt que style ; sévérités explicites et publication de ce qui bloque seulement ; vérification avant publication ; bouton de confiance ; nits plafonnés ; reviewer à contexte neuf et axes séparés ; règles courtes et peu nombreuses ; porte non bloquante par défaut ; boucle de retour. Chiffres publiés (Anthropic, Cursor) : uniquement des proxys de précision, aucun benchmark indépendant de rappel.
