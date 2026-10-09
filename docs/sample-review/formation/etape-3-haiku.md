# Revue — lab/speaker-spotlight (35d2f12) → depart (0f3ee22)

**Verdict : à corriger**

La branche ajoute la page speaker (spotlight), le formulaire de proposition de talk, le bouton « Tout ajouter à mes favoris » et un retour visuel sur les favoris. Le risque principal : la page speaker plante dès l'ouverture (`takeUntilDestroyed()` appelé hors contexte d'injection) et affiche la bio via `bypassSecurityTrustHtml`, ce qui ouvre une XSS ; plusieurs écrans restent figés en mode zoneless.

| BLOCKER | MAJOR | MINOR | INFO |
|:---:|:---:|:---:|:---:|
| 5 | 13 | 11 | 0 |

## Findings

### BLOCKER · SIG-04 · La page speaker plante à l'ouverture
`src/app/speakers/speaker-spotlight.ts:30`

**Problème** — `takeUntilDestroyed()` sans argument est appelé dans `ngOnInit`, qui n'est pas un contexte d'injection : Angular lève NG0203 et la route `/speakers/:id` ne s'affiche pas. Le spec ne le voit pas, car il ne déclenche jamais `detectChanges()`, donc `ngOnInit` ne tourne pas.

**Correction** — injecter le `DestroyRef` en champ et le passer explicitement :
```ts
private readonly destroyRef = inject(DestroyRef);
// …
this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(…)
```

### BLOCKER · SEC-01 · Bio affichée sans assainissement (XSS)
`src/app/speakers/speaker-spotlight.ts:34` (et `speaker-spotlight.html:13`)

**Problème** — `bypassSecurityTrustHtml(speaker.bio)` désactive le sanitizer. Or le formulaire de proposition indique que la bio accepte du HTML (`proposal-form.html:35`) : une bio malveillante s'exécute sur la page de chaque visiteur. Règle SEC-01, aussi SEC-03.

**Correction** — ne plus contourner le sanitizer : lier `speaker.bio` en `[innerHTML]` sans `bypassSecurityTrustHtml` (Angular nettoie alors le HTML), supprimer `bioHtml` et `DomSanitizer`. Si la bio doit rester du texte, l'afficher en `{{ speaker.bio }}`.

### BLOCKER · A11Y-02 · Talks cliquables au clic seulement
`src/app/speakers/speaker-spotlight.html:22`

**Problème** — `<div class="talk" (click)="select.emit(talk.id)">` n'est ni focusable ni activable au clavier : la liste des talks du speaker est inaccessible sans souris.

**Correction** — un lien vers le talk, puisque la route `talks/:id` existe :
```html
<a class="talk" [routerLink]="['/talks', talk.id]">
  <h3>{{ talk.title }}</h3>
  <p>…</p>
</a>
```
(Si l'événement `select` doit rester, le faire porter par un `<button>`.)

### BLOCKER · SIG-01 · Message de favoris toujours « Retiré »
`src/app/talks/talk-card.ts:28`

**Problème** — `if (!this.isFavorite)` teste la fonction `input` (toujours truthy), donc `!this.isFavorite` vaut toujours `false` : le message est toujours « Retiré de vos favoris », même lors d'un ajout.

**Correction** — lire le signal : `if (!this.isFavorite())`.

### BLOCKER · A11Y-03 · Titre de la proposition sans label
`src/app/proposals/proposal-form.html:15`

**Problème** — `<input formControlName="title" placeholder="Titre du talk">` n'a que son placeholder ; il disparaît à la saisie et n'est pas toujours annoncé. Le champ est le principal du formulaire.

**Correction** — ajouter un label associé, visible ou `sr-only` :
```html
<label class="sr-only" for="title">Titre du talk</label>
<input id="title" class="proposal__title" formControlName="title" placeholder="Titre du talk" />
```

### MAJOR · ZL-01 · Page speaker figée sur « Chargement » (zoneless)
`src/app/speakers/speaker-spotlight.ts:33-36`

**Problème** — `this.speaker`, `this.bioHtml` et `this.talks` sont des champs ordinaires écrits dans les callbacks HTTP et lus par le template. En zoneless, aucun rendu ne suit la réponse : la page reste sur « Chargement du speaker… ».

**Correction** — en faire des signaux (`speaker = signal<Speaker | null>(null)`, `talks = signal<Talk[]>([])`) et écrire avec `.set()`. Les signaux remplacent aussi le `ChangeDetectionStrategy.Eager` (voir NG-07).

### MAJOR · RX-02 · Abonnements imbriqués
`src/app/speakers/speaker-spotlight.ts:30-37`

**Problème** — `getTalks` est souscrit dans le callback de `getSpeaker`, lui-même dans `paramMap`. Si l'id change vite, les réponses peuvent arriver dans le désordre et afficher le talk d'un autre speaker.

**Correction** — un seul pipeline :
```ts
this.route.paramMap.pipe(
  map((params) => params.get('id') ?? this.speakerId),
  switchMap((id) => this.speakerService.getSpeaker(id)),
  takeUntilDestroyed(this.destroyRef),
).subscribe(…)
```
(`getTalks` s'enchaîne de la même façon, par `switchMap` ou `toSignal`.)

### MAJOR · RX-03 · Erreur HTTP non gérée sur la page speaker
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — sans `error` ni `catchError`, un speaker inconnu ou une API en panne laisse l'écran sur « Chargement » indéfiniment.

**Correction** — un état d'erreur visible (message et lien de retour) à côté de `speaker`.

### MAJOR · RX-01 · Abonnement non libéré dans le formulaire
`src/app/proposals/proposal-form.ts:47`

**Problème** — `this.form.valueChanges.subscribe(...)` ne se termine jamais : il survit au composant. La ligne 52, elle, est correcte.

**Correction** — `this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(…)`.

### MAJOR · SIG-03 · Compteur dérivé par `effect`
`src/app/proposals/proposal-form.ts:37-39`

**Problème** — l'effect écrit `charCount` : le compteur se met à jour un tour trop tard. Le même défaut est corrigé sur `solution/review-fix` (commit 9877d9d, F-013).

**Correction** — `readonly charCount = computed(() => this.abstract().length);` et supprimer l'effect.

### MAJOR · ZL-01 · Confirmation d'envoi jamais affichée (zoneless)
`src/app/proposals/proposal-form.ts:66-68`

**Problème** — `this.submitted = true` dans un `setTimeout` modifie un champ ordinaire lu par `@if (submitted)` : en zoneless, le message « Merci ! » n'apparaît pas. Corrigé sur `solution/review-fix` (commit 7393afe, F-014).

**Correction** — `submitted = signal(false)` ; dans le timeout, `this.submitted.set(true)` (et le template lit `submitted()`).

### MAJOR · SIG-02 · « Tout ajouter aux favoris » sans effet
`src/app/favorites/favorites.store.ts:27-29`

**Problème** — `add` fait `this.ids().push(id)` : le tableau change sans que le signal le sache. Ni le compteur de la nav, ni la liste, ni le `localStorage` (l'effect ne se relance pas) ne voient l'ajout. Le bouton ne fait donc rien de visible.

**Correction** —
```ts
add(id: string): void {
  this.ids.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
}
```

### MAJOR · NG-07 · Détection de changement forcée en Eager
`src/app/speakers/speaker-spotlight.ts:14`

**Problème** — `ChangeDetectionStrategy.Eager` force la vérification à chaque cycle, contre le défaut OnPush de l'équipe (AGENTS.md). Aucune justification n'est écrite.

**Correction** — retirer la ligne `changeDetection` (les signaux de ZL-01 suffisent en OnPush).

### MAJOR · NG-06 · Output nommé comme un événement DOM
`src/app/speakers/speaker-spotlight.ts:18`

**Problème** — `select` est un événement DOM natif : un parent qui écrit `(select)` recevrait l'événement natif et celui du composant. Aucun parent ne le lie aujourd'hui, mais la règle est MAJOR.

**Correction** — `readonly talkSelected = output<string>();` et adapter `select.emit` dans le template.

### MAJOR · NG-11 · Page speaker chargée d'emblée
`src/app/app.routes.ts:3` et `:22`

**Problème** — `component: SpeakerSpotlight` avec un import statique met la page dans le bundle initial, alors que les autres pages sont chargées à la demande. Corrigé sur `solution/review-fix` (commit e4aaa47, F-009).

**Correction** —
```ts
{ path: 'speakers/:id', loadComponent: () => import('./speakers/speaker-spotlight').then((m) => m.SpeakerSpotlight), title: 'Speaker · Conf Planner' },
```
et retirer l'import statique de la ligne 3.

### MAJOR · SEC-02 · URL d'API en dur
`src/app/speakers/speaker.service.ts:7`

**Problème** — `http://localhost:3000/api/speakers` contourne la configuration. Le projet a déjà le token `API_BASE_URL` (`src/app/core/api-base-url.ts`), utilisé par `talks.store.ts:9`.

**Correction** — injecter `API_BASE_URL` comme `talks.store.ts` le fait, et construire `baseUrl` à partir de lui.

### MAJOR · TEST-01 · Test focalisé qui masque la suite
`src/app/speakers/speaker-spotlight.spec.ts:20`

**Problème** — `it.only` fait tourner ce seul test ; le reste de la suite est ignoré.

**Correction** — `it('should create', …)`, ou retirer le `.only`.

### MAJOR · A11Y-01 · Photo du speaker sans alt
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — `<img [src]="speaker.photoUrl">` sans `alt` : le lecteur d'écran annonce le nom du fichier, ou rien.

**Correction** — `alt="Portrait de {{ speaker.name }}"`.

### MINOR · NG-01 · Directives structurelles dépréciées
`src/app/speakers/speaker-spotlight.html:3,5,6,22` et `speaker-spotlight.ts:11`

**Problème** — `*ngIf`, `*ngFor`, `NgIf`/`NgFor` dans les imports.

**Correction** — `@if (speaker) { … } @else { … }`, `@for (talk of talks(); track talk.id) { … }`, retirer `NgIf`/`NgFor`.

### MINOR · NG-02 · @Input / @Output décorateurs
`src/app/speakers/speaker-spotlight.ts:17-18`

**Problème** — `@Input()` et `@Output()` plutôt que `input()` / `output()`. `speakerId` n'est d'ailleurs jamais lié par le router.

**Correction** — `readonly speakerId = input<string>();` et `output()` (voir NG-06).

### MINOR · NG-04 · Type `any`
`src/app/speakers/speaker-spotlight.ts:20-21`, `src/app/speakers/speaker.service.ts:11,16`

**Problème** — `speaker: any`, `talks: any[]`, `Observable<any>` : la forme des données n'est pas contrôlée.

**Correction** — utiliser `Speaker` / `Talk` de `talks/talk.model.ts` (vérifier que les champs `bio`, `photoUrl`, `handle` existent) ; sinon une interface dédiée au speaker.

### MINOR · NG-05 · Trace de débogage oubliée
`src/app/speakers/speaker.service.ts:12`

**Problème** — `console.log('getSpeaker', id)` part en production.

**Correction** — supprimer la ligne.

### MINOR · NG-03 · Injection par constructeur
`src/app/speakers/speaker.service.ts:9`

**Problème** — `constructor(private http: HttpClient)` au lieu de la convention `inject()`.

**Correction** — `private readonly http = inject(HttpClient);`.

### MINOR · NG-12 · Utilitaire dupliqué (initiales)
`src/app/speakers/speaker-spotlight.ts:42-48` et `speaker-spotlight.html:6`

**Problème** — `getInitials` refait `initialsOf` (`src/app/talks/initials.ts`), et l'appel dans le template est une méthode avec argument (NG-08).

**Correction** — importer `initialsOf`, exposer `initials = computed(() => initialsOf(this.speaker()?.name ?? ''))` et l'afficher dans le template.

### MINOR · NG-10 · Guard écrit en classe
`src/app/proposals/proposal.guard.ts:6-7`

**Problème** — `implements CanActivate` : les guards en classe sont dépréciés ; une fonction se teste seule.

**Correction** — `export const proposalsOpen: CanActivateFn = () => Date.now() > CFP_CLOSES_AT.getTime() ? inject(Router).parseUrl('/') : true;`, et mettre à jour `app.routes.ts:26`.

### MINOR · NG-09 · Formulaire non typé
`src/app/proposals/proposal-form.ts:3,16,27`

**Problème** — `UntypedFormBuilder` / `UntypedFormGroup` renvoient des `any`.

**Correction** — `inject(FormBuilder).nonNullable.group({ … })` avec `FormGroup` typé.

### MINOR · NG-14 · Image sans NgOptimizedImage
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — la règle est INFO, mais `AGENTS.md` liste `NgOptimizedImage` comme convention de l'équipe : gravité relevée à MINOR pour ce motif.

**Correction** — `<img [ngSrc]="speaker.photoUrl" width="80" height="80" alt="…">` avec `NgOptimizedImage` dans les imports.

### MINOR · TEST-02 · Nouveaux fichiers sans spec
`src/app/proposals/proposal-form.ts:1`, `src/app/proposals/proposal.guard.ts:1`, `src/app/speakers/speaker.service.ts:1`

**Problème** — trois fichiers ajoutés sans `.spec.ts`. La logique de garde (date de clôture) et de formulaire (confirmation, brouillon) n'est couverte par rien.

**Correction** — un test par fichier : la garde renvoie `/` après le 30 novembre, le formulaire affiche la confirmation, le service appelle la bonne URL via `HttpTestingController`.

### MINOR · TEST-03 · Spec qui ne vérifie que la création, avec un vrai HttpClient
`src/app/speakers/speaker-spotlight.spec.ts:13,21`

**Problème** — une seule assertion `toBeTruthy()`, et `provideHttpClient()` réel. La règle TEST-04 est MAJOR, mais aucune requête ne part ici (`ngOnInit` n'est jamais exécuté) : gravité ramenée à MINOR pour ce motif, à remonter dès qu'un `detectChanges()` est ajouté.

**Correction** — tester un rendu (nom du speaker affiché) avec `provideHttpClientTesting()` et `HttpTestingController`.
