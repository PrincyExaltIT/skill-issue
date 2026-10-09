## Ce qui change
La conférence a besoin de mettre ses speakers en avant et de recevoir des propositions de talks pendant l'appel à orateurs. La branche ajoute une page `/speakers/:id` (photo, bio, liste des talks avec un bouton « Tout ajouter à mes favoris ») et un formulaire `/proposals`, protégé par un guard jusqu'au 30/11 et accessible depuis la navigation. Les cartes de talk renvoient maintenant vers la page du speaker, et le bouton favori annonce « Ajouté » ou « Retiré » dans une région `role="status"` (35d2f12). La page speaker lit désormais `TalksStore` en `computed()` : `SpeakerService` et son URL d'API en dur sont supprimés (560a1b4, d9b23c6).

## La review
Verdict de la review : à corriger. 35 findings gardés : 17 corrigés, 18 ouverts.

Les 5 BLOCKER sont corrigés. Sur les 18 findings ouverts, 11 n'ont plus de cause dans le code actuel (refonte de la page speaker, suppression de `SpeakerService`), mais aucun commit ne cite leur règle. Ils sont donc indiqués comme « ouverts, résolus de fait » : il reste à les confirmer.

| Gravité | Règle | Emplacement | État |
|---|---|---|---|
| BLOCKER | SIG-04 | `src/app/speakers/speaker-spotlight.ts:30` | corrigé (1ca2bea) |
| BLOCKER | SEC-01 | `src/app/speakers/speaker-spotlight.ts:34` | corrigé (40daf4d) |
| BLOCKER | SIG-01 | `src/app/talks/talk-card.ts:28` | corrigé (ab4da80) |
| BLOCKER | A11Y-02 | `src/app/speakers/speaker-spotlight.html:22` | corrigé (afdf422) |
| BLOCKER | A11Y-03 | `src/app/proposals/proposal-form.html:15` | corrigé (274ffeb) |
| MAJOR | ZL-01 | `src/app/speakers/speaker-spotlight.ts:33` | corrigé (560a1b4) |
| MAJOR | RX-02 | `src/app/speakers/speaker-spotlight.ts:32` | ouvert, résolu de fait : plus aucun abonnement depuis 560a1b4 |
| MAJOR | RX-03 | `src/app/speakers/speaker-spotlight.ts:32` | corrigé (0893bb3) |
| MAJOR | NG-07 | `src/app/speakers/speaker-spotlight.ts:14` | corrigé (7fe53a1) |
| MAJOR | NG-06 | `src/app/speakers/speaker-spotlight.ts:18` | ouvert, résolu de fait : l'output `select` a disparu avec afdf422 |
| MAJOR | A11Y-01 | `src/app/speakers/speaker-spotlight.html:5` | corrigé (0b0a11c) |
| MAJOR | SIG-02 | `src/app/favorites/favorites.store.ts:28` | corrigé (8488929) |
| MAJOR | RX-01 | `src/app/proposals/proposal-form.ts:47` | corrigé (e48e6e9) |
| MAJOR | SIG-03 | `src/app/proposals/proposal-form.ts:37` | corrigé (e5ff83d) |
| MAJOR | ZL-01 | `src/app/proposals/proposal-form.ts:67` | corrigé (0637f2d) |
| MAJOR | NG-11 | `src/app/app.routes.ts:22` | corrigé (5b7991e) |
| MAJOR | SEC-02 | `src/app/speakers/speaker.service.ts:7` | corrigé (d9b23c6) |
| MAJOR | TEST-01 | `src/app/speakers/speaker-spotlight.spec.ts:20` | corrigé (f49791c) |
| MAJOR | TEST-04 | `src/app/speakers/speaker-spotlight.spec.ts:13` | corrigé (3681445) |
| MINOR | TEST-03 | `src/app/speakers/speaker-spotlight.spec.ts:20` | ouvert, résolu de fait : le spec contient 5 tests qui fixent l'`id` |
| MINOR | NG-01 | `src/app/speakers/speaker-spotlight.html:3` | ouvert : `*ngIf` / `*ngFor` toujours présents |
| MINOR | NG-02 | `src/app/speakers/speaker-spotlight.ts:17` | ouvert, résolu de fait : `input.required<string>()` |
| MINOR | NG-04 | `src/app/speakers/speaker-spotlight.ts:20` | ouvert, résolu de fait : plus de `any` |
| MINOR | NG-12 | `src/app/speakers/speaker-spotlight.ts:42` | ouvert : `getInitials` toujours présent et appelé depuis le template |
| MINOR | NG-14 | `src/app/speakers/speaker-spotlight.html:5` | ouvert : toujours `[src]` |
| MINOR | NG-04 | `src/app/speakers/speaker.service.ts:11` | ouvert, résolu de fait : fichier supprimé (d9b23c6) |
| MINOR | NG-03 | `src/app/speakers/speaker.service.ts:9` | ouvert, résolu de fait : fichier supprimé (d9b23c6) |
| MINOR | NG-05 | `src/app/speakers/speaker.service.ts:12` | ouvert, résolu de fait : fichier supprimé (d9b23c6) |
| MINOR | TEST-02 | `src/app/speakers/speaker.service.ts:1` | ouvert, résolu de fait : fichier supprimé (d9b23c6) |
| MINOR | NG-09 | `src/app/proposals/proposal-form.ts:16` | ouvert : toujours `UntypedFormBuilder` |
| MINOR | hors règles | `src/app/proposals/proposal-form.ts:61` | ouvert : aucun message d'erreur sous le titre |
| MINOR | TEST-02 | `src/app/proposals/proposal-form.ts:1` | ouvert, partiel : un spec existe, sans test du refus sans titre ni de la restauration du brouillon |
| MINOR | NG-10 | `src/app/proposals/proposal.guard.ts:7` | ouvert : guard toujours en classe |
| MINOR | TEST-02 | `src/app/proposals/proposal.guard.ts:1` | ouvert : pas de spec |
| INFO | NG-13 | `src/app/speakers/speaker.service.ts:5` | ouvert, résolu en partie : service supprimé, mais `proposal.guard.ts:6` garde `@Injectable` |

## Reste ouvert
Aucun BLOCKER ouvert.

**MAJOR à confirmer** (le code ne présente plus le problème, mais aucun commit ne cite la règle) :
- RX-02 et NG-06 sur `speaker-spotlight.ts` : peut-on les fermer au titre de 560a1b4 et afdf422 ?

**MINOR toujours présents dans le code** : faut-il les traiter dans cette PR ou ouvrir un ticket ?
- NG-01 : passer `speaker-spotlight.html` au control flow natif (`@if` / `@for`) et retirer `NgIf, NgFor` des imports.
- NG-12 : remplacer `getInitials` par `initialsOf` (`talks/initials.ts`) dans un `computed()`.
- NG-14 : `NgOptimizedImage` pour la photo du speaker (c'est une convention d'`AGENTS.md`).
- NG-09 : typer le formulaire de proposition.
- Hors règles : un envoi sans titre ne produit aucun message. Ajouter une erreur visible sous le champ.
- NG-10 : écrire `ProposalGuard` en `CanActivateFn`.
- TEST-02 : tests du guard (avant et après le 30/11) ; compléter le spec du formulaire (refus sans titre, restauration du brouillon).
- NG-13 (INFO) : `@Service()` pour le guard s'il reste en classe.

**MINOR résolus de fait, à fermer** : TEST-03, NG-02 et NG-04 (`speaker-spotlight.ts`) ; NG-04, NG-03, NG-05 et TEST-02 (`speaker.service.ts`, supprimé).

## Comment tester
- `npm test -- --watch=false` puis `npm run build` (templates stricts).
- Depuis le programme, cliquer sur le nom d'un speaker dans une carte de talk : la page s'affiche sans rester sur « Chargement du speaker… », la bio est en texte brut, et chaque talk est un lien atteignable au clavier qui mène à son détail.
- Sur cette page, cliquer sur « Tout ajouter à mes favoris » : le compteur « Mes favoris » augmente sans doublon et l'ajout survit à un rechargement.
- Ouvrir `/speakers/<id inconnu>` : « Speaker introuvable » s'affiche. Couper l'API : un message d'erreur avec « Réessayer » s'affiche.
- Sur une carte de talk, ajouter puis retirer un favori : le message annonce « Ajouté », puis « Retiré ».
- Sur `/proposals` : le champ titre est annoncé par un lecteur d'écran, le compteur de caractères suit la saisie, et « Merci ! » s'affiche après l'envoi.
- Question pour l'auteur : quel id de speaker utiliser pour tester, et y en a-t-il un avec `photoUrl` pour vérifier l'`alt` ?

🤖 Generated with [Claude Code](https://claude.com/claude-code)
