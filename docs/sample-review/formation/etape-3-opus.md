# Revue — lab/speaker-spotlight → depart

**Verdict : à corriger**

La branche ajoute la page speaker (`/speakers/:id`), le formulaire de proposition de talk (`/proposals`) avec son guard, un retour « ajouté / retiré » sur la carte de talk et `FavoritesStore.add()`. Risque principal : la page speaker ne peut pas fonctionner (NG0203 au `ngOnInit`, puis rendu jamais déclenché en zoneless) et, une fois réparée, elle injecte sans nettoyage une bio HTML saisie par l'utilisateur (XSS stockée).

| BLOCKER | MAJOR | MINOR | INFO |
|:---:|:---:|:---:|:---:|
| 5 | 14 | 11 | 3 |

## Findings

### BLOCKER · SEC-01 · Bio HTML injectée sans nettoyage
`src/app/speakers/speaker-spotlight.ts:34`

**Problème** — `bypassSecurityTrustHtml(speaker.bio)` puis `[innerHTML]="bioHtml"` (`speaker-spotlight.html:13`) désactivent la protection XSS. La bio est saisie par le speaker lui-même (`proposal-form.html:35` annonce « HTML autorisé ») : c'est une XSS stockée, exécutée chez chaque visiteur de la page.

**Correction** — supprimer le contournement et afficher la bio en texte (`{{ speaker().bio }}`). Si un peu de mise en forme est indispensable, un sous-ensemble Markdown nettoyé côté serveur (voir SEC-03), et retirer la mention « HTML autorisé » du formulaire.

### BLOCKER · SIG-04 · `takeUntilDestroyed()` hors contexte d'injection
`src/app/speakers/speaker-spotlight.ts:30`

**Problème** — `takeUntilDestroyed()` sans argument est appelé dans `ngOnInit` : il lève NG0203 à l'exécution, la page speaker plante à chaque ouverture. (La piste RX-01 sur cette ligne est donc écartée au profit de celle-ci.)

**Correction** — injecter `DestroyRef` et passer `takeUntilDestroyed(this.destroyRef)`, ou mieux, déclarer l'état en initialiseur de champ (`toSignal` / `httpResource`, voir RX-02).

### BLOCKER · A11Y-02 · Talk cliquable sur un `div`
`src/app/speakers/speaker-spotlight.html:22`

**Problème** — `(click)` sur un `<div class="talk">` : pas de focus, pas de clavier, la liste des talks est inaccessible. En plus, `select` est émis vers personne : le composant est routé, aucun parent n'écoute, le clic ne fait rien.

**Correction** — c'est une navigation : `<a class="talk" [routerLink]="['/talks', talk.id]">…</a>`, et supprimer l'output.

### BLOCKER · A11Y-03 · Champ « Titre » sans label
`src/app/proposals/proposal-form.html:15`

**Problème** — l'`<input formControlName="title">` n'a qu'un placeholder : il disparaît à la saisie et n'est pas toujours annoncé. C'est pourtant le seul champ obligatoire du formulaire.

**Correction** — `<label for="title">Titre du talk</label>` puis `<input id="title" formControlName="title" />`, dans un `<div class="field">` comme les autres champs.

### BLOCKER · SIG-01 · `isFavorite` testé sans être appelé
`src/app/talks/talk-card.ts:28`

**Problème** — `!this.isFavorite` teste la fonction de l'input, toujours vraie : la condition est toujours fausse et la carte annonce « Retiré de vos favoris » même quand on ajoute.

**Correction** — `if (!this.isFavorite())`.

### MAJOR · SIG-02 · `add()` modifie le tableau du signal en place
`src/app/favorites/favorites.store.ts:28`

**Problème** — `this.ids().push(id)` ne change pas la référence : ni `count` (compteur du header), ni l'effet de persistance, ni les vues ne se mettent à jour. « Tout ajouter à mes favoris » semble ne rien faire, et les ajouts sont perdus au rechargement. Rien n'empêche non plus les doublons.

**Correction** — `this.ids.update((ids) => (ids.includes(id) ? ids : [...ids, id]));`

### MAJOR · ZL-01 · État de la page speaker en champs ordinaires
`src/app/speakers/speaker-spotlight.ts:33`

**Problème** — `this.speaker`, `this.bioHtml` (l. 34) et `this.talks` (l. 36) sont affectés dans des callbacks `subscribe`. L'application est zoneless : aucun rendu n'est déclenché et la page reste sur « Chargement du speaker… ». `Eager` n'y change rien.

**Correction** — passer l'état en signals : `readonly speaker = toSignal(…)` ou `httpResource()`, et lire `speaker()` dans le template.

### MAJOR · RX-02 · Abonnements imbriqués
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — `paramMap` → `getSpeaker` → `getTalks` en trois `subscribe` imbriqués : si on passe d'un speaker à l'autre, les requêtes précédentes ne sont pas annulées et les réponses peuvent arriver dans le désordre (talks d'un speaker affichés sous un autre).

**Correction** — un seul flux en initialiseur de champ :
```ts
private readonly speaker$ = inject(ActivatedRoute).paramMap.pipe(
  map((p) => p.get('id')!),
  switchMap((id) => this.speakerService.getSpeaker(id)),
);
readonly speaker = toSignal(this.speaker$);
```
puis les talks via `switchMap` ou un `httpResource` dépendant de `speaker()`.

### MAJOR · RX-03 · Erreur HTTP non gérée
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — ni `getSpeaker` ni `getTalks` n'ont de gestion d'erreur : un speaker inconnu ou une API indisponible laisse l'écran sur « Chargement… » sans explication.

**Correction** — un état d'erreur visible (`@if (speaker.error()) { <p role="alert">Speaker introuvable.</p> <a routerLink="/">Retour au programme</a> }`).

### MAJOR · NG-07 · Détection de changement forcée en `Eager`
`src/app/speakers/speaker-spotlight.ts:14`

**Problème** — `ChangeDetectionStrategy.Eager` sans justification ; il masque probablement le problème ZL-01 sans le résoudre.

**Correction** — retirer la ligne une fois l'état passé en signals.

### MAJOR · NG-06 · Output nommé `select`
`src/app/speakers/speaker-spotlight.ts:18`

**Problème** — `select` est un événement DOM : un parent qui écrirait `(select)` recevrait aussi l'événement natif. (Ici l'output n'est de toute façon jamais écouté, voir A11Y-02.)

**Correction** — supprimer l'output ; si un parent en a besoin un jour, `readonly talkSelected = output<string>()`.

### MAJOR · NG-11 · Page speaker chargée d'emblée
`src/app/app.routes.ts:22`

**Problème** — `component: SpeakerSpotlight` (et l'import statique l. 3) met la page dans le bundle initial, alors que toutes les autres routes sont en `loadComponent`.

**Correction** — `loadComponent: () => import('./speakers/speaker-spotlight').then((m) => m.SpeakerSpotlight)` (ou un `export default`, comme `ProposalForm`), et retirer l'import.

### MAJOR · A11Y-01 · Photo du speaker sans `alt`
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — le lecteur d'écran lira l'URL de l'image, ou rien.

**Correction** — `alt="Portrait de {{ speaker().name }}"`.

### MAJOR · SEC-02 · URL d'API en dur
`src/app/speakers/speaker.service.ts:7`

**Problème** — `http://localhost:3000/api/speakers` casse hors du poste de développement, alors que le projet fournit déjà `API_BASE_URL` (`src/app/core/api-base-url.ts`, utilisé par `TalksStore`).

**Correction** — `private readonly baseUrl = \`${inject(API_BASE_URL)}/speakers\`;`

### MAJOR · TEST-01 · Test focalisé
`src/app/speakers/speaker-spotlight.spec.ts:20`

**Problème** — `it.only` : en CI (`CI=true`) Vitest échoue ; en local, les autres tests du fichier sont ignorés silencieusement.

**Correction** — `it(…)`.

### MAJOR · TEST-04 · `HttpClient` réel dans le test
`src/app/speakers/speaker-spotlight.spec.ts:13`

**Problème** — `provideHttpClient()` sans `provideHttpClientTesting()` : dès que le test déclenchera `ngOnInit` (premier `detectChanges`), il appellera le vrai backend.

**Correction** — `providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]`, puis `HttpTestingController` pour répondre aux requêtes.

### MAJOR · RX-01 · `valueChanges` jamais libéré
`src/app/proposals/proposal-form.ts:47`

**Problème** — `this.form.valueChanges.subscribe(…)` sans `takeUntilDestroyed` : l'abonnement survit au composant à chaque visite de `/proposals`.

**Correction** — `.pipe(takeUntilDestroyed(this.destroyRef))`, ou plus simple : supprimer `draft` et lire `this.form.getRawValue()` dans `submit()`.

### MAJOR · SIG-03 · `effect()` qui dérive `charCount`
`src/app/proposals/proposal-form.ts:37`

**Problème** — l'effect recopie `abstract().length` dans un autre signal : état mis à jour un tour trop tard, et un `signal` modifiable là où une dérivation suffit. (L'effect l. 41 vers `localStorage` est un effet de bord légitime.)

**Correction** — `readonly charCount = computed(() => this.abstract().length);` et supprimer l'effect.

### MAJOR · ZL-01 · Confirmation d'envoi jamais affichée
`src/app/proposals/proposal-form.ts:67`

**Problème** — `this.submitted = true` dans un `setTimeout` : en zoneless (et en OnPush), aucun rendu n'est déclenché, le message « Merci ! » ne s'affiche jamais et l'utilisateur ne sait pas si sa proposition est partie.

**Correction** — `readonly submitted = signal(false);`, `this.submitted.set(true)`, et `@if (submitted())` dans le template.

### MINOR · NG-01 · `*ngIf` / `*ngFor` dépréciés
`src/app/speakers/speaker-spotlight.html:3`

**Problème** — `*ngIf` (l. 3, 5, 6), `*ngFor` sans `track` (l. 22), `NgIf` / `NgFor` importés (`speaker-spotlight.ts:11`), contre la convention du projet.

**Correction** — `@if (speaker(); as speaker) { … } @else { … }` et `@for (talk of talks(); track talk.id) { … }`.

### MINOR · NG-02 · `@Input` / `@Output` décorateurs
`src/app/speakers/speaker-spotlight.ts:17`

**Problème** — `@Input() speakerId!` et `@Output() … new EventEmitter` (l. 18) au lieu de `input()` / `output()`. `speakerId` n'est d'ailleurs jamais fourni (composant routé) : le repli `?? this.speakerId` (l. 31) passe `undefined` au service.

**Correction** — supprimer `speakerId` et lire l'`id` de la route seulement, ou `readonly id = input.required<string>()` avec `withComponentInputBinding()`.

### MINOR · NG-04 · Types `any`
`src/app/speakers/speaker-spotlight.ts:20`

**Problème** — `speaker: any`, `talks: any[]` (l. 21), et `Observable<any>` dans `speaker.service.ts:11` et `:16`. Une faute de frappe sur `speaker.photoUrl` passerait la compilation.

**Correction** — utiliser `Speaker` et `Talk` de `talks/talk.model.ts` : `getSpeaker(id): Observable<Speaker>`, `this.http.get<Speaker>(…)`.

### MINOR · NG-12 · Calcul des initiales dupliqué
`src/app/speakers/speaker-spotlight.ts:42`

**Problème** — `getInitials()` refait `initialsOf()` de `src/app/talks/initials.ts`, déjà utilisé par `TalkCard` et `TalkDetail`.

**Correction** — `readonly initials = computed(() => initialsOf(this.speaker()?.name ?? ''));`

### MINOR · NG-08 · Méthode avec argument dans le template
`src/app/speakers/speaker-spotlight.html:6`

**Problème** — `{{ getInitials(speaker.name) }}` est réévalué à chaque détection (aggravé par `Eager`).

**Correction** — lire le `computed` `initials()` proposé en NG-12.

### MINOR · NG-03 · Injection par constructeur
`src/app/speakers/speaker.service.ts:9`

**Problème** — `constructor(private http: HttpClient)` au lieu d'`inject()`.

**Correction** — `private readonly http = inject(HttpClient);`

### MINOR · NG-05 · `console.log` oublié
`src/app/speakers/speaker.service.ts:12`

**Problème** — trace de débogage livrée en production.

**Correction** — supprimer la ligne.

### MINOR · NG-09 · Formulaire non typé
`src/app/proposals/proposal-form.ts:16`

**Problème** — `UntypedFormBuilder` / `UntypedFormGroup` (l. 27) : les valeurs sont des `any`, d'où le `(track: Track)` annoté à la main l. 52 et `draft: Record<string, unknown>`.

**Correction** — `inject(FormBuilder).nonNullable.group({ title: ['', Validators.required], track: ['Frontend' as Track, …], bio: [''] })`, ou Signal Forms.

### MINOR · NG-10 · Guard écrit en classe
`src/app/proposals/proposal.guard.ts:7`

**Problème** — `implements CanActivate` est déprécié.

**Correction** — `export const proposalsOpen: CanActivateFn = () => Date.now() > CFP_CLOSES_AT.getTime() ? inject(Router).parseUrl('/') : true;`

### MINOR · TEST-03 · Le seul test vérifie la création
`src/app/speakers/speaker-spotlight.spec.ts:21`

**Problème** — `expect(component).toBeTruthy()` ne couvre aucun comportement ; il n'aurait détecté ni NG0203, ni le rendu bloqué, ni la XSS.

**Correction** — avec `HttpTestingController` : répondre à `GET …/speakers/42`, vérifier que le nom s'affiche, et qu'une bio contenant `<img onerror>` est rendue en texte.

### MINOR · TEST-02 · Nouveaux fichiers sans test
`src/app/proposals/proposal-form.ts:1`, `src/app/proposals/proposal.guard.ts:1`, `src/app/speakers/speaker.service.ts:1`

**Problème** — aucun filet sur le formulaire (validation, persistance du brouillon, confirmation), le guard (date de clôture) ni le service.

**Correction** — un `.spec.ts` par fichier sur le comportement principal ; pour le guard, fixer l'horloge (`vi.setSystemTime`) avant et après le 30 novembre.

### INFO · NG-13 · `providedIn: 'root'` dans un nouveau service
`src/app/speakers/speaker.service.ts:5`

**Problème** — Angular 22 déclare un service racine avec `@Service()`.

**Correction** — `@Service() export class SpeakerService { … }`.

### INFO · NG-14 · Photo sans `NgOptimizedImage`
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — la convention du projet (`AGENTS.md`) demande `NgOptimizedImage`.

**Correction** — `<img [ngSrc]="speaker().photoUrl" width="96" height="96" alt="…">`.

### INFO · hors règles · La proposition n'est envoyée nulle part
`src/app/proposals/proposal-form.ts:65`

**Problème** — `submit()` écrit la proposition dans `localStorage` (écrasée à chaque envoi) et affiche « bien enregistrée » ; aucun appel au backend : le comité ne la reçoit jamais. Sans gravité si c'est un bouchon de démo assumé, à confirmer.

**Correction** — si c'est voulu, l'écrire dans un commentaire ; sinon, un `POST` vers `API_BASE_URL` avec gestion d'erreur, et ne vider le brouillon qu'en cas de succès.

## Pistes écartées

- `speaker-spotlight.ts:30` RX-01 : l'abonnement a bien `takeUntilDestroyed`, mais appelé hors contexte → reclassé SIG-04.
- `speaker-spotlight.ts:32` et `:35` RX-01 : appels HTTP qui se terminent seuls ; le vrai problème est l'imbrication → RX-02.
- `proposal-form.ts:52` RX-01 : libéré par `takeUntilDestroyed(this.destroyRef)`, correct.
