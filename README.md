# Skill Issue

> Ton agent sait coder. Il ne sait pas comment **ton équipe** relit.

Formation en trois modules et deux bonus : **construire son propre skill de code review** (cas Angular 22), le mesurer sur une vraie pull request, et le partager à toute l'équipe, quel que soit son outil. Bonus : le faire tourner dans le cloud, puis prendre le package prêt à l'emploi de Princy.

- **La formation** : `site/dist/index.html` (un seul fichier, à ouvrir dans un navigateur), avec ses vidéos dans `site/dist/media/`.
- **Le terrain** : [PrincyExaltIT/skill-issue-playground](https://github.com/PrincyExaltIT/skill-issue-playground), une app Angular 22 et une pull request écrite trop vite (`lab/speaker-spotlight`, à relire depuis `depart`).
- **Le skill de référence** : `course/revue-angular/etape-0` à `etape-5`, le même skill aux six étapes de la formation, avec un script de rattrapage ; `course/chaine/` pour les deux skills de la chaîne (atelier 6), dont le run réel est dans `course/resultats-chaine.json`.
- **Le package** (bonus final) : `skills/` et `kit/`, quatre skills au standard [agentskills.io](https://agentskills.io), un installeur pour les harnesses de la matrice (huit à ce jour), la CI GitHub et GitLab.

## Le parcours

| | Titre | Ce que tu fais |
|---|---|---|
| Module 1 | Ouvre le capot | Bases agentiques, anatomie d'un skill, chargement progressif ; atelier 0 : ton skill en dix lignes, noté |
| Module 2 | Construis-le, mesure-le | Procédure, règles de l'équipe, scripts, exemples, tests, partage : un atelier par étape |
| Module 3 | Le flux d'équipe | Passage de relais, sous-agents, hook, sécurité des skills tiers, faire vivre le skill |
| Bonus +1 | Il relit pendant que tu dors | Le même skill en CI GitHub et GitLab, chez les relecteurs hébergés, dans les agents cloud |
| Bonus +2 | Le package de Princy | Prêt à installer : environ 140 règles, sept relecteurs, une chaîne complète, comparé à ton skill |

## Ce que le skill change, mesuré

Le skill de référence lancé à chaque étape sur la PR du lab, le 9 octobre 2026, noté par emplacement contre le corrigé (27 problèmes à trouver, 7 leurres) :

| Étape | Opus 5.5 | Haiku 5.5 |
|---|---|---|
| v0 · dix lignes | 74 % | 22 % |
| v1 · procédure | 74 % | 59 % |
| v2 · règles de l'équipe | 100 % | 96 % |
| v3 · scripts | 100 % | 96 % |
| v4 · exemples et vérification | 96 % | 93 % |

Même dossier lancé avec Codex (gpt-5.6-sol) : 93 %. Le détail (précision, leurres, tours, coût) et les rapports bruts : [`course/resultats.json`](course/resultats.json), [`docs/sample-review/formation/`](docs/sample-review/formation/).

## Démarrer la formation

```bash
git clone https://github.com/PrincyExaltIT/skill-issue-playground.git
git clone https://github.com/PrincyExaltIT/skill-issue.git
cd skill-issue-playground
git checkout depart                 # la base de la PR, en local
git checkout lab/speaker-spotlight
npm install
```

Prérequis : Git, Node.js 24.15 ou plus, ou 22.22.3 ou plus (la CLI Angular 22.2 refuse de démarrer en dessous) et un harness au choix. Si un clone répond « not found », le dépôt n'est pas encore ouvert à ton compte : demande un accès en lecture à PrincyExaltIT.

Noter une review : `node ../skill-issue/evals/angular-review/score.mjs --report .review/REVIEW.md`.
Rattraper une étape : `node ../skill-issue/course/rattrapage.mjs <0-5 | chaine> [--harness claude|codex|tous]` (`chaine` pose les deux skills de l'atelier 6).

## Installer le package (bonus)

```bash
node kit/install.mjs --target ../mon-app-angular                                   # pour tous les harnesses de la matrice
node kit/install.mjs --target ../mon-app-angular --harness claude,codex --mode link
node kit/install.mjs --list                                                         # où chaque harness cherche ses skills
```

Ou avec l'installeur communautaire : `npx skills add PrincyExaltIT/skill-issue`.

| Skill | Rôle |
|---|---|
| [`angular-review`](skills/angular-review/SKILL.md) | Review d'un diff Angular 17 → 22 : scripts pour le périmètre, le scan et le verdict ; sept relecteurs pour le jugement |
| [`review-fix`](skills/review-fix/SKILL.md) | Corrige les findings un par un, build et test après chacun |
| [`pr-handoff`](skills/pr-handoff/SKILL.md) | Description de PR/MR et note de passation (invocation manuelle) |
| [`skill-smith`](skills/skill-smith/SKILL.md) | Crée, valide et installe un nouveau skill |

## CI

- **Ton skill** : [`course/ci/github/revue-angular.yml`](course/ci/github/revue-angular.yml) et [`course/ci/gitlab/revue-angular.gitlab-ci.yml`](course/ci/gitlab/revue-angular.gitlab-ci.yml). Vérifications sans IA (porte sur les BLOCKER, annotations), puis revue IA si `ANTHROPIC_API_KEY` existe. Démo : la PR #4 du dépôt de démo.
- **Le package** : [`kit/ci/github/angular-review.yml`](kit/ci/github/angular-review.yml) (variante Codex : [`angular-review-codex.yml`](kit/ci/github/angular-review-codex.yml)) et [`kit/ci/gitlab/angular-review.gitlab-ci.yml`](kit/ci/gitlab/angular-review.gitlab-ci.yml).
- Miroir GitLab des deux dépôts : `glab auth login`, puis `bash kit/gitlab-mirror.sh <groupe-ou-utilisateur>` depuis la racine de chaque dépôt.
- Dépannage : sur un fork, les workflows sont désactivés tant qu'on ne les active pas dans l'onglet Actions. Sur un dépôt neuf, les premières PR peuvent ne créer aucun run avant le premier workflow déclenché par un push ; fermer et rouvrir la PR suffit ensuite.

## Développer

```bash
npm test               # valide les skills (package et étapes du cours) + snapshots du scan
npm run build:site     # régénère site/dist/index.html depuis les sources et course/resultats.json
npm run render:videos  # re-rend les vidéos (Python + Playwright + ffmpeg)
```

## Structure

```
course/          le skill de référence étape par étape, le rattrapage, la CI du bonus cloud, les résultats mesurés
evals/           corrigé de la PR du lab, score.mjs, déclenchement, fixtures et snapshots du package
skills/          le package : les 4 skills (le dossier EST le skill)
kit/             installeur, harnesses.json, CI GitHub/GitLab du package, hook, gabarits
site/            la formation (sources + build → dist/index.html)
studio/          les vidéos (scènes HTML rendues image par image)
docs/            notes de recherche sourcées, reviews réelles notées
```

## Licence

MIT. Les règles héritées de la v1 du package viennent de [PrincyExaltIT/agent-skill](https://github.com/PrincyExaltIT/agent-skill) (MIT). Le package y est publié (angular-review 2.1, review-fix, pr-handoff, skill-smith) : `npx forgent add --provider agents,claude --project angular-review review-fix pr-handoff skill-smith`, avec [forgent](https://github.com/PrincyExaltIT/forgent) 1.1 ou plus ; la v1 reste sous l'étiquette `angular-review-v1`.
