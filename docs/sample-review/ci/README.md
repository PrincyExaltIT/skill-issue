# Les runs de CI cités par le cours

Relevés le 10 octobre 2026 dans les journaux des runs (GitHub Actions et GitLab CI), sur le dépôt de démo `PrincyExaltIT/skill-issue-playground`. Chaque ligne citée ici est copiée du journal.

## La porte sans IA du skill de la formation (`revue-angular`, bonus cloud)

| Run | Où | Résultat |
|---|---|---|
| [PR #4](https://github.com/PrincyExaltIT/skill-issue-playground/pull/4), [run 37924206833](https://github.com/PrincyExaltIT/skill-issue-playground/actions/runs/37924206833) | GitHub, 9 octobre 2026 | job « Vérifications sans IA » en échec (porte fermée), 6 s |
| [MR !1](https://gitlab.com/PrincyExaltIT/skill-issue-playground/-/merge_requests/1), [pipeline 2932225964](https://gitlab.com/PrincyExaltIT/skill-issue-playground/-/pipelines/2932225964) | gitlab.com, 9 octobre 2026 | job `revue-angular:verifs` en échec (porte fermée), 24 s |

Les deux journaux donnent les mêmes lignes :

```
src/app/speakers/speaker-spotlight.html:22 [A11Y-02] BLOCKER — Clic sur un élément non interactif : ni focus ni clavier. …
src/app/speakers/speaker-spotlight.ts:34 [SEC-01] BLOCKER — Sanitizer contourné : du HTML, une URL ou un style arrive dans la page sans nettoyage.
src/app/talks/talk-card.ts:28 [SIG-01] BLOCKER — Signal testé sans être appelé : la condition lit la fonction, jamais sa valeur.
3 piste(s) BLOCKER ou plus grave, sur 27 → .review/verifs.json
Porte fermée : au moins une piste BLOCKER ou plus grave.
```

Le script lui-même tourne en moins d'une seconde : sur GitHub, 0,12 s entre la commande et sa dernière ligne (11:31:04.27 → 11:31:04.39) ; sur GitLab, 0,04 s (21:53:17.84 → 21:53:17.88). Les 24 s du job GitLab comptent surtout l'image Docker et le `git fetch`.

Les jobs « Revue IA » de PR #4 passent en 4 à 5 s parce qu'ils s'arrêtent tout de suite : « Pas de secret ANTHROPIC_API_KEY, donc pas de revue IA. Les vérifications sans IA ont tourné. » Le dépôt de démo n'a pas de clé : la revue IA n'a jamais tourné en CI.

## La porte du package (`angular-review`, bonus package)

| Run | Branche | Résultat |
|---|---|---|
| [PR #1](https://github.com/PrincyExaltIT/skill-issue-playground/pull/1), [run 37750086286](https://github.com/PrincyExaltIT/skill-issue-playground/actions/runs/37750086286) | `feat/speaker-spotlight` | « Scan déterministe (sans IA) » en échec |
| [PR #2](https://github.com/PrincyExaltIT/skill-issue-playground/pull/2), [run 37750092179](https://github.com/PrincyExaltIT/skill-issue-playground/actions/runs/37750092179) | `solution/review-fix` (après review-fix) | « Scan déterministe (sans IA) » au vert |

```
PR #1 : [scan] 44 candidat(s) — BLOCKER:8 MAJOR:11 MINOR:22 INFO:3 — .review/scan.json
PR #1 : [scan] Seuil --fail-on BLOCKER atteint (confiance ≥ high).
PR #2 : [scan] 21 candidat(s) — BLOCKER:0 MAJOR:0 MINOR:18 INFO:3 — .review/scan.json
```

Sur PR #1, un seul des 8 BLOCKER est de confiance haute : R-SIG-010 (`talk-card.ts:28`). Les sept autres sont en confiance moyenne ou basse (R-A11Y-013, R-ARCH-017 ×3, R-A11Y-005, R-SIG-005, R-SEC-003), d'après `scan.mjs` relancé sur la branche le 10 octobre.

Les annotations des runs du 8 octobre portaient aussi deux avertissements de GitHub : « Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24 » et « CodeQL Action v3 will be deprecated in December 2026 ».
