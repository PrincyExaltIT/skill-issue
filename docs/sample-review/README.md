# Reviews réelles, notées

## La formation : le skill de référence, étape par étape

Le skill `revue-angular` de chaque étape (`course/revue-angular/etape-N`), lancé sur `lab/speaker-spotlight` le 9 octobre 2026 avec Claude Code (Opus 5.5 et Haiku 5.5) et Codex (gpt-5.6-sol), noté par emplacement (`score.mjs --report`). Rapports bruts : [`formation/`](formation/). Chiffres : [`course/resultats.json`](../../course/resultats.json).

La chaîne du module 3 (`revue-angular` → `corrige-review` → `raconte-branche`), lancée une fois par harness sur la même PR, avec Claude Code et avec Codex : le rapport, les commits et la description de PR sont dans [`formation/chaine/claude/`](formation/chaine/claude/) et [`formation/chaine/codex/`](formation/chaine/codex/) (avec le compte rendu de l'arrêt de Codex), les chiffres dans [`course/resultats-chaine.json`](../../course/resultats-chaine.json). Le test de déclenchement du skill de référence, sous les deux harnesses : [`course/resultats-declenchement.json`](../../course/resultats-declenchement.json).

| Étape | Opus 5.5 | Haiku 5.5 |
|---|---|---|
| v0 · dix lignes | 74 % | 22 % (réponse dans le chat, pas de rapport) |
| v1 · procédure | 74 % | 59 % |
| v2 · règles | 100 % | 96 % |
| v3 · scripts | 100 % | 96 % |
| v4 · exemples et vérification | 96 % (relancé : 96 %) | 93 % (relancé : 96 %) |
| v5 · même dossier avec Codex | 93 % | |

## Le package

La même phrase, le même skill, deux harnesses, le 8 octobre 2026. Scores contre le corrigé `evals/angular-review/playground-key.json`.

| | Scan seul | [Claude Code](claude-code/) | [Codex](codex/) |
|---|---|---|---|
| Rappel (27 attendus) | 96 % | 96 % | 100 % |
| Précision | 100 % | 100 % | 100 % |
| Leurres signalés | 0/7 | 0/7 | 0/7 |
| Findings / écartés | 44 candidats | 28 / 18 | 37 / 18 |
| Verdict | — | REQUEST_CHANGES | REQUEST_CHANGES |

Le scan seul et le corrigé ont été écrits par la même équipe : son rappel est optimiste.

La chaîne complète (review Codex → corrections Claude Code → re-review → description de PR) est dans [`chain/`](chain/).
