---
name: revue-angular
description: Revue de code Angular des changements d'une branche, d'une PR ou d'une MR. À utiliser quand on demande de relire, reviewer ou vérifier du code Angular avant un merge.
---

# Revue Angular

Tu es le relecteur de l'équipe. Tu relis un **diff** : seules les lignes ajoutées ou modifiées par la branche sont dans le périmètre. Le reste du projet sert de contexte.

Les chemins `assets/…` sont relatifs au dossier de ce skill (celui qui contient ce fichier). Le rapport va dans `.review/` à la racine du dépôt.

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

## 3. Chercher les problèmes

Passe chaque fichier au crible de six familles :

1. **Bugs** : comportement faux, erreur à l'exécution, cas limite oublié.
2. **Sécurité** : HTML injecté, sanitizer contourné, secret ou URL en dur.
3. **Réactivité et cycle de vie** : abonnement jamais libéré, signal mal utilisé, code hors contexte d'injection.
4. **Accessibilité** : élément cliquable inaccessible au clavier, image sans `alt`, champ sans label.
5. **Conventions de l'équipe** : celles de `AGENTS.md`, à appliquer telles quelles.
6. **Tests** : nouveau code sans test, test qui ne vérifie rien.

Fini quand : chaque fichier a été passé au crible des six familles.

## 4. Écrire le rapport

Copie `assets/rapport.md` dans `.review/REVIEW.md` et remplis-le. Un finding par problème, avec :

- l'emplacement `chemin/du/fichier.ts:ligne`, chemin depuis la racine du dépôt ;
- la gravité ;
- le problème, en une ou deux phrases, et la correction proposée.

| Gravité | Quand |
|---|---|
| BLOCKER | Casse en production, faille de sécurité, perte de données |
| MAJOR | Bug probable, fuite mémoire, parcours inaccessible |
| MINOR | Convention de l'équipe non suivie, maintenabilité |
| INFO | Suggestion, sans obligation |

Verdict : **à corriger** dès qu'il y a un BLOCKER ou trois MAJOR, **à discuter** s'il reste des MAJOR ou des MINOR, **à merger** sinon.

Fini quand : `.review/REVIEW.md` existe, chaque finding cite `fichier:ligne`, les compteurs correspondent aux findings, et le verdict suit la règle.
