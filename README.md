# Skill Issue

> Ton agent sait coder. Il ne sait pas comment **ton équipe** code.

Formation en trois modules et kit prêt à l'emploi : construire un **Agent Skill** complet (scripts, références, evals) à partir d'un cas réel, la review de code Angular, le faire tourner sur huit harnesses, puis le chaîner dans un workflow qui va du diff à la CI.

- **La formation** : `site/dist/index.html` (un seul fichier, à ouvrir dans un navigateur), avec 4 vidéos dans `site/dist/media/`.
- **Le kit** : 4 skills au standard [agentskills.io](https://agentskills.io), un installeur multi-harness, des pipelines GitHub Actions et GitLab CI, un hook Claude Code, des gabarits `AGENTS.md`.
- **La démo** : [PrincyExaltIT/skill-issue-playground](https://github.com/PrincyExaltIT/skill-issue-playground), une app Angular 22 avec une branche `feat/speaker-spotlight` truffée de problèmes à faire trouver au skill.

## Les skills

| Skill | Rôle | Entrée → sortie |
|---|---|---|
| [`angular-review`](skills/angular-review/SKILL.md) | Review d'un diff Angular 17 → 22 : scripts pour le périmètre, le scan et le verdict ; 7 reviewers spécialisés pour le jugement | diff → `.review/REVIEW.md`, `.review/findings.json` |
| [`review-fix`](skills/review-fix/SKILL.md) | Corrige les findings un par un, build et test après chacun | `findings.json` → code corrigé, `.review/FIXES.md` |
| [`pr-handoff`](skills/pr-handoff/SKILL.md) | Description de PR/MR et note de passation, à partir des faits de la branche (invocation manuelle) | branche + review → `PR_BODY.md`, `HANDOFF.md` |
| [`skill-smith`](skills/skill-smith/SKILL.md) | Crée, valide et installe un nouveau skill | besoin → dossier de skill validé |

`angular-review` v2 succède à la v1 de [PrincyExaltIT/agent-skill](https://github.com/PrincyExaltIT/agent-skill) : mêmes identifiants de règles et même logique de verdict, mais un seul dossier portable, des scripts déterministes, la prise en compte de la version d'Angular (OnPush par défaut en v22), deux nouveaux domaines (réactivité, tests) et des evals.

## Résultats réels

La même phrase (« Fais une review de cette branche avant que je la merge sur main ») sur la branche de démo, le 8 octobre 2026, notée contre le corrigé `evals/angular-review/playground-key.json` :

| | Scan seul | Claude Code (Opus 5.5) | Codex (gpt-5.6-sol) |
|---|---|---|---|
| Rappel (27 attendus) | 96 % | 96 % | 100 % |
| Précision | 100 % | 100 % | 100 % |
| Leurres signalés | 0/7 | 0/7 | 0/7 |
| Durée | 90 ms | 4 min 30 | ≈ 12 min |

Rapports complets et transcriptions résumées : [`docs/sample-review/`](docs/sample-review/).

## Installer

```bash
# dans un projet Angular, pour tous les harnesses (portée projet, à commiter)
node kit/install.mjs --target ../mon-app-angular

# seulement certains harnesses, en liens symboliques
node kit/install.mjs --target ../mon-app-angular --harness claude,codex --mode link

# où chaque harness cherche ses skills
node kit/install.mjs --list
```

Ou avec l'installeur communautaire : `npx skills add PrincyExaltIT/skill-issue`.

Ajouter `.review/` au `.gitignore` du projet.

## CI

- GitHub : copier [`kit/ci/github/angular-review.yml`](kit/ci/github/angular-review.yml) dans `.github/workflows/`. Le scan déterministe annote la PR sans IA ni secret et liste tous les candidats dans le résumé du job ; la review complète tourne si le secret `ANTHROPIC_API_KEY` existe.
- GitLab : inclure [`kit/ci/gitlab/angular-review.gitlab-ci.yml`](kit/ci/gitlab/angular-review.gitlab-ci.yml). Rapport Code Quality dans la MR ; note IA si `ANTHROPIC_API_KEY` et `GITLAB_REVIEW_TOKEN` sont définis.
- Miroir GitLab des deux dépôts : `glab auth login`, puis `bash kit/gitlab-mirror.sh <groupe-ou-utilisateur>` depuis la racine de chaque dépôt.
- Variante Codex pour GitHub : [`kit/ci/github/angular-review-codex.yml`](kit/ci/github/angular-review-codex.yml) (job agent en lecture seule, job séparé pour commenter).
- Dépannage : sur un fork, les workflows sont désactivés tant qu'on ne les active pas dans l'onglet Actions. Sur le playground (dépôt neuf), les premières PR n'ont créé aucun run jusqu'au premier run déclenché par un push ; ensuite, fermer et rouvrir la PR a suffi.

## Développer le kit

```bash
npm test               # valide les 4 skills + snapshots du scan (fixtures)
npm run build:site     # régénère site/dist/index.html depuis les fichiers du kit
npm run render:videos  # re-rend les vidéos (Python + Playwright + ffmpeg)
```

Mesurer une review complète sur la démo :

```bash
node evals/angular-review/score.mjs --findings ../skill-issue-playground/.review/findings.json
```

## Structure

```
skills/          les 4 skills (le dossier EST le skill)
kit/             installeur, harnesses.json, CI GitHub/GitLab, hook, gabarits
evals/           fixtures, snapshots, prompts de déclenchement, corrigé de la démo, score
site/            la formation (sources + build → dist/index.html)
studio/          les vidéos (scènes HTML + rendu image par image)
docs/research/   les notes de recherche sourcées qui ont nourri la formation
```

## Licence

MIT. Les règles héritées de la v1 viennent de [PrincyExaltIT/agent-skill](https://github.com/PrincyExaltIT/agent-skill) (MIT).
