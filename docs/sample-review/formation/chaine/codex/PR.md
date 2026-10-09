## Ce qui change

Cette branche ajoute une page dédiée à chaque speaker, accessible depuis les cartes de talks, avec sa bio, ses talks et une action pour tous les ajouter aux favoris. Elle ajoute aussi une page « Proposer un talk », protégée par la date de clôture du 30 novembre 2026, avec brouillon du résumé dans le stockage local, liste des talks du même track et confirmation d'envoi. Les routes de ces deux pages sont chargées à la demande, et les cartes affichent désormais un retour lors de l'ajout ou du retrait d'un favori.

## La review

Verdict de la review : à corriger. 35 findings gardés : 10 corrigés, 25 ouverts.

| Gravité | Règle | Emplacement | État |
|---|---|---|---|
| BLOCKER | SIG-04 | `src/app/speakers/speaker-spotlight.ts:30` | corrigé (`3e89ea9`) |
| BLOCKER | SEC-01 | `src/app/speakers/speaker-spotlight.ts:34` | corrigé (`3dd1379`) |
| BLOCKER | SIG-01 | `src/app/talks/talk-card.ts:28` | corrigé (`b1ce996`) |
| BLOCKER | A11Y-03 | `src/app/proposals/proposal-form.html:15` | corrigé (`5c3e3fe`) |
| BLOCKER | A11Y-02 | `src/app/speakers/speaker-spotlight.html:22` | corrigé (`ddbe09e`) |
| MAJOR | NG-11 | `src/app/app.routes.ts:22` | corrigé (`914f5f9`) |
| MAJOR | SIG-02 | `src/app/favorites/favorites.store.ts:28` | corrigé (`8ca4e21`) |
| MAJOR | SIG-03 | `src/app/proposals/proposal-form.ts:38` | corrigé (`ddc29cd`) |
| MAJOR | RX-01 | `src/app/proposals/proposal-form.ts:47` | corrigé (`9008a00`) |
| MAJOR | ZL-01 | `src/app/proposals/proposal-form.ts:67` | corrigé (`087a51e`) |
| MAJOR | hors règles | `src/app/proposals/proposal-form.ts:60` | ouvert |
| MAJOR | A11Y-01 | `src/app/speakers/speaker-spotlight.html:5` | ouvert |
| MAJOR | NG-07 | `src/app/speakers/speaker-spotlight.ts:14` | ouvert |
| MAJOR | ZL-01 | `src/app/speakers/speaker-spotlight.ts:33` | ouvert |
| MAJOR | RX-02 | `src/app/speakers/speaker-spotlight.ts:32` | ouvert |
| MAJOR | RX-03 | `src/app/speakers/speaker-spotlight.ts:32` | ouvert |
| MAJOR | NG-06 | `src/app/speakers/speaker-spotlight.ts:18` | ouvert |
| MAJOR | SEC-02 | `src/app/speakers/speaker.service.ts:7` | ouvert |
| MAJOR | TEST-01 | `src/app/speakers/speaker-spotlight.spec.ts:20` | ouvert |
| MINOR | NG-09 | `src/app/proposals/proposal-form.ts:3` | ouvert |
| MINOR | hors règles | `src/app/proposals/proposal-form.html:29` | ouvert |
| MINOR | TEST-02 | `src/app/proposals/proposal-form.ts:1` | ouvert |
| MINOR | NG-10 | `src/app/proposals/proposal.guard.ts:7` | ouvert |
| MINOR | TEST-02 | `src/app/proposals/proposal.guard.ts:1` | ouvert |
| MINOR | NG-01 | `src/app/speakers/speaker-spotlight.html:3` | ouvert |
| MINOR | NG-02 | `src/app/speakers/speaker-spotlight.ts:17` | ouvert |
| MINOR | NG-04 | `src/app/speakers/speaker-spotlight.ts:20` | ouvert |
| MINOR | NG-12 | `src/app/speakers/speaker-spotlight.ts:42` | ouvert |
| MINOR | NG-03 | `src/app/speakers/speaker.service.ts:9` | ouvert |
| MINOR | NG-04 | `src/app/speakers/speaker.service.ts:11` | ouvert |
| MINOR | NG-05 | `src/app/speakers/speaker.service.ts:12` | ouvert |
| MINOR | TEST-02 | `src/app/speakers/speaker.service.ts:1` | ouvert |
| MINOR | TEST-03 | `src/app/speakers/speaker-spotlight.spec.ts:20` | ouvert |
| INFO | NG-14 | `src/app/speakers/speaker-spotlight.html:5` | ouvert |
| INFO | NG-13 | `src/app/speakers/speaker.service.ts:5` | ouvert |

## Reste ouvert

- MAJOR · formulaire invalide : décider des messages d'erreur visibles, de leur association accessible et du déplacement du focus vers le premier champ invalide.
- MAJOR · A11Y-01 : décider si le portrait est informatif ou décoratif, puis lui donner le texte alternatif correspondant.
- MAJOR · NG-07 et ZL-01 : remplacer l'état asynchrone ordinaire de la page speaker par des signals ou resources, puis retirer la détection Eager.
- MAJOR · RX-02 : composer les changements de route et les deux chargements HTTP avec annulation des requêtes précédentes.
- MAJOR · RX-03 : définir l'état d'erreur visible et l'action de nouvelle tentative de la page speaker.
- MAJOR · NG-06 : supprimer l'output `select` devenu inutile avec les liens, ou confirmer et documenter son contrat sous un nom non natif.
- MAJOR · SEC-02 : décider de la source de données speaker et remplacer l'URL `localhost:3000` avant tout usage hors d'un backend local dédié.
- MAJOR · TEST-01 : retirer le test focalisé afin que toute la suite puisse s'exécuter.
- MINOR · NG-09 : migrer le formulaire vers les formulaires strictement typés.
- MINOR · limite de résumé : appliquer la limite annoncée de 600 caractères dans le template et dans le modèle.
- MINOR · TEST-02, formulaire : ajouter les tests du titre obligatoire, du compteur et de sa limite, du brouillon et de la confirmation.
- MINOR · NG-10 : remplacer le guard de classe par un guard fonctionnel.
- MINOR · TEST-02, guard : tester l'accès et la redirection de part et d'autre de la date de clôture.
- MINOR · NG-01 : migrer le template speaker vers `@if` et `@for` avec suivi par identifiant.
- MINOR · NG-02 : supprimer les anciens décorateurs d'entrée et de sortie, ou les remplacer par `input()` et `output()` si ces contrats restent nécessaires.
- MINOR · NG-04, composant : typer le speaker et ses talks avec les modèles existants.
- MINOR · NG-12 : réutiliser l'utilitaire `initialsOf` au lieu du calcul local.
- MINOR · NG-03 : utiliser `inject(HttpClient)` dans le service speaker.
- MINOR · NG-04, service : typer les réponses HTTP avec `Speaker` et `Talk[]`.
- MINOR · NG-05 : supprimer la trace `console.log` du service speaker.
- MINOR · TEST-02, service : ajouter les tests des URL, des réponses typées et des erreurs HTTP, sauf si le service est remplacé par le store existant.
- MINOR · TEST-03 : étendre le test du composant speaker au chargement, à l'erreur, à la navigation clavier et à l'ajout des favoris.
- INFO · NG-14 : utiliser `NgOptimizedImage` et déclarer les dimensions du portrait.
- INFO · NG-13 : confirmer puis appliquer la forme de service racine Angular 22 retenue par le projet.

## Comment tester

- Exécuter `npm test -- --watch=false`, puis `npm run build` pour vérifier la suite Vitest et les templates stricts.
- Depuis une carte de talk, ouvrir le speaker, vérifier sa bio et ses talks, suivre un talk, puis utiliser « Tout ajouter à mes favoris » et contrôler la liste des favoris. Ce parcours suppose qu'une API speaker réponde à l'URL actuellement codée dans `speaker.service.ts`.
- Ouvrir `/proposals`, saisir un titre, changer de track, rédiger un résumé et une bio, envoyer le formulaire, puis vérifier la confirmation et le brouillon conservé après rechargement.
- Soumettre le formulaire sans titre et vérifier le comportement actuel avant de décider le retour d'erreur attendu.
