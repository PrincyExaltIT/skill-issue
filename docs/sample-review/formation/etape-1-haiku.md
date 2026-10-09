# Revue — 35d2f12 (HEAD détaché) → depart

**Verdict : à corriger**

La branche ajoute la page speaker (spotlight), le formulaire de proposition de talk protégé par une date de clôture, et un lien speaker depuis les cartes de talk. Le risque principal : une bio rendue comme HTML de confiance (faille XSS), et une page speaker qui ne charge jamais de données dans l'application telle qu'elle est livrée.

| BLOCKER | MAJOR | MINOR | INFO |
|:---:|:---:|:---:|:---:|
| 2 | 12 | 6 | 1 |

## Findings

### BLOCKER · Bio rendue comme HTML de confiance (XSS)
`src/app/speakers/speaker-spotlight.ts:34`

**Problème** — `bypassSecurityTrustHtml(speaker.bio)` désactive la sanitisation d'Angular sur une donnée qui peut contenir du HTML. Le formulaire `proposal-form.html:35` annonce « HTML autorisé », alors que `talk.model.ts:22` documente `Speaker.bio` comme « texte brut, jamais comme HTML ». Une bio contenant `<img src=x onerror=…>` exécute du script chez tout visiteur de la page speaker.

**Correction** — Afficher la bio par interpolation (`<p>{{ speaker.bio }}</p>` dans `speaker-spotlight.html`), retirer `DomSanitizer` et `bioHtml`, et retirer le hint « HTML autorisé » de `proposal-form.html:35`.

### BLOCKER · Build cassé : `ChangeDetectionStrategy.Eager` n'existe pas
`src/app/speakers/speaker-spotlight.ts:14`

**Problème** — L'enum `ChangeDetectionStrategy` d'Angular ne contient que `Default` et `OnPush`. `Eager` est une erreur TypeScript : `npm run build` échoue. Non vérifié par compilation ici, `node_modules` est absent du worktree.

**Correction** — Supprimer la ligne (le défaut est `Default`), ou mettre `ChangeDetectionStrategy.OnPush` comme le reste du projet.

### MAJOR · Page speaker qui ne charge rien dans l'application livrée
`src/app/speakers/speaker.service.ts:7`

**Problème** — `baseUrl` est codé en dur sur `http://localhost:3000/api/speakers`. Le reste de l'app passe par `API_BASE_URL` (`/data` par défaut, `public/data/speakers.json`). Sans serveur sur le port 3000, la page reste sur « Chargement du speaker… » sans message d'erreur, puisque `getSpeaker` n'a pas de gestion d'erreur.

**Correction** — Injecter `API_BASE_URL` (comme `talks.store.ts:9`), ou réutiliser `TalksStore.speakersById` (`talks.store.ts:27`). Ajouter un état d'erreur dans le template.

### MAJOR · « Tout ajouter à mes favoris » ne met pas à jour le compteur ni le stockage
`src/app/favorites/favorites.store.ts:28`

**Problème** — `this.ids().push(id)` mute le tableau du signal sans notifier. L'effet de persistance (ligne 15) ne se relance pas : le compteur de la nav (`app.html:22`) reste à jour, mais `localStorage` n'est pas écrit et les favoris disparaissent au rechargement. Il y a aussi des doublons possibles. Ça contredit `favorites.store.spec.ts` (« sans muter la précédente »).

**Correction** — `this.ids.update((ids) => (ids.includes(id) ? ids : [...ids, id]));`

### MAJOR · Message de favori toujours « Retiré »
`src/app/talks/talk-card.ts:28`

**Problème** — `isFavorite` est un `input()` : `this.isFavorite` est la fonction du signal, toujours truthy, donc `!this.isFavorite` vaut toujours `false`. Chaque clic affiche « Retiré de vos favoris », y compris à l'ajout. Aucun test ne couvre ce message.

**Correction** — `this.feedback.set(this.isFavorite() ? 'Retiré de vos favoris' : 'Ajouté à vos favoris');`

### MAJOR · Abonnements imbriqués : réponses qui se croisent
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — Le `subscribe` de `getSpeaker` (ligne 32) et celui de `getTalks` (ligne 35) ne sont pas annulés et ne suivent pas le changement de `:id`. Naviguer rapidement de A à B peut afficher le speaker A avec les talks de B, selon l'ordre d'arrivée des réponses.

**Correction** — Chaîner avec `switchMap` sur `paramMap` (ligne 30) : `params.pipe(map(p => p.get('id')), switchMap(id => forkJoin(...)))`, ou `toSignal`.

### MAJOR · Spec désactivé par `it.only`
`src/app/speakers/speaker-spotlight.spec.ts:20`

**Problème** — `it.only` fait que Vitest n'exécute que ce test de la suite. Les autres tests du fichier (et ceux qui seront ajoutés) sont ignorés en silence.

**Correction** — Remplacer par `it(`.

### MAJOR · Confirmation du formulaire jamais affichée (zoneless)
`src/app/proposals/proposal-form.ts:34`

**Problème** — `submitted` est un champ simple, mis à `true` dans un `setTimeout` (lignes 66-68). L'app est zoneless (`AGENTS.md`, pas de `zone.js` dans `package.json`) : rien ne déclenche la détection de changements, donc « Merci ! Votre proposition a bien été enregistrée » (`proposal-form.html`) ne s'affiche jamais.

**Correction** — `readonly submitted = signal(false)`, puis `this.submitted.set(true)` et `@if (submitted())` dans le template. Le `setTimeout` peut disparaître.

### MAJOR · Limite de 600 caractères affichée mais non appliquée
`src/app/proposals/proposal-form.html:29`

**Problème** — Le compteur « n / 600 caractères » ne bloque rien : ni `maxlength`, ni validateur. Le champ `abstract` vit hors du formulaire (`[value]` + `(input)`, `proposal-form.ts:20`), donc `form.invalid` ne le voit pas.

**Correction** — Passer `abstract` dans le `FormGroup` avec `Validators.maxLength(600)` et `formControlName`, ou au minimum `maxlength="600"` sur le textarea.

### MAJOR · Champ titre sans label
`src/app/proposals/proposal-form.html:15`

**Problème** — `<input formControlName="title">` n'a que `placeholder`, qui disparaît à la saisie et n'est pas un label pour un lecteur d'écran.

**Correction** — Ajouter `aria-label="Titre du talk"` (ou un `<label>` visible ou masqué).

### MAJOR · Image sans `alt`
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — `<img [src]="speaker.photoUrl">` n'a pas d'attribut `alt`. Le nom est déjà affiché juste à côté, donc `alt` peut être le nom du speaker. Le projet demande aussi `NgOptimizedImage`.

**Correction** — `<img [ngSrc]="speaker.photoUrl" [alt]="speaker.name" width="80" height="80" />` avec `NgOptimizedImage`.

### MAJOR · Talk cliquable en `div` : inaccessible au clavier, clic sans effet
`src/app/speakers/speaker-spotlight.html:22`

**Problème** — `<div class="talk" (click)="select.emit(talk.id)">` n'est pas focusable, n'a pas de rôle, et `select` n'est écouté par personne : le clic ne mène nulle part.

**Correction** — `<a class="talk" [routerLink]="['/talks', talk.id]">` (ou un bouton), avec le lien vers le détail du talk.

### MAJOR · Message « enregistrée » alors que rien ne part au comité
`src/app/proposals/proposal-form.ts:65`

**Problème** — La proposition n'est écrite que dans `localStorage` (`conf-planner:last-proposal`). Le message annonce qu'elle est « enregistrée » : l'utilisateur croit que le comité la reçoit.

**Correction** — Soit envoyer la proposition à une API, soit reformuler le message (« sauvegardée sur ce navigateur ») et le dire dans le rapport de démo. À trancher avec l'équipe.

### MAJOR · Nouveau code sans test
`src/app/proposals/proposal-form.ts`, `src/app/proposals/proposal.guard.ts`, `src/app/favorites/favorites.store.ts:27`, `src/app/talks/talk-card.ts:27`

**Problème** — Aucun test pour : la soumission et la validation du formulaire, la limite de 600 caractères, la garde de date (`ProposalGuard`), `FavoritesStore.add()`, et le message de favori de `TalkCard`. `talk-card.spec.ts` n'a pas de cas sur `feedback`. Les bugs ci-dessus seraient passés inaperçus.

**Correction** — Ajouter un spec par fichier : validation et `submitted` dans `proposal-form`, `canActivate` avant et après `CFP_CLOSES_AT`, `add()` sans doublon et persisté, et le texte du feedback dans `talk-card.spec.ts`.

### MINOR · Brouillon et bio conservés en `localStorage` après envoi
`src/app/proposals/proposal-form.ts:20`

**Problème** — `ABSTRACT_DRAFT_KEY` n'est jamais effacé et `last-proposal` (ligne 65) garde la bio. Sur un poste partagé, la bio reste lisible après l'envoi.

**Correction** — Effacer les deux clés après un envoi réussi, ou ne rien persister de la bio.

### MINOR · Conventions de l'équipe non suivies dans la page speaker
`src/app/speakers/speaker-spotlight.ts:14-21`, `src/app/speakers/speaker-spotlight.html:5,8,22`

**Problème** — `@Input`/`@Output` au lieu de `input()`/`output()`, `*ngIf`/`*ngFor` au lieu du control flow natif, `speaker: any` et `talks: any[]`. `speakerId` (ligne 17) duplique le paramètre de route.

**Correction** — `input()`, `output()`, `@if`/`@for avec track talk.id`, types `Speaker` et `Talk` de `talk.model.ts`.

### MINOR · Service speaker : `console.log`, `constructor` et `any`
`src/app/speakers/speaker.service.ts:9-16`

**Problème** — `console.log('getSpeaker', id)` (ligne 12) reste en production. `constructor(private http)` au lieu de `inject()`, et retours `Observable<any>`.

**Correction** — Supprimer le log, `private http = inject(HttpClient)`, `Observable<Speaker>` et `Observable<Talk[]>`.

### MINOR · Compteur et défaut de formulaire écrits à la main
`src/app/proposals/proposal-form.ts:3,16,33,37-39`

**Problème** — `charCount` est un `signal` mis à jour dans un `effect` alors qu'il se déduit de `abstract` : c'est un `computed`. `UntypedFormBuilder` est déprécié et `draft` n'est pas typé.

**Correction** — `charCount = computed(() => this.abstract().length)`, `FormBuilder` typé, et un type pour `draft`.

### MINOR · Route speaker importée en eager et déclarée autrement que les autres
`src/app/app.routes.ts:3,22`

**Problème** — `SpeakerSpotlight` est importé en tête de fichier et déclaré avec `component:`, alors que les autres routes utilisent `loadComponent` (lignes 8-25). Ça alourdit le bundle initial.

**Correction** — `{ path: 'speakers/:id', loadComponent: () => import('./speakers/speaker-spotlight').then(m => m.SpeakerSpotlight), title: … }`.

### INFO · Garde de route en classe et date de clôture codée en dur
`src/app/proposals/proposal.guard.ts:4`

**Problème** — `CanActivate` en classe est l'ancienne forme ; une fonction `CanActivateFn` est plus simple. La date de clôture `2026-11-30` est en dur dans le code, donc modifier la clôture demande un nouveau build.

**Correction** — Facultatif : garde fonctionnelle, date dans une configuration si la clôture peut bouger.
