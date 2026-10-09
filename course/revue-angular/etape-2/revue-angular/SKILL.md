---
name: revue-angular
description: Revue de code Angular des changements d'une branche, d'une PR ou d'une MR, selon les règles de l'équipe. À utiliser quand on demande de relire, reviewer ou vérifier du code Angular avant un merge.
---

# Revue Angular

Tu es le relecteur de l'équipe. Tu relis un **diff** : seules les lignes ajoutées ou modifiées par la branche sont dans le périmètre. Le reste du projet sert de contexte.

Les chemins `references/…` et `assets/…` sont relatifs au dossier de ce skill (celui qui contient ce fichier). Le rapport va dans `.review/` à la racine du dépôt.

## 1. Délimiter le périmètre

```bash
git diff --stat main...HEAD -- . ':!.claude' ':!.agents' ':!.review'
git diff main...HEAD -- . ':!.claude' ':!.agents' ':!.review'
```

Si l'utilisateur nomme une autre branche de base, remplace `main`. En CI, la base est `origin/<branche cible>`.

Fini quand : tu as la liste des fichiers modifiés et, pour chacun, les lignes ajoutées ou modifiées.

## 2. Lire chaque fichier modifié en entier

Le diff montre ce qui change ; le fichier entier montre pourquoi ça casse. Lis aussi les fichiers qu'un changement touche directement (le template d'un composant, le service qu'il appelle).

Fini quand : chaque fichier de la liste a été lu en entier.

## 3. Charger les règles de l'équipe

| Le périmètre contient | Charge |
|---|---|
| des composants, services, routes ou formulaires | `references/angular-22.md` |
| des signals, `effect`, `subscribe`, `setTimeout`, des appels HTTP | `references/reactivite.md` |
| du HTML injecté, des URL, du stockage navigateur, des redirections | `references/securite.md` |
| des templates (`.html` ou `template:`) | `references/accessibilite.md` |
| de nouveaux fichiers ou des `.spec.ts` | `references/tests.md` |

Les conventions de `AGENTS.md` priment sur ces règles.

Fini quand : chaque famille touchée par le périmètre a sa référence chargée.

## 4. Chercher les problèmes

Confronte chaque règle chargée à chaque fichier concerné, ligne modifiée par ligne modifiée. Un problème que les règles ne couvrent pas reste un finding s'il s'agit d'un bug, d'une faille ou d'une perte de données.

Fini quand : chaque règle chargée a été confrontée à chaque fichier concerné.

## 5. Écrire le rapport

Copie `assets/rapport.md` dans `.review/REVIEW.md` et remplis-le. Un finding par problème, avec :

- l'emplacement `chemin/du/fichier.ts:ligne`, chemin depuis la racine du dépôt ;
- la gravité, et l'identifiant de la règle quand une règle s'applique (`SIG-01`) ;
- le problème, en une ou deux phrases, et la correction proposée.

| Gravité | Quand |
|---|---|
| BLOCKER | Casse en production, faille de sécurité, perte de données |
| MAJOR | Bug probable, fuite mémoire, parcours inaccessible |
| MINOR | Convention de l'équipe non suivie, maintenabilité |
| INFO | Suggestion, sans obligation |

La gravité d'une règle est celle de la référence, sauf raison écrite dans le finding.

Verdict : **à corriger** dès qu'il y a un BLOCKER ou trois MAJOR, **à discuter** s'il reste des MAJOR ou des MINOR, **à merger** sinon.

Fini quand : `.review/REVIEW.md` existe, chaque finding cite `fichier:ligne`, les compteurs correspondent aux findings, et le verdict suit la règle.
