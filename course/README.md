# course/ — le skill de référence, étape par étape

`revue-angular` est le skill que les participants construisent pendant la formation, en six versions (v0 à v5). Chaque dossier `etape-N/revue-angular/` est un skill complet et valide, tel qu'il est à la fin de l'étape N :

| Étape | Ajoute | Leçon |
|---|---|---|
| `etape-0` | `SKILL.md` de dix lignes | 1.9 |
| `etape-1` | Procédure en étapes avec critères de fin, `assets/rapport.md` | 2.2 |
| `etape-2` | `references/` : les règles de l'équipe, un fichier par domaine | 2.3 |
| `etape-3` | `scripts/perimetre.mjs` et `scripts/verifs.mjs` | 2.4 |
| `etape-4` | `assets/exemples.md` et l'étape de vérification | 2.5 |
| `etape-5` | Métadonnées, `evals/`, `agents/openai.yaml` : la version partagée ; puis la section « Garde-fous » et `allowed-tools` | 2.6, 2.7, 3.7 |

`check-steps.mjs` vérifie que les règles de l'étape 2 et les scripts de l'étape 3 passent sans changement aux étapes suivantes.

## La chaîne du module 3

`chaine/` contient les deux skills de l'atelier 7, qui se passent le relais par des fichiers :

| Skill | Lit | Écrit |
|---|---|---|
| `revue-angular` | le diff de la branche | `.review/REVIEW.md` |
| `chaine/corrige-review` (manuel) | `.review/REVIEW.md` | un commit par finding, tests lancés après chacun ; arrêt au premier test rouge |
| `chaine/raconte-branche` | les commits et `.review/REVIEW.md` | `.review/PR.md`, la description de PR |

`corrige-review` porte `disable-model-invocation: true` : le validateur l'accepte avec un avertissement (champ hors standard), et `agents/openai.yaml` fait la même chose pour Codex.

## Rattraper une étape

Depuis le dépôt de démo :

```bash
node ../skill-issue/course/rattrapage.mjs 3                    # .claude/skills/revue-angular (Claude Code, Continue)
node ../skill-issue/course/rattrapage.mjs 3 --harness codex    # .agents/skills/revue-angular (les autres harnesses)
node ../skill-issue/course/rattrapage.mjs 5 --harness tous     # les deux
node ../skill-issue/course/rattrapage.mjs chaine               # corrige-review et raconte-branche, à côté de revue-angular
```

Ton dossier précédent est mis de côté dans `.review/ancien-skill/<claude|agents>/<skill>/`.

## Le hook et la porte

`verifs.mjs --echec-sur BLOCKER` n'affiche que les pistes de ce seuil ou plus graves et sort en 1 s'il y en a ; sans le drapeau, il affiche toutes les pistes. `.review/verifs.json` et les annotations GitHub gardent toujours toutes les pistes. Le hook de la leçon 3.5 (Claude Code) et le hook git `pre-commit` (les autres harnesses) lancent cette commande.

## La CI du bonus cloud

`ci/github/revue-angular.yml` et `ci/gitlab/revue-angular.gitlab-ci.yml` lancent le skill de l'équipe sur chaque PR ou MR : vérifications sans IA (porte sur les BLOCKER), puis revue IA si la clé d'API existe. Ils sont commités sur la branche `equipe/main` du dépôt de démo.

## Les mesures

`resultats.json` contient les scores des runs de référence (9 octobre 2026), lus par le build du site. Les rapports bruts sont dans `docs/sample-review/formation/`. Pour mesurer à nouveau : lancer `/revue-angular` sur `lab/speaker-spotlight` avec le skill d'une étape, puis `node evals/angular-review/score.mjs --report <REVIEW.md> --json`. Les runs de l'étape 5 datent d'avant la section « Garde-fous ».
