## Pourquoi

Ajouter deux parcours au planner de conférence : une page de présentation d'un speaker et un formulaire de proposition de talk ouvert jusqu'à la clôture du CFP. La branche contient la fonctionnalité (`be0bdd0`) puis 21 commits de correction issus d'une review automatique.

> ⚠️ **À ne pas merger en l'état** : la re-review rend toujours **REQUEST_CHANGES** avec 1 BLOCKER. La page speaker ne peut pas charger ses données (détails plus bas).

## Ce qui change

- Nouvelle page `/speakers/:id` (chargée à la demande) : portrait ou initiales, bio, liste des talks, bouton « Tout ajouter à mes favoris ». Chaque carte de talk renvoie vers cette page.
- La page affiche un message d'erreur (`role="alert"`) si le speaker ne se charge pas, et un message distinct sous « Ses talks » si seuls les talks échouent.
- Nouveau formulaire `/proposals` : titre obligatoire, track, résumé avec compteur de caractères, brouillon conservé dans `localStorage`, confirmation après l'envoi. Un guard redirige vers `/` après la date de clôture du CFP.
- Bouton favori des cartes de talk : il affiche maintenant un retour textuel (« Ajouté à vos favoris » / « Retiré de vos favoris »).
- `FavoritesStore.add()` crée une nouvelle liste au lieu de modifier le signal en place, et n'ajoute plus de doublon.

## Review automatique (angular-review)

Les identifiants `F-xxx` des messages de commit renvoient à la **review initiale**. La re-review a **renuméroté** ses findings : un même identifiant ne désigne pas le même problème d'un tour à l'autre.

| Étape | Verdict | 🔴 BLOCKER | 🟠 MAJOR | 🟡 MINOR | 🔵 INFO |
|---|---|:---:|:---:|:---:|:---:|
| Review initiale (faite avec Codex selon l'auteur) | 🔴 REQUEST_CHANGES | 8 | 13 | 16 | — |
| Après review-fix (21 corrections, un commit chacune) | — | 0 | 0 | 16 ouverts | — |
| Re-review | 🔴 REQUEST_CHANGES | **1** | **2** | 15 | 5 |

Détail des corrections : `.review/FIXES.md`. Re-review complète : `.review/REVIEW.md`. Aucun finding n'a été marqué `wontfix` pendant review-fix. La re-review a écarté 20 candidats à la vérification, chacun avec sa raison (section « Écartés à la vérification » de REVIEW.md).

## Points d'attention pour le relecteur humain

**Bloquant**
- **F-001 (re-review), BLOCKER : URL d'API codée en dur.** `SpeakerService` appelle `http://localhost:3000/api/speakers`, mais le dépôt ne contient ni serveur ni proxy à cette adresse. Les données sont dans `public/data` et passent par `API_BASE_URL`. Résultat : en `npm start` comme en production, `/speakers/:id` affiche toujours « Impossible de charger ce speaker ». **Décision à prendre :** brancher le service sur `public/data`, ou attendre qu'une vraie API existe.

**MAJOR**
- **F-004 (re-review) : le bouton du titre de talk sur la page speaker ne fait rien.** Il émet `talkSelected`, mais le composant n'est ouvert que par le routeur et aucun parent n'écoute cet output. La correction initiale (F-003 et F-019 de la review initiale) l'a rendu accessible au clavier sans lui donner d'effet. Correctif proposé : en faire un lien vers `/talks/:id`.
- **F-002 (re-review) : envoyer le formulaire sans titre ne produit aucun retour.** Pas de message, pas de `aria-invalid`, pas de déplacement du focus.

**Choix produit et UX (la machine ne peut pas trancher)**
- **F-003 (re-review) : la bio du speaker est du HTML saisi par le speaker.** Le formulaire annonce « HTML autorisé ». Le sanitizer d'Angular bloque l'exécution de scripts, mais laisse passer les liens et images externes (faux liens, pixels de suivi). Faut-il garder du HTML, passer en texte brut, ou accepter un sous-ensemble Markdown ?
- **F-008 (re-review) : le label du champ titre n'est visible que pour les lecteurs d'écran.** C'est le choix fait par la correction initiale F-001. Pour les autres utilisateurs, seul le placeholder sert de libellé, et le caractère obligatoire du champ n'est indiqué nulle part.
- **F-006 (re-review) : une live region par carte de talk.** Sur `/favoris`, l'annonce « Retiré de vos favoris » est perdue parce que la carte est détruite.

**Conformité aux conventions d'AGENTS.md (MINOR, non bloquant) :** `*ngIf`/`*ngFor`, `@Input`, injection par constructeur, `any`, formulaire non typé, absence de `NgOptimizedImage`, `console.log` résiduel. Tous ces points sont dans le code de la fonctionnalité initiale et n'ont pas été traités au premier tour.

**Validation :** la suite de tests n'a été exécutée **ni pendant la re-review, ni lors de la préparation de cette PR**. Les corrections indiquent chacune un test ciblé (FIXES.md), mais aucun résultat global de `npm test` ou `npm run build` n'est disponible à ce stade.

## Comment tester

```bash
npm ci
npm test -- --watch=false
npm run build
npm start
```

- `/speakers/camille-laurent` : **comportement actuel attendu**, le message « Impossible de charger ce speaker » s'affiche (F-001).
- `/proposals` : cliquer « Envoyer ma proposition » sans titre (aucun retour aujourd'hui, F-002). Avec un titre, vérifier que la confirmation s'affiche. Recharger la page pour vérifier que le brouillon est restauré.
- Programme : basculer un favori et vérifier le message sous la carte. Sur `/favoris`, retirer un favori.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
