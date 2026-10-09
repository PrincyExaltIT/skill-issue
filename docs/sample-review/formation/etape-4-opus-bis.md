# Revue — lab/speaker-spotlight → depart

**Verdict : à corriger**

La branche ajoute la page speaker (`/speakers/:id`), le formulaire de proposition de talk (`/proposals`) avec son guard, un lien speaker et un retour « ajouté / retiré » sur la carte de talk, et `FavoritesStore.add()`. Le risque principal : la page speaker plante à l'ouverture (NG0203), et une fois ce bug corrigé elle exposerait une XSS stockée via la bio ; elle appelle en plus une API `localhost:3000` qui n'existe pas dans le projet.

| BLOCKER | MAJOR | MINOR | INFO |
|:---:|:---:|:---:|:---:|
| 5 | 12 | 16 | 2 |

> Ni les tests ni le build n'ont été lancés : `node_modules` est absent de ce worktree. Les findings viennent de la lecture du code.

## Findings

### BLOCKER · SIG-04 · La page speaker plante dès l'ouverture
`src/app/speakers/speaker-spotlight.ts:30`

**Problème** — `takeUntilDestroyed()` est appelé sans argument dans `ngOnInit`, hors contexte d'injection : Angular lève NG0203 à l'exécution. Tout clic sur un nom de speaker (nouveau lien de `talk-card.html:28`) mène à une page qui ne s'affiche pas. Le spec ne le voit pas, parce qu'il n'appelle jamais `fixture.detectChanges()` et que `ngOnInit` ne s'exécute donc pas.

**Correction** — injecter `private readonly destroyRef = inject(DestroyRef);` et écrire `.pipe(takeUntilDestroyed(this.destroyRef))`. Mieux encore : déplacer l'abonnement dans un initialiseur de champ via `toSignal` (voir RX-02).

### BLOCKER · SEC-01 · XSS stockée via la bio du speaker
`src/app/speakers/speaker-spotlight.ts:34`

**Problème** — `bypassSecurityTrustHtml(speaker.bio)`, puis `[innerHTML]="bioHtml"` (`speaker-spotlight.html:13`), insère la bio venue de l'API sans aucun nettoyage. Le formulaire de proposition encourage justement à saisir du HTML dans la bio (« HTML autorisé… la bio s'affiche sur votre page speaker », `proposal-form.html:35`) : un `<img src=x onerror=…>` s'exécutera chez chaque visiteur. Le modèle `Speaker` dit pourtant que `bio` est du « texte brut : toujours affiché par interpolation, jamais comme HTML ». Retirer seulement le bypass laisserait un `[innerHTML]` alimenté par une saisie utilisateur (SEC-03).

**Correction** — afficher la bio en texte et supprimer `bioHtml` et `DomSanitizer` :
```html
<p class="spotlight__bio">{{ speaker.bio }}</p>
```
et retirer la mention « HTML autorisé » de `proposal-form.html:35`.

### BLOCKER · A11Y-02 · Les talks du speaker ne sont ni focusables ni utilisables au clavier, et le clic ne fait rien
`src/app/speakers/speaker-spotlight.html:22`

**Problème** — `<div class="talk" (click)="select.emit(talk.id)">` ne prend pas le focus et ne réagit pas au clavier. De plus, `SpeakerSpotlight` est un composant routé : aucun parent n'écoute `select`, donc le clic n'a aucun effet, même à la souris.

**Correction** — le besoin est une navigation, donc un lien :
```html
@for (talk of talks(); track talk.id) {
  <a class="talk" [routerLink]="['/talks', talk.id]">
    <h3>{{ talk.title }}</h3>
    <p>{{ talk.start | date: 'EEE d MMM · HH:mm' }} · {{ talk.room }}</p>
  </a>
}
```
et supprimer l'output `select` (voir NG-06).

### BLOCKER · A11Y-03 · Le titre du talk n'a pas de label
`src/app/proposals/proposal-form.html:15`

**Problème** — `<input formControlName="title" placeholder="Titre du talk">` n'a ni `<label for>` ni `aria-label`. Le placeholder disparaît dès la saisie et n'est pas toujours annoncé : c'est pourtant le seul champ obligatoire du formulaire.

**Correction** —
```html
<div class="field">
  <label for="title">Titre du talk</label>
  <input id="title" class="proposal__title" formControlName="title" />
</div>
```

### BLOCKER · SIG-01 · Le retour affiche toujours « Retiré de vos favoris »
`src/app/talks/talk-card.ts:28`

**Problème** — `if (!this.isFavorite)` teste la fonction `input`, toujours vraie, donc la condition est toujours fausse. Chaque ajout annonce « Retiré de vos favoris », et comme `talk-card.html:3` est un `role="status"`, les lecteurs d'écran annoncent l'état inverse.

**Correction** — `if (!this.isFavorite()) {`

### MAJOR · RX-02 · Abonnements HTTP imbriqués dans `paramMap`
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — `getSpeaker(id).subscribe` est appelé dans `paramMap.subscribe`, et `getTalks().subscribe` dans le premier (ligne 35). En passant d'un speaker à l'autre (la route réutilise le composant), les requêtes précédentes ne sont pas annulées : la bio d'un speaker peut s'afficher avec les talks d'un autre.

**Correction** — un seul flux, exposé en signal :
```ts
private readonly speakerId$ = inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('id')!));
readonly speaker = toSignal(this.speakerId$.pipe(switchMap((id) => this.speakerService.getSpeaker(id))));
readonly talks = toSignal(this.speakerId$.pipe(switchMap((id) => this.speakerService.getTalks(id))), { initialValue: [] });
```
ou un `httpResource()` piloté par un `input()` `id` (le projet a `withComponentInputBinding()`).

### MAJOR · ZL-01 · La page reste sur « Chargement du speaker… »
`src/app/speakers/speaker-spotlight.ts:33`

**Problème** — `this.speaker = speaker` (et `this.bioHtml`, ligne 34, et `this.talks`, ligne 36) sont des champs ordinaires affectés dans un callback HTTP. L'application est zoneless : rien ne déclenche de rendu à l'arrivée de la réponse, et `Eager` n'y change rien (il ne fait que vérifier le composant *quand* un cycle a lieu). La page reste sur « Chargement… » jusqu'à ce qu'un autre événement survienne.

**Correction** — passer `speaker` et `talks` en signals : avec `toSignal` (voir RX-02), ou `signal()` + `.set()`.

### MAJOR · RX-03 · Aucune gestion d'erreur sur le chargement du speaker
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — ni `catchError` ni état d'erreur : un 404 ou une API injoignable (le cas aujourd'hui, voir SEC-02) laisse l'utilisateur sur « Chargement du speaker… » sans fin ni action possible.

**Correction** — un état d'erreur affiché, par exemple avec `httpResource` :
```html
@if (speaker.error()) {
  <p class="status" role="alert">Speaker introuvable. <a routerLink="/">Retour au programme</a></p>
}
```

### MAJOR · NG-07 · Détection de changement forcée en `Eager` sans justification
`src/app/speakers/speaker-spotlight.ts:14`

**Problème** — `ChangeDetectionStrategy.Eager` fait vérifier le composant à chaque cycle, sans commentaire qui le justifie. Il ressemble à une tentative de contourner ZL-01, mais il ne la corrige pas.

**Correction** — supprimer la ligne une fois l'état passé en signals.

### MAJOR · NG-06 · Output nommé `select`, comme l'événement DOM
`src/app/speakers/speaker-spotlight.ts:18`

**Problème** — `@Output() select` porte le nom de l'événement natif `select` : un parent qui écrirait `(select)` recevrait aussi l'événement DOM. Ici l'output n'est de toute façon écouté par personne (composant routé).

**Correction** — le supprimer au profit d'un lien (voir A11Y-02). S'il doit rester : `readonly talkSelected = output<string>();`

### MAJOR · A11Y-01 · Photo du speaker sans `alt`
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — `<img [src]="speaker.photoUrl">` n'a pas d'`alt` : un lecteur d'écran lit le nom du fichier.

**Correction** — `[alt]="'Portrait de ' + speaker.name"`, ou `alt=""` si le nom affiché juste à côté suffit.

### MAJOR · SEC-02 · URL d'API en dur vers `localhost:3000`
`src/app/speakers/speaker.service.ts:7`

**Problème** — `'http://localhost:3000/api/speakers'` ignore le token `API_BASE_URL` (`src/app/core/api-base-url.ts`, valeur par défaut `/data`) que `TalksStore` utilise déjà. Aucun serveur ne répond sur cette adresse, ni en dev ni en prod : la page speaker ne peut charger nulle part.

**Correction** — `private readonly baseUrl = inject(API_BASE_URL);` Les données existent déjà côté client : `TalksStore.speakersById()` et `TalksStore.schedule()` filtré sur `speakerId` suffisent, sans nouvel appel HTTP.

### MAJOR · NG-11 · La page speaker est dans le bundle initial
`src/app/app.routes.ts:22`

**Problème** — `component: SpeakerSpotlight` (avec l'import statique de la ligne 3) charge la page d'emblée, alors que toutes les autres routes sont chargées à la demande.

**Correction** — `loadComponent: () => import('./speakers/speaker-spotlight').then((m) => m.SpeakerSpotlight)` et supprimer l'import de la ligne 3 (ou `export default class` pour s'aligner sur les autres pages).

### MAJOR · SIG-02 · « Tout ajouter à mes favoris » ne met rien à jour et n'est pas sauvegardé
`src/app/favorites/favorites.store.ts:28`

**Problème** — `this.ids().push(id)` modifie le tableau en place sans changer sa référence : ni le compteur « Mes favoris » ni les cartes ne se mettent à jour, et l'`effect` de persistance ne se relance pas, donc les ajouts sont perdus au rechargement. En plus, `add` ne vérifie pas les doublons : un talk déjà favori est ajouté deux fois.

**Correction** —
```ts
add(id: string): void {
  this.ids.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
}
```

### MAJOR · SIG-03 · `charCount` dérivé par un `effect`
`src/app/proposals/proposal-form.ts:38`

**Problème** — `effect(() => this.charCount.set(this.abstract().length))` dérive un état avec un effect : le compteur est mis à jour un tour trop tard, et ce schéma ouvre la porte aux boucles.

**Correction** — `readonly charCount = computed(() => this.abstract().length);` et supprimer l'effect (celui de la ligne 41, qui écrit dans `localStorage`, est légitime).

### MAJOR · ZL-01 · Le message de confirmation ne s'affiche jamais
`src/app/proposals/proposal-form.ts:67`

**Problème** — `this.submitted = true` dans un `setTimeout`, sur un champ ordinaire lu par le template (`proposal-form.html:9`). L'application est zoneless et le composant en OnPush : aucun rendu n'est déclenché. L'utilisateur clique sur « Envoyer », rien ne se passe, et il risque de renvoyer.

**Correction** — `submitted = signal(false);`, `this.submitted.set(true)`, et `@if (submitted())` dans le template. Le `setTimeout` de 300 ms n'a pas de raison d'être.

### MAJOR · TEST-01 · Test focalisé avec `it.only`
`src/app/speakers/speaker-spotlight.spec.ts:20`

**Problème** — `it.only` : en CI (`CI=true`), Vitest échoue ; en local, seuls les tests focalisés tournent.

**Correction** — `it('should create', …)`

### MINOR · NG-01 · `*ngIf` / `*ngFor` au lieu du control flow natif
`src/app/speakers/speaker-spotlight.html:3`

**Problème** — directives structurelles dépréciées, aussi lignes 5, 6 et 22, plus `NgIf` / `NgFor` importés dans `speaker-spotlight.ts:11`. AGENTS.md impose le control flow natif.

**Correction** — `@if (speaker(); as speaker) { … } @else { <p class="status">Chargement du speaker…</p> }`, `@for (talk of talks(); track talk.id)`, puis retirer `NgIf` et `NgFor` des imports.

### MINOR · NG-02 · `@Input` / `@Output` au lieu de `input()` / `output()`
`src/app/speakers/speaker-spotlight.ts:17`

**Problème** — `@Input() speakerId` et `@Output() select = new EventEmitter` (ligne 18). `speakerId` ne sert qu'en repli si la route n'a pas d'`id`, ce qui n'arrive jamais sur `speakers/:id`.

**Correction** — `readonly id = input.required<string>();`, alimenté par la route grâce à `withComponentInputBinding()`.

### MINOR · NG-04 · `any` pour le speaker et ses talks
`src/app/speakers/speaker-spotlight.ts:20`

**Problème** — `speaker: any` et `talks: any[]` (ligne 21). La preuve du coût : le template lit `speaker.photoUrl`, qui n'existe pas dans `Speaker`, et la compilation ne dit rien. La branche `<img>` n'est jamais rendue.

**Correction** — typer avec `Speaker` et `Talk` de `talks/talk.model.ts`, et ajouter `photoUrl` au modèle si la photo est voulue.

### MINOR · NG-12 · `getInitials` duplique `initialsOf`
`src/app/speakers/speaker-spotlight.ts:42`

**Problème** — `getInitials` refait `initialsOf` (`talks/initials.ts`), en moins robuste : pas de limite à deux lettres, et les espaces multiples ne sont pas gérés. Il est en plus appelé avec un argument dans le template (`speaker-spotlight.html:6`, NG-08), donc recalculé à chaque cycle, et chaque cycle compte en `Eager`.

**Correction** — `protected readonly initials = computed(() => initialsOf(this.speaker()?.name ?? ''));` puis `{{ initials() }}`.

### MINOR · NG-14 · Photo sans `NgOptimizedImage`
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — `<img [src]>` au lieu de `ngSrc`. Gravité relevée d'INFO à MINOR : AGENTS.md impose `NgOptimizedImage` pour les images.

**Correction** — `<img [ngSrc]="speaker.photoUrl" width="96" height="96" …>` et importer `NgOptimizedImage`.

### MINOR · NG-04 · `Observable<any>` dans `SpeakerService`
`src/app/speakers/speaker.service.ts:11`

**Problème** — `getSpeaker` et `getTalks` (ligne 16) renvoient `Observable<any>` : les composants perdent le contrat des données.

**Correction** — `this.http.get<Speaker>(…)` et `this.http.get<Talk[]>(…)`.

### MINOR · NG-03 · Injection par constructeur
`src/app/speakers/speaker.service.ts:9`

**Problème** — `constructor(private http: HttpClient)`, alors que la convention du projet est `inject()`.

**Correction** — `private readonly http = inject(HttpClient);`

### MINOR · NG-05 · `console.log` oublié
`src/app/speakers/speaker.service.ts:12`

**Problème** — `console.log('getSpeaker', id)` part en production.

**Correction** — supprimer la ligne.

### MINOR · TEST-03 · Le spec ne vérifie que la création
`src/app/speakers/speaker-spotlight.spec.ts:21`

**Problème** — seule assertion : `expect(component).toBeTruthy()`, sans `detectChanges()`. Le spec passe alors que la page plante à l'ouverture (SIG-04).

**Correction** — `provideHttpClientTesting()`, une route avec `id`, `fixture.detectChanges()`, puis vérifier le nom rendu et l'affichage de la bio en texte (`<b>` visible, pas interprété).

### MINOR · RX-01 · `valueChanges` souscrit sans `takeUntilDestroyed`
`src/app/proposals/proposal-form.ts:47`

**Problème** — `this.form.valueChanges.subscribe(v => this.draft = v)` n'est pas libéré. Gravité abaissée de MAJOR à MINOR : la source est le formulaire du composant, détruit avec lui, donc pas de fuite réelle. Mais l'abonnement est incohérent avec celui de la ligne 52 et inutile : `draft` ne sert qu'à `submit()`.

**Correction** — supprimer `draft` et l'abonnement, et écrire dans `submit()` : `const proposal = { ...this.form.getRawValue(), abstract: this.abstract() };`

### MINOR · NG-09 · Formulaire non typé
`src/app/proposals/proposal-form.ts:16`

**Problème** — `UntypedFormBuilder` / `UntypedFormGroup` (lignes 3 et 27) : `track` sort en `any`, d'où le `(track: Track)` forcé à la ligne 52.

**Correction** — `inject(FormBuilder).nonNullable.group({ title: ['', Validators.required], track: ['Frontend' as Track, Validators.required], bio: [''] })`, ou Signal Forms.

### MINOR · hors règles · La limite de 600 caractères n'est pas appliquée
`src/app/proposals/proposal-form.html:29`

**Problème** — le compteur affiche « / 600 caractères », mais rien n'empêche un résumé plus long : ni `maxlength` sur le `<textarea>`, ni contrôle dans `submit()`.

**Correction** — `maxlength="600"` sur le textarea, ou un refus dans `submit()` si `this.abstract().length > 600`, avec un message.

### MINOR · NG-10 · Guard écrit en classe
`src/app/proposals/proposal.guard.ts:7`

**Problème** — `implements CanActivate` est déprécié.

**Correction** —
```ts
export const proposalsOpen: CanActivateFn = () =>
  Date.now() > CFP_CLOSES_AT.getTime() ? inject(Router).parseUrl('/') : true;
```

### MINOR · TEST-02 · `SpeakerService` sans test
`src/app/speakers/speaker.service.ts:1`

**Problème** — nouveau service sans `.spec.ts`.

**Correction** — un test avec `HttpTestingController` qui vérifie l'URL appelée (il aurait attrapé SEC-02).

### MINOR · TEST-02 · `ProposalForm` sans test
`src/app/proposals/proposal-form.ts:1`

**Problème** — nouveau composant sans `.spec.ts`.

**Correction** — un test qui soumet le formulaire et vérifie le message de confirmation (il aurait attrapé ZL-01), plus un test du titre obligatoire.

### MINOR · TEST-02 · `ProposalGuard` sans test
`src/app/proposals/proposal.guard.ts:1`

**Problème** — nouveau guard sans `.spec.ts`.

**Correction** — deux tests avec `vi.setSystemTime` : avant et après le 30 novembre.

### INFO · NG-13 · `@Injectable({ providedIn: 'root' })` dans un nouveau service
`src/app/speakers/speaker.service.ts:5`

**Problème** — la règle de l'équipe préfère `@Service()` pour un service racine en Angular 22.

**Correction** — `@Service() export class SpeakerService { … }`, si le service est conservé (voir SEC-02 : `TalksStore` suffit peut-être).

### INFO · hors règles · La proposition ne quitte pas le navigateur
`src/app/proposals/proposal-form.ts:65`

**Problème** — `submit()` écrit seulement dans `localStorage`, alors que l'écran annonce « Merci ! Votre proposition a bien été enregistrée » et une relecture par le comité. Pour une démo sans backend, c'est sans doute voulu, mais mieux vaut le savoir avant de merger.

**Correction** — à confirmer. Sinon, un `POST` vers `${API_BASE_URL}/proposals` avec un état d'erreur.

## Écartés à la vérification

- `src/app/speakers/speaker-spotlight.ts:30` · RX-01 — `takeUntilDestroyed` est bien présent : pas de fuite. Le vrai problème est NG0203 (SIG-04).
- `src/app/speakers/speaker-spotlight.ts:32`, `:35` · RX-01 — appels `HttpClient` qui se terminent seuls ; l'imbrication est couverte par RX-02.
- `src/app/proposals/proposal-form.ts:52` · RX-01 — `takeUntilDestroyed(this.destroyRef)` avec un `DestroyRef` injecté : valide dans `ngOnInit`.
- `src/app/proposals/proposal-form.ts:41` · SIG-03 — l'effect écrit dans `localStorage` : effet de bord légitime.
- `src/app/proposals/proposal-form.ts:20` — `localStorage` lu à l'initialisation d'un signal : acceptable, le projet n'a pas `@angular/ssr`.
- `src/app/proposals/proposal-form.ts:65` · SEC-05 — brouillon d'un formulaire public (titre, résumé, bio publique) : pas une donnée sensible.
- `src/app/speakers/speaker-spotlight.spec.ts:13` · TEST-04 — `provideHttpClient()` réel, mais le test n'appelle pas `detectChanges()` : aucune requête ne part. À remplacer par `provideHttpClientTesting()` en corrigeant TEST-03.
- `src/app/speakers/speaker-spotlight.html:13` · SEC-03 — même problème que SEC-01 (bio en `[innerHTML]`), fusionné dans ce finding.
- `src/app/speakers/speaker-spotlight.html:6` · NG-08 — même correction que NG-12, fusionné dans ce finding.
- `src/app/speakers/speaker-spotlight.ts:18` · NG-02 — même ligne que NG-06, fusionné dans le finding NG-02 de la ligne 17.
- `src/app/talks/talk-card.html:3` · A11Y-04 — le retour est bien annoncé (`role="status"`).
