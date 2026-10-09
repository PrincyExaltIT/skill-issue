# Revue — HEAD (détaché, 35d2f12) → depart

**Verdict : à corriger**

La branche ajoute la page speaker (`SpeakerSpotlight`), le formulaire de proposition de talk avec son guard de date limite, et le retour visuel du bouton favori sur les cartes de talk. Le risque principal : la page speaker plante à l'ouverture (`takeUntilDestroyed()` appelé hors contexte d'injection), et la bio est injectée dans le DOM sans nettoyage alors qu'elle peut venir d'un formulaire public.

| BLOCKER | MAJOR | MINOR | INFO |
|:---:|:---:|:---:|:---:|
| 5 | 12 | 13 | 0 |

## Findings

### BLOCKER · SIG-04 · La page speaker plante à l'ouverture
`src/app/speakers/speaker-spotlight.ts:30`

**Problème** — `this.route.paramMap.pipe(takeUntilDestroyed())` est appelé dans `ngOnInit`. Sans argument, `takeUntilDestroyed()` exige un contexte d'injection, que `ngOnInit` n'a pas : Angular lève NG0203. L'utilisateur qui ouvre `/speakers/:id` obtient une erreur de navigation et une page qui ne s'affiche jamais.

**Correction** — Injecter le `DestroyRef` en champ et le passer explicitement :
```ts
private readonly destroyRef = inject(DestroyRef);
// …
this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(…)
```
Voir aussi RX-02 pour la restructuration des souscriptions de cette méthode.

### BLOCKER · SEC-01 · Bio injectée sans nettoyage
`src/app/speakers/speaker-spotlight.ts:34`

**Problème** — `bypassSecurityTrustHtml(speaker.bio)` désactive la protection XSS d'Angular sur la bio, affichée via `[innerHTML]` (`speaker-spotlight.html:13`). La bio vient de l'API, et le formulaire `proposal-form.html:35` indique que « HTML autorisé (gras, liens…) » : un script ou un lien piégé saisi par un proposant s'exécute chez les visiteurs de la page speaker. Le modèle `talk.model.ts:22` dit pourtant « Texte brut : toujours affiché par interpolation, jamais comme HTML ».

**Correction** — Retirer le bypass et `bioHtml`, afficher la bio en texte : `{{ speaker.bio }}` dans `speaker-spotlight.html:13`. Si l'équipe veut vraiment du HTML, `[innerHTML]="speaker.bio"` laisse le sanitizer d'Angular faire son travail, mais il faut alors corriger le contrat de `talk.model.ts:22` et l'aide de `proposal-form.html:35` en même temps. C'est un choix produit : le modèle dit texte brut, c'est la solution retenue ici.

### BLOCKER · A11Y-02 · Talk cliquable à la souris seulement
`src/app/speakers/speaker-spotlight.html:22`

**Problème** — `<div class="talk" (click)="select.emit(talk.id)">` n'est ni focusable ni activable au clavier : le parcours est inaccessible. Par ailleurs, `select` n'est relié à aucun parent (`speaker-spotlight.ts:18`) : le clic ne mène nulle part.

**Correction** — Un lien vers le talk, qui est focusable, navigable au clavier et ouvre réellement la fiche :
```html
<a class="talk" [routerLink]="['/talks', talk.id]">
  <h3>{{ talk.title }}</h3>
  <p>{{ talk.start | date: 'EEE d MMM · HH:mm' }} · {{ talk.room }}</p>
</a>
```
Cela rend aussi l'`@Output() select` inutile (voir NG-06).

### BLOCKER · A11Y-03 · Champ titre sans label
`src/app/proposals/proposal-form.html:15`

**Problème** — `<input formControlName="title" placeholder="Titre du talk" />` n'a pas de label. Le placeholder disparaît à la saisie et n'est pas annoncé de façon fiable : le champ le plus important du formulaire est anonyme pour un lecteur d'écran.

**Correction** — Ajouter un label visible, associé par `id` :
```html
<label class="visually-hidden" for="title">Titre du talk</label>
<input id="title" class="proposal__title" formControlName="title" placeholder="Titre du talk" />
```
(ou un `<label for="title">` visible, selon le design ; `.sr-only` existe déjà dans `styles.css:84`).

### BLOCKER · SIG-01 · Message de favori toujours identique
`src/app/talks/talk-card.ts:28`

**Problème** — `if (!this.isFavorite)` teste la fonction `input` (toujours truthy), donc `!this.isFavorite` vaut toujours `false`. Le retour affiché est donc systématiquement « Retiré de vos favoris », même quand le talk vient d'être ajouté.

**Correction** — Lire la valeur du signal :
```ts
if (!this.isFavorite()) {
```

### MAJOR · SIG-02 · `add()` modifie le signal en place
`src/app/favorites/favorites.store.ts:28`

**Problème** — `this.ids().push(id)` ajoute l'id au tableau sans changer sa référence : `count`, `favoriteIds` et le template `app.html:22` ne se mettent pas à jour, et l'effet de persistance (`favorites.store.ts:15`) ne se déclenche pas. « Tout ajouter à mes favoris » ne fait donc rien d'affiché, et le stockage n'est mis à jour qu'au prochain `toggle`. De plus, `add` n'évite pas les doublons : un talk déjà favori est ajouté deux fois.

**Correction** —
```ts
add(id: string): void {
  this.ids.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
}
```

### MAJOR · ZL-01 · Message de confirmation jamais affiché (zoneless)
`src/app/proposals/proposal-form.ts:67`

**Problème** — Le `setTimeout` met `submitted = true`, qui est un champ ordinaire lu par `proposal-form.html:9`. Sans zone.js, rien ne déclenche le rendu après le timeout : le message « Merci ! Votre proposition a bien été enregistrée. » n'apparaît pas. Le délai de 300 ms n'a pas de justification visible.

**Correction** — Faire de `submitted` un signal (`submitted = signal(false)`), appeler `this.submitted.set(true)` directement dans `submit()` (sans `setTimeout`), et lire `submitted()` dans le template.

### MAJOR · SIG-03 · `effect()` qui dérive un état
`src/app/proposals/proposal-form.ts:37`

**Problème** — `effect(() => this.charCount.set(this.abstract().length))` dérive `charCount` d'un autre signal dans un effet : la valeur est fausse d'un tour de rendu et l'effet est une porte ouverte aux boucles.

**Correction** — `readonly charCount = computed(() => this.abstract().length);` et supprimer le champ `charCount` et l'effet correspondant. L'effet de persistance `localStorage` (lignes 41-43) reste légitime.

### MAJOR · RX-02 · Souscriptions imbriquées sans annulation
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — `getSpeaker(id).subscribe(…)` est imbriqué dans `paramMap.subscribe`, et `getTalks(…).subscribe(…)` (ligne 35) dans celui-ci. Si l'id change pendant qu'une requête est en vol, les réponses arrivent dans le désordre et la page peut afficher les talks d'un autre speaker.

**Correction** — Un seul pipeline, qui annule la requête précédente :
```ts
this.route.paramMap.pipe(
  map((params) => params.get('id') ?? this.speakerId),
  switchMap((id) => this.speakerService.getSpeaker(id)),
  tap((speaker) => (this.speaker = speaker)),
  switchMap((speaker) => this.speakerService.getTalks(speaker.id)),
  takeUntilDestroyed(this.destroyRef),
).subscribe((talks) => (this.talks = talks));
```

### MAJOR · RX-03 · Erreur HTTP non gérée
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — Ni `getSpeaker` ni `getTalks` n'ont de `catchError`, et le template n'a pas d'état d'erreur. Si l'API échoue, l'écran reste sur « Chargement du speaker… » pour toujours.

**Correction** — Ajouter un champ `error = signal(false)` (ou un état équivalent), le passer à `true` dans une erreur, et afficher un message avec une action (« Réessayer », « Retour au programme ») dans `speaker-spotlight.html`.

### MAJOR · NG-07 · Détection de changement forcée en Eager
`src/app/speakers/speaker-spotlight.ts:14`

**Problème** — `ChangeDetectionStrategy.Eager` force la vérification du composant à chaque cycle, alors qu'OnPush est le défaut du projet. Aucune justification n'est écrite.

**Correction** — Retirer la ligne `changeDetection`.

### MAJOR · NG-06 · Output nommé comme un événement DOM
`src/app/speakers/speaker-spotlight.ts:18`

**Problème** — `@Output() select` porte le nom d'un événement DOM natif. Il n'est relié à aucun parent (voir A11Y-02) : l'output est mort, et son nom prête à confusion.

**Correction** — Le supprimer si le clic passe par un `routerLink` (voir A11Y-02). Sinon, le renommer en `talkSelected` avec `output<string>()`.

### MAJOR · A11Y-01 · Image sans `alt`
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — `<img [src]="speaker.photoUrl">` n'a pas d'`alt` : le lecteur d'écran annonce le nom du fichier, ou rien.

**Correction** — `[alt]="'Portrait de ' + speaker.name"` (le portrait est porteur d'information ici, le nom est déjà affiché à côté, donc `alt=""` est aussi défendable si l'équipe considère l'image décorative).

### MAJOR · TEST-01 · Test focalisé
`src/app/speakers/speaker-spotlight.spec.ts:20`

**Problème** — `it.only('should create', …)` : seul ce test tourne dans toute la suite, les autres sont ignorés sans bruit.

**Correction** — `it(…)`.

### MAJOR · TEST-04 · Test sur un `HttpClient` réel
`src/app/speakers/speaker-spotlight.spec.ts:13`

**Problème** — `provideHttpClient()` utilise le vrai client HTTP. Le test ne fait pas d'appel aujourd'hui (pas de `fixture.detectChanges()`), donc le risque est latent : dès qu'un test déclenche `ngOnInit`, il appelle `http://localhost:3000`.

**Correction** — `provideHttpClientTesting()` et un `HttpTestingController` pour vérifier les requêtes attendues.

### MAJOR · SEC-02 · URL d'API en dur
`src/app/speakers/speaker.service.ts:7`

**Problème** — `'http://localhost:3000/api/speakers'` contourne la configuration du projet : en production, les speakers pointent encore vers localhost. Le projet a déjà le token `API_BASE_URL` (`src/app/core/api-base-url.ts`), utilisé par `talks.store.ts:9`.

**Correction** —
```ts
private readonly baseUrl = `${inject(API_BASE_URL)}/speakers`;
```
(ou injecter le token dans un champ, comme `talks.store.ts`).

### MAJOR · NG-11 · Page chargée d'emblée
`src/app/app.routes.ts:22`

**Problème** — `component: SpeakerSpotlight` intègre la page dans le bundle initial, alors que les autres routes utilisent `loadComponent`.

**Correction** — `{ path: 'speakers/:id', loadComponent: () => import('./speakers/speaker-spotlight').then((m) => m.SpeakerSpotlight), title: 'Speaker · Conf Planner' }`. Et importer `SpeakerSpotlight` en haut du fichier n'est alors plus nécessaire.

### MINOR · NG-01 · Directives structurelles dépréciées
`src/app/speakers/speaker-spotlight.html:3` (aussi lignes 5, 6, 22)

**Problème** — `*ngIf` et `*ngFor`, avec `NgIf` / `NgFor` importés (`speaker-spotlight.ts:11`), alors que le projet utilise le control flow natif.

**Correction** — `@if (speaker) { … } @else { … }` et `@for (talk of talks; track talk.id) { … }`, puis retirer `NgIf, NgFor` des imports.

### MINOR · NG-02 · Décorateurs `@Input` / `@Output`
`src/app/speakers/speaker-spotlight.ts:17` (aussi ligne 18)

**Problème** — `@Input() speakerId!` et `@Output() select` au lieu des fonctions `input()` / `output()`.

**Correction** — `readonly speakerId = input<string>();` (ou `input.required` si l'id est toujours fourni) et `readonly talkSelected = output<string>();`.

### MINOR · NG-04 · Type `any`
`src/app/speakers/speaker-spotlight.ts:20` (aussi ligne 21)

**Problème** — `speaker: any` et `talks: any[]` : le template et la logique ne sont plus contrôlés par le compilateur.

**Correction** — `speaker = signal<Speaker | null>(null)` et `talks = signal<Talk[]>([])`, avec `Speaker` et `Talk` de `talks/talk.model.ts`.

### MINOR · NG-12 · Utilitaire dupliqué
`src/app/speakers/speaker-spotlight.ts:42`

**Problème** — `getInitials` refait ce que fait `initialsOf` (`src/app/talks/initials.ts`), en moins robuste : pas de filtre des espaces multiples, pas de limite à deux lettres.

**Correction** — Importer `initialsOf` et supprimer `getInitials` ; mettre à jour le template ligne 6.

### MINOR · TEST-03 · Test qui ne vérifie que la création
`src/app/speakers/speaker-spotlight.spec.ts:21`

**Problème** — `expect(component).toBeTruthy()` est la seule assertion de la suite.

**Correction** — Tester un comportement : le nom du speaker s'affiche après la réponse de `getSpeaker`, ou « Tout ajouter à mes favoris » ajoute les talks.

### MINOR · NG-03 · Injection par constructeur
`src/app/speakers/speaker.service.ts:9`

**Problème** — `constructor(private http: HttpClient) {}`, alors que le projet utilise `inject()`.

**Correction** — `private readonly http = inject(HttpClient);` et supprimer le constructeur.

### MINOR · NG-04 · Type `any` dans le service
`src/app/speakers/speaker.service.ts:11` (aussi ligne 16)

**Problème** — `Observable<any>` sur `getSpeaker` et `getTalks`.

**Correction** — `Observable<Speaker>` et `Observable<Talk[]>` depuis `talks/talk.model.ts`.

### MINOR · NG-05 · Trace de débogage oubliée
`src/app/speakers/speaker.service.ts:12`

**Problème** — `console.log('getSpeaker', id)` part en production.

**Correction** — Supprimer la ligne.

### MINOR · TEST-02 · Nouveau service sans test
`src/app/speakers/speaker.service.ts:1`

**Problème** — Aucun `speaker.service.spec.ts` : l'URL et les appels HTTP ne sont couverts par rien.

**Correction** — Un test avec `HttpTestingController` qui vérifie l'URL de `getSpeaker` et de `getTalks`.

### MINOR · TEST-02 · Nouveau composant sans test
`src/app/proposals/proposal-form.ts:1`

**Problème** — Le formulaire de proposition, avec sa validation et son message de succès, n'a aucun test.

**Correction** — Un test qui vérifie qu'un titre vide bloque `submit()`, et qu'un titre valide affiche le message de succès (voir ZL-01).

### MINOR · TEST-02 · Nouveau guard sans test
`src/app/proposals/proposal.guard.ts:1`

**Problème** — Le guard de date limite n'est couvert par aucun test ; une régression laisserait passer les propositions après le 30 novembre.

**Correction** — Un test avec `vi.setSystemTime` avant et après `CFP_CLOSES_AT`.

### MINOR · NG-10 · Guard écrit en classe
`src/app/proposals/proposal.guard.ts:7`

**Problème** — `implements CanActivate` en classe : la forme dépréciée, alors qu'une fonction suffit ici.

**Correction** —
```ts
export const proposalsOpen: CanActivateFn = () =>
  Date.now() > CFP_CLOSES_AT.getTime() ? inject(Router).parseUrl('/') : true;
```
Et `canActivate: [proposalsOpen]` dans `app.routes.ts:26`.

### MINOR · NG-09 · Formulaire non typé
`src/app/proposals/proposal-form.ts:16` (aussi lignes 3 et 27)

**Problème** — `UntypedFormBuilder` et `UntypedFormGroup` renvoient des `any` : les erreurs de nom de champ ne sont pas vues à la compilation.

**Correction** — `inject(FormBuilder).nonNullable.group({ title: ['', Validators.required], track: ['Frontend' as Track, Validators.required], bio: [''] })`, avec un type `Track` explicite.

## Écartés à la vérification

- `src/app/proposals/proposal-form.ts:47` · RX-01 — `form.valueChanges` appartient au composant : la souscription meurt avec le formulaire, il n'y a pas de fuite.
- `src/app/proposals/proposal-form.ts:52` · RX-01 — `takeUntilDestroyed(this.destroyRef)` est déjà en place, avec un `DestroyRef` injecté.
- `src/app/speakers/speaker-spotlight.ts:30` · RX-01 — la souscription a bien `takeUntilDestroyed()` ; le défaut réel de cette ligne est retenu sous SIG-04.
- `src/app/speakers/speaker-spotlight.ts:32` et `:35` · RX-01 — appels HTTP qui se terminent seuls (au plus MINOR) ; le problème réel est l'imbrication, retenue sous RX-02 et RX-03.
- `src/app/speakers/speaker.service.ts:6` · NG-13 — `@Injectable({ providedIn: 'root' })` est la forme que le projet utilise déjà (`favorites/favorites.store.ts:6`).
- `src/app/proposals/proposal-form.ts:41-43` · SIG-03 — `effect()` qui écrit dans `localStorage` : effet de bord légitime.
- `src/app/proposals/proposal-form.ts:65` · SEC-05 — brouillon de proposition publique, pas une donnée sensible.
- `src/app/proposals/proposal-form.ts:20` · localStorage lu à l'initialisation — accepté, pas de rendu serveur.
- `src/app/speakers/speaker-spotlight.html:13` · SEC-03 — couvert par SEC-01 (même ligne, même cause).
