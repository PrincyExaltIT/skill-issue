# Revue — lab/speaker-spotlight → depart

**Verdict : à corriger**

La branche ajoute une page speaker (`/speakers/:id`), un formulaire de proposition de talk protégé par un guard, un retour « ajouté / retiré » sur la carte de talk et un `add()` dans le store des favoris. Le risque principal est une XSS stockée : la bio, présentée comme « HTML autorisé » dans le formulaire, est injectée sans nettoyage dans la page speaker. Cette même page plante aussi à l'ouverture (NG0203).

| BLOCKER | MAJOR | MINOR | INFO |
|:---:|:---:|:---:|:---:|
| 5 | 13 | 14 | 2 |

## Findings

### BLOCKER · SEC-01 · XSS stockée via la bio du speaker
`src/app/speakers/speaker-spotlight.ts:34`

**Problème** — `this.sanitizer.bypassSecurityTrustHtml(speaker.bio)` désactive le nettoyage d'Angular, et le résultat est injecté par `[innerHTML]="bioHtml"` (`src/app/speakers/speaker-spotlight.html:13`). La bio vient de l'utilisateur : le formulaire de proposition annonce « HTML autorisé (gras, liens…) : la bio s'affiche sur votre page speaker » (`src/app/proposals/proposal-form.html:35`). Une bio contenant `<img src=x onerror=…>` exécute du script chez chaque visiteur de la page speaker. Le modèle `Speaker` précise pourtant « Texte brut : toujours affiché par interpolation, jamais comme HTML » (`src/app/talks/talk.model.ts:22`).

**Correction** — Afficher la bio en texte et retirer la promesse de HTML dans le formulaire :
```html
<p class="spotlight__bio">{{ speaker.bio }}</p>
```
Supprimer `bioHtml`, `DomSanitizer` et `SafeHtml`, et remplacer l'indication du champ bio par « Texte brut ».

### BLOCKER · SIG-04 · La page speaker plante à l'ouverture (NG0203)
`src/app/speakers/speaker-spotlight.ts:30`

**Problème** — `takeUntilDestroyed()` est appelé sans argument dans `ngOnInit`, qui n'est pas un contexte d'injection. Angular lève NG0203 à l'exécution : tout clic sur un nom de speaker (nouveau lien dans `talk-card.html:28`) mène à une page cassée. Le test ne le voit pas, car il n'appelle jamais `detectChanges()` (voir TEST-03).

**Correction** — Passer un `DestroyRef` injecté, ou mieux, sortir de `ngOnInit` (voir RX-02) :
```ts
private readonly destroyRef = inject(DestroyRef);
// …
this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef))
```

### BLOCKER · A11Y-02 · Talks du speaker cliquables à la souris seulement, et le clic ne mène nulle part
`src/app/speakers/speaker-spotlight.html:22`

**Problème** — `<div class="talk" (click)="select.emit(talk.id)">` ne prend pas le focus et ne réagit pas au clavier. De plus, le composant est chargé par une route : personne n'écoute l'output `select`, donc le clic ne fait rien, même à la souris.

**Correction** — C'est une navigation, donc un lien :
```html
@for (talk of talks(); track talk.id) {
  <a class="talk" [routerLink]="['/talks', talk.id]">
    <h3>{{ talk.title }}</h3>
    <p>{{ talk.start | date: 'EEE d MMM · HH:mm' }} · {{ talk.room }}</p>
  </a>
}
```
Ensuite, supprimer l'output `select`.

### BLOCKER · A11Y-03 · Champ « Titre du talk » sans label
`src/app/proposals/proposal-form.html:15`

**Problème** — `<input class="proposal__title" formControlName="title" placeholder="Titre du talk" />` n'a ni `<label for>` ni `aria-label`. Le placeholder disparaît à la saisie et un lecteur d'écran n'annonce pas toujours le champ, alors que c'est le seul champ obligatoire du formulaire.

**Correction** —
```html
<label for="title" class="sr-only">Titre du talk</label>
<input id="title" class="proposal__title" formControlName="title" placeholder="Titre du talk" />
```

### BLOCKER · SIG-01 · Le retour « Ajouté à vos favoris » ne s'affiche jamais
`src/app/talks/talk-card.ts:28`

**Problème** — `if (!this.isFavorite)` teste la fonction `input`, toujours vraie : la condition est toujours fausse. Quand on ajoute un talk, le message annoncé (`role="status"`) est « Retiré de vos favoris », soit l'inverse de l'action.

**Correction** — `if (!this.isFavorite())`, ou :
```ts
this.feedback.set(this.isFavorite() ? 'Retiré de vos favoris' : 'Ajouté à vos favoris');
```

### MAJOR · RX-02 · Trois abonnements imbriqués pour charger un speaker
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — `getSpeaker(id).subscribe` est imbriqué dans `paramMap.subscribe`, et `getTalks(...).subscribe` (ligne 35) dans le premier. Quand on passe d'un speaker à un autre, la requête précédente n'est pas annulée : les réponses peuvent arriver dans le désordre et afficher la bio d'un speaker avec les talks d'un autre.

**Correction** — Les données existent déjà dans `TalksStore` (speakers et talks chargés via `httpResource`). Le plus simple est de dériver l'état, sans aucun abonnement :
```ts
readonly id = input.required<string>(); // withComponentInputBinding lie :id
private readonly store = inject(TalksStore);
protected readonly speaker = computed(() => this.store.speakersById().get(this.id()));
protected readonly talks = computed(() =>
  this.store.schedule().filter((talk) => talk.speakerId === this.id()),
);
```
À défaut : un seul flux `paramMap.pipe(switchMap(...), takeUntilDestroyed(this.destroyRef))`.

### MAJOR · ZL-01 · Le speaker chargé ne s'affiche pas (zoneless)
`src/app/speakers/speaker-spotlight.ts:33`

**Problème** — `this.speaker = speaker` (et `this.talks = talks`, ligne 36) sont des champs ordinaires modifiés dans un callback `subscribe`. L'application est zoneless, donc aucun rendu n'est déclenché : la page reste sur « Chargement du speaker… » jusqu'à une interaction. `ChangeDetectionStrategy.Eager` n'y change rien (voir NG-07). Le problème est aujourd'hui masqué par le plantage NG0203.

**Correction** — Des `computed` sur le store (voir RX-02), ou `speaker = signal<Speaker | undefined>(undefined)` avec `.set()`.

### MAJOR · RX-03 · Erreur de chargement non gérée : chargement infini
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — Aucun callback d'erreur ni `catchError` sur `getSpeaker` ni `getTalks`. Avec l'URL actuelle (voir SEC-02), la requête échoue partout : l'utilisateur voit « Chargement du speaker… » indéfiniment, sans message ni action possible. Un id inconnu donne le même résultat.

**Correction** — Lire l'état du store (`this.store.talks.error()`, `isLoading()`) et afficher un état explicite :
```html
@if (speaker(); as speaker) { … }
@else if (talksState.isLoading()) { <p class="status">Chargement du speaker…</p> }
@else { <p class="status" role="alert">Speaker introuvable. <a routerLink="/">Retour au programme</a></p> }
```

### MAJOR · NG-07 · `ChangeDetectionStrategy.Eager` forcé sans justification
`src/app/speakers/speaker-spotlight.ts:14`

**Problème** — Le composant est vérifié à chaque cycle, alors que OnPush est le défaut en Angular 22. Ce réglage ressemble à une tentative de contourner ZL-01, mais il ne la corrige pas.

**Correction** — Supprimer la ligne `changeDetection` une fois l'état passé en signals.

### MAJOR · NG-06 · Output nommé `select`, comme l'événement DOM
`src/app/speakers/speaker-spotlight.ts:18`

**Problème** — `@Output() select` porte le nom d'un événement natif : un parent qui écrit `(select)` recevrait aussi l'événement DOM `select`.

**Correction** — Supprimer l'output (voir A11Y-02). S'il est nécessaire, le renommer `readonly talkSelected = output<string>();`.

### MAJOR · A11Y-01 · Photo du speaker sans `alt`
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — `<img … [src]="speaker.photoUrl" />` n'a pas d'attribut `alt` : un lecteur d'écran lit le nom du fichier ou rien.

**Correction** — `[alt]="'Portrait de ' + speaker.name"`. Remarque : `photoUrl` n'existe pas dans le modèle `Speaker`, à ajouter au modèle ou à retirer.

### MAJOR · SEC-02 · URL d'API en dur vers `localhost:3000`
`src/app/speakers/speaker.service.ts:7`

**Problème** — `'http://localhost:3000/api/speakers'` contourne le token `API_BASE_URL` (`src/app/core/api-base-url.ts`). De plus, le projet n'a ni backend, ni proxy, ni endpoint `/api/speakers/:id` ou `/talks` : les données sont `public/data/speakers.json` et `talks.json`. La page ne peut donc charger dans aucun environnement.

**Correction** — Supprimer `SpeakerService` et lire `TalksStore` (voir RX-02). S'il doit rester : `private readonly baseUrl = inject(API_BASE_URL);` et des URL qui existent.

### MAJOR · SIG-02 · `add()` modifie le tableau du signal en place
`src/app/favorites/favorites.store.ts:28`

**Problème** — `this.ids().push(id)` change le tableau sans changer sa référence. Conséquences : le compteur « Mes favoris » ne bouge pas, la liste filtrée et les étoiles restent périmées, et l'`effect` de persistance ne se relance pas, donc les favoris sont perdus au rechargement. `add()` ne vérifie pas non plus les doublons. Le bouton « Tout ajouter à mes favoris » (`speaker-spotlight.ts:51`) est l'appelant.

**Correction** —
```ts
add(id: string): void {
  this.ids.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
}
```

### MAJOR · NG-11 · Page speaker chargée dans le bundle initial
`src/app/app.routes.ts:22`

**Problème** — `component: SpeakerSpotlight`, avec l'import statique de la ligne 3, alors que toutes les autres routes utilisent `loadComponent`.

**Correction** — `loadComponent: () => import('./speakers/speaker-spotlight').then((m) => m.SpeakerSpotlight)`, ou `export default` comme les autres pages, puis supprimer l'import de la ligne 3.

### MAJOR · RX-01 · `valueChanges` jamais libéré
`src/app/proposals/proposal-form.ts:47`

**Problème** — `this.form.valueChanges.subscribe(v => this.draft = v)` n'a pas de `takeUntilDestroyed`. `valueChanges` ne se termine jamais : un abonnement survit à chaque visite de la page.

**Correction** — Supprimer `draft` et lire la valeur à l'envoi : `const proposal = { ...this.form.getRawValue(), abstract: this.abstract() };`. À défaut : `.pipe(takeUntilDestroyed(this.destroyRef))`.

### MAJOR · SIG-03 · `effect()` qui dérive le compteur de caractères
`src/app/proposals/proposal-form.ts:38`

**Problème** — `effect(() => this.charCount.set(this.abstract().length))` met le compteur à jour un tour trop tard et ouvre la porte aux boucles.

**Correction** — `readonly charCount = computed(() => this.abstract().length);`, puis supprimer le premier `effect`. Le second, qui écrit dans `localStorage`, est légitime.

### MAJOR · ZL-01 · La confirmation d'envoi ne s'affiche pas (zoneless)
`src/app/proposals/proposal-form.ts:67`

**Problème** — `this.submitted = true` est affecté dans un `setTimeout`. Sans zone.js, aucun rendu ne suit : le message « Merci ! Votre proposition a bien été enregistrée. » n'apparaît pas, et l'utilisateur risque de renvoyer le formulaire.

**Correction** — `readonly submitted = signal(false);`, `this.submitted.set(true);`, et `@if (submitted())` dans le template.

### MAJOR · TEST-01 · `it.only` dans la spec du speaker
`src/app/speakers/speaker-spotlight.spec.ts:20`

**Problème** — Avec `CI=true`, Vitest échoue. Sans, seul ce test tourne et le reste de la suite passe sans rien vérifier.

**Correction** — `it('…', …)`.

### MINOR · NG-01 · Directives structurelles dépréciées
`src/app/speakers/speaker-spotlight.html:3`

**Problème** — `*ngIf` / `*ngFor` aux lignes 3, 5, 6 et 22, ainsi que `NgIf` / `NgFor` dans les imports (`speaker-spotlight.ts:11`), alors que le reste du projet utilise le control flow natif.

**Correction** — `@if (speaker(); as speaker) { … } @else { … }`, `@for (talk of talks(); track talk.id)`, puis retirer `NgIf` et `NgFor` des imports.

### MINOR · NG-02 · Décorateurs `@Input` / `@Output`
`src/app/speakers/speaker-spotlight.ts:17`

**Problème** — `@Input() speakerId!` et `@Output() select = new EventEmitter` (ligne 18). De plus, `speakerId` n'est jamais lié : la route fournit `:id`.

**Correction** — `readonly id = input.required<string>();`, lié par `withComponentInputBinding`. Supprimer l'output (voir A11Y-02).

### MINOR · NG-04 · `any` dans la page speaker
`src/app/speakers/speaker-spotlight.ts:20`

**Problème** — `speaker: any` et `talks: any[]` (ligne 21). Le typage ne détecte pas, par exemple, que `photoUrl` n'existe pas dans le modèle.

**Correction** — Utiliser `Speaker` et `Talk` de `src/app/talks/talk.model.ts`.

### MINOR · NG-12 · `getInitials` duplique `initialsOf` et est appelé depuis le template
`src/app/speakers/speaker-spotlight.ts:42`

**Problème** — Il refait `initialsOf` (`src/app/talks/initials.ts`), en moins bien : pas de limite à deux lettres et un plantage sur les espaces doubles (`part[0]` undefined). Il est aussi appelé avec un argument dans le template (`speaker-spotlight.html:6`, NG-08), donc réexécuté à chaque cycle.

**Correction** — `protected readonly initials = computed(() => initialsOf(this.speaker()?.name ?? ''));` et `{{ initials() }}`.

### MINOR · NG-14 · Photo sans `NgOptimizedImage`
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — `<img [src]="…">`. Gravité relevée d'INFO à MINOR : `NgOptimizedImage` est une convention de `AGENTS.md`.

**Correction** — `<img [ngSrc]="speaker.photoUrl" width="80" height="80" [alt]="…">`, avec `NgOptimizedImage` dans les imports.

### MINOR · TEST-03 · La spec ne vérifie que la création
`src/app/speakers/speaker-spotlight.spec.ts:21`

**Problème** — La seule assertion est `expect(component).toBeTruthy()`. Sans `fixture.detectChanges()`, `ngOnInit` ne s'exécute jamais : le test passe alors que la page plante (SIG-04).

**Correction** — Fournir des speakers et des talks (`provideHttpClientTesting()` et `HttpTestingController`, ou un `TalksStore` simulé), lancer `detectChanges()` et vérifier le nom, la liste des talks et l'affichage de la bio en texte.

### MINOR · NG-03 · Injection par constructeur
`src/app/speakers/speaker.service.ts:9`

**Problème** — `constructor(private http: HttpClient)`.

**Correction** — `private readonly http = inject(HttpClient);`, si le service est conservé (voir SEC-02).

### MINOR · NG-04 · `Observable<any>` dans le service speaker
`src/app/speakers/speaker.service.ts:11`

**Problème** — `getSpeaker` et `getTalks` (ligne 16) renvoient `Observable<any>`.

**Correction** — `this.http.get<Speaker>(…)` et `this.http.get<Talk[]>(…)`.

### MINOR · NG-05 · `console.log` oublié
`src/app/speakers/speaker.service.ts:12`

**Problème** — `console.log('getSpeaker', id)` à chaque chargement.

**Correction** — Supprimer la ligne.

### MINOR · TEST-02 · `SpeakerService` sans test
`src/app/speakers/speaker.service.ts:1`

**Problème** — Le nouveau service n'a pas de `.spec.ts`.

**Correction** — Sans objet si le service est supprimé (voir SEC-02). Sinon, tester les URL appelées avec `HttpTestingController`.

### MINOR · NG-09 · Formulaire non typé
`src/app/proposals/proposal-form.ts:16`

**Problème** — `UntypedFormBuilder` / `UntypedFormGroup` (lignes 3 et 27) : les valeurs sont des `any`, et `(track: Track)` à la ligne 52 masque ce `any`.

**Correction** — `private readonly fb = inject(FormBuilder).nonNullable;` et `readonly form = this.fb.group({ title: ['', Validators.required], track: ['Frontend' as Track, Validators.required], bio: [''] });`.

### MINOR · TEST-02 · `ProposalForm` sans test
`src/app/proposals/proposal-form.ts:1`

**Problème** — Le formulaire n'a pas de `.spec.ts` : ni la validation, ni le compteur, ni la confirmation ne sont couverts. Un test aurait détecté ZL-01.

**Correction** — Tester l'envoi invalide (champs marqués touchés), l'envoi valide (message affiché) et le compteur de caractères.

### MINOR · NG-10 · Guard écrit en classe
`src/app/proposals/proposal.guard.ts:7`

**Problème** — `implements CanActivate` dans du code neuf.

**Correction** —
```ts
export const proposalsOpen: CanActivateFn = () =>
  Date.now() > CFP_CLOSES_AT.getTime() ? inject(Router).parseUrl('/') : true;
```

### MINOR · TEST-02 · Guard sans test
`src/app/proposals/proposal.guard.ts:1`

**Problème** — Rien ne vérifie l'ouverture et la fermeture de l'appel à orateurs.

**Correction** — Deux tests avec `vi.setSystemTime` : avant le 30 novembre, `true` ; après, un `UrlTree` vers `/`.

### INFO · NG-13 · `@Injectable({ providedIn: 'root' })` dans un nouveau fichier
`src/app/speakers/speaker.service.ts:5`

**Problème** — Angular 22 propose `@Service()` pour un service racine. Même remarque pour `proposal.guard.ts:6`, qui disparaît avec NG-10.

**Correction** — `@Service() export class SpeakerService { … }`, si le service est conservé.

### INFO · hors règles · La proposition n'est envoyée nulle part
`src/app/proposals/proposal-form.ts:65`

**Problème** — `submit()` écrit seulement dans `localStorage`, et chaque envoi écrase le précédent. La page promet pourtant une relecture « par le comité » et confirme « bien été enregistrée ». C'est peut-être voulu pour la démo, mais l'utilisateur croit sa proposition transmise.

**Correction** — Si c'est voulu, l'écrire dans le message (« enregistrée dans ce navigateur »). Sinon, envoyer la proposition à une API.

## Écartés à la vérification

- `src/app/speakers/speaker-spotlight.ts:30` · RX-01 — `takeUntilDestroyed` est présent : le vrai problème est l'appel hors contexte d'injection (SIG-04).
- `src/app/speakers/speaker-spotlight.ts:32`, `:35` · RX-01 — Requêtes HTTP qui se terminent seules : pas de fuite. Le problème réel, l'imbrication, est fusionné dans RX-02.
- `src/app/proposals/proposal-form.ts:52` · RX-01 — `takeUntilDestroyed(this.destroyRef)` avec un `DestroyRef` injecté : valide dans `ngOnInit`, pas de fuite.
- `src/app/proposals/proposal-form.ts:42` · SIG-03 — `effect` qui écrit dans `localStorage` : effet de bord légitime.
- `src/app/proposals/proposal-form.ts:20` · lecture de `localStorage` à l'initialisation — Pas de `@angular/ssr` dans le projet.
- `src/app/proposals/proposal-form.ts:65` · SEC-05 — Proposition de talk publique (titre, track, résumé, bio) : pas une donnée sensible.
- `src/app/speakers/speaker-spotlight.spec.ts:13` · TEST-04 — `provideHttpClient()` réel, mais `detectChanges()` n'est jamais appelé : aucune requête ne part. Noté dans TEST-03.
- `src/app/speakers/speaker-spotlight.html:13` · SEC-03 — Même flux que SEC-01 : fusionné.
- `src/app/speakers/speaker-spotlight.html:6` · NG-08 — Même code que NG-12 : fusionné.
- `src/app/speakers/speaker-spotlight.html:5`, `:6`, `:22` · NG-01 — Même problème dans le même fichier : fusionné dans le finding de la ligne 3.
- `src/app/speakers/speaker-spotlight.ts:18` · NG-02 — Fusionné avec la ligne 17.
- `src/app/speakers/speaker-spotlight.ts:21` · NG-04 — Fusionné avec la ligne 20.
- `src/app/speakers/speaker.service.ts:16` · NG-04 — Fusionné avec la ligne 11.
- `src/app/talks/talk-card.html:3` · A11Y-04 — `role="status"` présent : le retour est bien annoncé.
- `src/app/proposals/proposal-form.ts:9` · NG-07 — Pas de `changeDetection` : OnPush par défaut, rien à signaler.
