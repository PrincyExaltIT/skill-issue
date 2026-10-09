La branche `lab/speaker-spotlight` contient un commit (`35d2f12`) par rapport à `depart`. Je ne la recommande pas en l'état pour `depart`, et je te demande d'abord si c'est voulu.

**Point à trancher avant tout :** le README dit que `lab/speaker-spotlight` est « la pull request à relire, écrite dans l'urgence, avec des défauts à trouver », et que `depart` est « le point de départ » sans skill. Merger la lab dans `depart` y ferait entrer les défauts volontaires de la formation. Si ce n'est pas l'intention, on n'y touche pas.

**Bugs à corriger**
- `src/app/talks/talk-card.ts:28` : `!this.isFavorite` teste la fonction `input()` (toujours truthy). Le message est donc toujours « Retiré de vos favoris ». Il faut `this.isFavorite()`.
- `src/app/favorites/favorites.store.ts:27-29` : `add()` fait `this.ids().push(id)`. C'est une mutation sans `update()` : le compteur et `has()` ne se mettent pas à jour, et l'effet ne réécrit pas le `localStorage`. Le bouton « Tout ajouter à mes favoris » ne se voit pas à l'écran.
- `src/app/speakers/speaker.service.ts:7` : URL en dur `http://localhost:3000/api/speakers`. Rien ne tourne sur ce port. Les données sont dans `public/data/*.json` via `API_BASE_URL`. La page speaker restera sur « Chargement du speaker… ». Il y a aussi un `console.log` de debug à la ligne 12.
- `src/app/speakers/speaker-spotlight.ts:34` : `bypassSecurityTrustHtml(speaker.bio)`. C'est une XSS et ça contredit le contrat de `talk.model.ts` (« texte brut, jamais comme HTML »). Le champ « HTML autorisé » du formulaire de proposition va dans le même sens.
- `src/app/proposals/proposal-form.ts:34` : `submitted` est un champ simple, mis à `true` dans un `setTimeout`. L'app est zoneless : le message « Merci ! » ne s'affichera pas. Il faut un signal.
- `src/app/speakers/speaker-spotlight.spec.ts:20` : `it.only` désactive les autres tests du fichier. Le seul test vérifie juste la création, pas le comportement.
- Le compteur « 600 caractères » du résumé n'est pas appliqué : le champ n'est pas dans le formulaire et n'a ni `maxlength` ni validateur.

**Écarts avec `AGENTS.md`**
- `speaker-spotlight.html` utilise `*ngIf` / `*ngFor` au lieu de `@if` / `@for`.
- `speaker-spotlight.ts` utilise `@Input` / `@Output` / `EventEmitter` au lieu de `input()` / `output()`, et `ChangeDetectionStrategy.Eager` au lieu d'OnPush.
- `speaker: any` et `talks: any[]` : il faudrait `Speaker` et `Talk`.
- Les talks de la page speaker sont des `div` cliquables : pas accessibles au clavier, et l'output `select` n'est consommé par personne.
- Les `subscribe` imbriqués de `ngOnInit` ne sont pas annulés au changement de paramètre (il faudrait un `switchMap`).

**Non vérifié :** je n'ai pas pu lancer `npm run build` ni `npm test`. `node_modules` est absent et `npm ci` a été refusé à l'approbation. Ce qui précède vient de la lecture du code.

Dis-moi si la branche lab doit bien aller dans `depart`, et si tu veux que je lance `npm ci` puis le build et les tests pour confirmer les points ci-dessus.