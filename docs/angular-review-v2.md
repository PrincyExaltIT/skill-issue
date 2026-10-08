# angular-review 2.0.0 — notes de version

Successeur de `angular-review` 1.x ([PrincyExaltIT/agent-skill](https://github.com/PrincyExaltIT/agent-skill)). Les identifiants de règles, le format des règles, le reviewer de conformité projet, la validation empirique Playwright et la logique du verdict sont conservés.

## Portabilité

- Un seul dossier conforme au standard agentskills.io, lu tel quel par chaque harness. Les points d'entrée par outil (`angular-review.prompt.md`, `angular-review.codex.md`) disparaissent : en 1.x, les installations Copilot et Codex ne recevaient qu'un fichier, sans `ORCHESTRATION.md` ni `references/`.
- `ORCHESTRATION.md` est fondu dans `SKILL.md` (103 lignes) ; l'étape Playwright passe dans `references/EMPIRICAL_VALIDATION.md` (chargée seulement si un serveur MCP Playwright est disponible).
- Les sorties vont dans `.review/` à la racine du projet, plus dans le dossier du skill (qui était partagé entre projets en installation globale).

## Déterminisme

- `scripts/scope.mjs` : périmètre du diff (working tree, `--committed`, `--staged`, `--files`, variables CI GitHub/GitLab) et contexte Angular (version, OnPush par défaut, zoneless, SSR, runner de tests, angular-eslint, fichier de bonnes pratiques officiel).
- `scripts/scan.mjs` : 44 détecteurs pour 41 règles, sur les lignes modifiées ; exports `text`, `json`, `sarif`, `gitlab`, `github` ; porte CI `--fail-on BLOCKER --fail-confidence high`.
- `scripts/findings.mjs` : fusion et dédoublonnage, **vérification de l'extrait cité** (±3 lignes), décisions `keep`/`dismiss`/`decide`, verdict calculé par le code, rendu de `REVIEW.md`, exports CI. Refuse de rendre tant qu'un candidat n'est pas vérifié.

## Versions d'Angular

- `references/VERSION_GATES.md` : ce qui change de la v17 à la v22.
- **R-PERF-020** dépend de la version : MAJOR si OnPush manque en ≤ 21 ; en ≥ 22 (OnPush par défaut), seuls `Eager`/`Default` sont signalés.
- Le fichier de bonnes pratiques livré dans `@angular/core` (≥ 22) prime sur les références du skill ; les règles du projet priment sur tout.

## Règles

- Nouveaux domaines : `REACTIVITY_REVIEW.md` (R-SIG-001…010, R-RX-001…003) et `TESTING_REVIEW.md` (R-TEST-001…007).
- Nouvelles règles : R-ARCH-027…035 (outputs aux noms natifs, control flow, `any`, URL en dur, formulaires typés, guards fonctionnels, `host: {}`, `@Service()`, animations legacy), R-PERF-034…037 (`<img src>`, zoneless, `track $index`, appels avec arguments dans le template), R-A11Y-014 (texte alternatif).
- Format de sortie unique (`references/REVIEWER_PROMPT.md`) ; la section « Format des findings » contradictoire des fichiers de règles est remplacée par un renvoi.
- Alias documentés : R-PERF-033 → R-ARCH-012, R-ERR-009 → R-ARCH-022.
- Sévérités revues : R-ARCH-010 (BLOCKER → MAJOR ; INFO pour `standalone: true` explicite), R-ARCH-022 (MAJOR → MINOR), R-SEC-003 (BLOCKER si la donnée vient d'un utilisateur), R-ARCH-017 (BLOCKER pour une source infinie, MINOR pour HttpClient).
- Corrections factuelles : guards en classe et `@HostListener` ne sont pas dépréciés (suggestion de la forme moderne en nouveau code uniquement) ; fenêtre de support Angular mise à jour (R-SEC-021).

## Tests

- `evals/angular-review/run-scan-tests.mjs` : snapshots du scan sur des fixtures, dont un composant propre qui doit rester à zéro candidat.
- `evals/angular-review/check-catalogue.mjs` : chaque détecteur correspond à une règle de référence et à une sévérité qu'elle autorise.
- `evals/angular-review/triggers.json` : 20 prompts de déclenchement.
- `evals/angular-review/playground-key.json` + `score.mjs` : rappel et précision d'une review complète sur la branche de démo.

## Chaîne

`findings.json` sert de contrat à `review-fix` (corrections une par une) et `pr-handoff` (description de PR/MR, note de passation), et à la CI.
