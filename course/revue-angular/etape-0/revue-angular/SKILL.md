---
name: revue-angular
description: Revue de code Angular des changements d'une branche, d'une PR ou d'une MR. À utiliser quand on demande de relire, reviewer ou vérifier du code Angular avant un merge.
---

# Revue Angular

Relis les changements de la branche courante par rapport à sa branche de base : `main`, ou celle que l'utilisateur nomme.

Pour chaque problème, donne :
- l'emplacement `chemin/du/fichier.ts:ligne` ;
- la gravité : BLOCKER, MAJOR, MINOR ou INFO ;
- le problème et la correction proposée.

Écris le rapport dans `.review/REVIEW.md` et termine par un verdict : à merger, à discuter ou à corriger.
