# Revue — lab/speaker-spotlight (35d2f12) → depart

**Verdict : à corriger**

La branche ajoute la page speaker (`/speakers/:id`), le formulaire de proposition de talk (`/proposals`), un lien vers le speaker et un message de retour sur la carte de talk, et « Tout ajouter à mes favoris ». Le risque principal : la page speaker plante à l'ouverture (NG0203) et, une fois ce point corrigé, injecte sans filtre une bio HTML que le formulaire invite justement à saisir (XSS stockée).

| BLOCKER | MAJOR | MINOR | INFO |
|:---:|:---:|:---:|:---:|
| 5 | 15 | 14 | 1 |

> Tests et build non exécutés pendant la revue (exécution non autorisée dans cette session) : les constats reposent sur la lecture du code.

## Findings

### BLOCKER · SIG-04 · La page speaker plante à l'ouverture (NG0203)
`src/app/speakers/speaker-spotlight.ts:30`

**Problème** — `takeUntilDestroyed()` sans argument est appelé dans `ngOnInit`, hors contexte d'injection : Angular lève NG0203 dès que la page s'affiche. Tout clic sur le nom d'un speaker (nouveau lien de `talk-card.html:28`) mène à une page cassée, bloquée sur « Chargement du speaker… ».

**Correction** — injecter `private readonly destroyRef = inject(DestroyRef)` et écrire `takeUntilDestroyed(this.destroyRef)`, ou mieux, déplacer la dérivation dans des initialiseurs de champ (voir RX-02 et SEC-02 : un `computed` sur `TalksStore` supprime l'abonnement).

### BLOCKER · SEC-01 · XSS stockée via la bio du speaker
`src/app/speakers/speaker-spotlight.ts:34`

**Problème** — `bypassSecurityTrustHtml(speaker.bio)` désactive le sanitizer, puis `[innerHTML]="bioHtml"` (`speaker-spotlight.html:13`) injecte la bio telle quelle. Le formulaire de proposition dit explicitement « HTML autorisé (gras, liens…) : la bio s'affiche sur votre page speaker » (`proposal-form.html:35`) : n'importe quel candidat peut faire exécuter du script à tous les visiteurs de sa page. Le modèle `Speaker.bio` précise pourtant « Texte brut : toujours affiché par interpolation, jamais comme HTML ». Couvre aussi SEC-03 sur `speaker-spotlight.html:13`.

**Correction** — supprimer `bioHtml` et `DomSanitizer`, afficher `<p class="spotlight__bio">{{ speaker.bio }}</p>`, et retirer la mention « HTML autorisé » du formulaire.

### BLOCKER · SIG-01 · « Retiré de vos favoris » s'affiche aussi à l'ajout
`src/app/talks/talk-card.ts:28`

**Problème** — `if (!this.isFavorite)` teste la fonction `input`, toujours vraie : la branche « Ajouté à vos favoris » n'est jamais prise. Chaque clic sur l'étoile annonce « Retiré de vos favoris », y compris aux lecteurs d'écran (`role="status"`).

**Correction** — `if (!this.isFavorite())`, ou `this.feedback.set(this.isFavorite() ? 'Retiré de vos favoris' : 'Ajouté à vos favoris');`

### BLOCKER · A11Y-02 · Les talks du speaker ne sont ni focusables ni utiles
`src/app/speakers/speaker-spotlight.html:22`

**Problème** — `(click)` sur un `<div class="talk">` : pas de focus, pas de clavier. En plus, le composant n'est utilisé que par la route : personne n'écoute `select`, donc le clic ne fait rien du tout, même à la souris (alors que le CSS met `cursor: pointer`).

**Correction** — une navigation, donc un lien : `<a class="talk" [routerLink]="['/talks', talk.id]">…</a>`, et supprimer l'output `select`.

### BLOCKER · A11Y-03 · Le titre du talk n'a pas de label
`src/app/proposals/proposal-form.html:15`

**Problème** — `<input formControlName="title" placeholder="Titre du talk">` n'a ni `<label for>` ni `aria-label` : le placeholder disparaît à la saisie et le champ (obligatoire) n'est pas annoncé correctement.

**Correction** — `<label for="title" class="sr-only">Titre du talk</label>` puis `<input id="title" class="proposal__title" formControlName="title" …>` (ou un label visible comme les autres champs).

### MAJOR · NG-11 · La page speaker part dans le bundle initial
`src/app/app.routes.ts:22`

**Problème** — `component: SpeakerSpotlight` (import statique ligne 3) alors que toutes les autres pages sont en `loadComponent`.

**Correction** — `loadComponent: () => import('./speakers/speaker-spotlight').then((m) => m.SpeakerSpotlight)` et supprimer l'import ligne 3.

### MAJOR · SIG-02 · « Tout ajouter à mes favoris » ne met rien à jour
`src/app/favorites/favorites.store.ts:28`

**Problème** — `this.ids().push(id)` mute le tableau sans changer la référence : le compteur du header, les étoiles et l'effet de persistance `localStorage` ne se déclenchent pas. De plus, aucun contrôle de doublon : un talk déjà favori est ajouté une seconde fois, et le compteur sera faux au prochain rendu.

**Correction** —
```ts
add(id: string): void {
  this.ids.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
}
```

### MAJOR · NG-07 · Détection de changement forcée en `Eager` sans justification
`src/app/speakers/speaker-spotlight.ts:14`

**Problème** — `ChangeDetectionStrategy.Eager` sans commentaire. Il masque surtout le vrai problème (champs non-signal, voir ZL-01) sans le résoudre en zoneless.

**Correction** — retirer la ligne après être passé aux signals.

### MAJOR · NG-06 · Output nommé `select`, comme l'événement DOM
`src/app/speakers/speaker-spotlight.ts:18`

**Problème** — `@Output() select` se confond avec l'événement natif `select` : un parent qui écrit `(select)` reçoit les deux. Ici l'output n'est de toute façon écouté par personne (composant routé).

**Correction** — le supprimer (voir A11Y-02) ; s'il doit rester, `readonly talkSelected = output<string>();`

### MAJOR · RX-02 · Trois abonnements imbriqués
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — `paramMap.subscribe` → `getSpeaker().subscribe` → `getTalks().subscribe` (lignes 30, 32, 35). En passant d'un speaker à l'autre, les requêtes précédentes ne sont pas annulées : la réponse d'un ancien speaker peut écraser celle du nouveau.

**Correction** — un seul flux avec `switchMap`, ou mieux, dériver depuis les données déjà chargées par `TalksStore` :
```ts
readonly id = input.required<string>(); // alimenté par withComponentInputBinding
private readonly store = inject(TalksStore);
readonly speaker = computed(() => this.store.speakersById().get(this.id()));
readonly talks = computed(() => this.store.schedule().filter((t) => t.speakerId === this.id()));
```

### MAJOR · ZL-01 · Le speaker chargé ne s'affiche pas (zoneless)
`src/app/speakers/speaker-spotlight.ts:33`

**Problème** — `this.speaker = …`, `this.bioHtml = …` et `this.talks = …` (lignes 33, 34, 36) sont des champs ordinaires modifiés dans un callback HTTP. L'application est zoneless (pas de zone.js) : rien ne planifie de rendu, la page reste sur « Chargement du speaker… ».

**Correction** — des `signal`/`computed` (voir l'extrait de RX-02).

### MAJOR · RX-03 · Aucune gestion d'erreur sur la page speaker
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — ni `catchError` ni état d'erreur : si la requête échoue (ce qui arrive partout où `localhost:3000` ne répond pas, voir SEC-02) ou si l'id est inconnu, l'utilisateur reste indéfiniment sur « Chargement… ».

**Correction** — afficher un état d'erreur / « speaker introuvable » : avec `TalksStore`, `@if (speaker(); as s) { … } @else if (store.talks.isLoading()) { Chargement… } @else { Speaker introuvable. }`

### MAJOR · A11Y-01 · Photo du speaker sans `alt`
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — `<img [src]="speaker.photoUrl">` sans `alt`. (À noter : `photoUrl` n'existe pas dans l'interface `Speaker` ; le `any` le cache.)

**Correction** — `[alt]="'Portrait de ' + speaker.name"`, et ajouter `photoUrl?` au modèle si la donnée existe.

### MAJOR · SEC-02 · URL d'API en dur, vers un serveur qui n'existe pas
`src/app/speakers/speaker.service.ts:7`

**Problème** — `http://localhost:3000/api/speakers` contourne `API_BASE_URL` (`src/app/core/api-base-url.ts`, `/data` par défaut). Le projet ne sert que `public/data/talks.json` et `speakers.json` : les routes `/speakers/:id` et `/speakers/:id/talks` n'existent nulle part, la page ne peut charger dans aucun environnement.

**Correction** — supprimer `SpeakerService` et lire `TalksStore.speakersById()` / `schedule()` (voir RX-02). À défaut, `private readonly baseUrl = inject(API_BASE_URL);`.

### MAJOR · TEST-01 · `it.only` dans la suite
`src/app/speakers/speaker-spotlight.spec.ts:20`

**Problème** — le focus coupe le reste du fichier aujourd'hui et ceux qu'on ajoutera ; en CI (`CI=true`), Vitest échoue.

**Correction** — `it('should create', …)`.

### MAJOR · TEST-04 · Le test utilise le vrai `HttpClient`
`src/app/speakers/speaker-spotlight.spec.ts:13`

**Problème** — `provideHttpClient()` sans `provideHttpClientTesting()` : dès que le composant est rendu, `ngOnInit` envoie une vraie requête vers `localhost:3000`. Les autres specs du projet (`talk-list.spec.ts`, `talk-detail.spec.ts`) utilisent `HttpTestingController`.

**Correction** — `providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]` et `HttpTestingController` (ou, après refonte, un `TalksStore` alimenté par ses fixtures).

### MAJOR · SIG-03 · `charCount` dérivé par un `effect`
`src/app/proposals/proposal-form.ts:38`

**Problème** — `effect(() => this.charCount.set(this.abstract().length))` : le compteur est mis à jour un tour trop tard, et un `effect` qui écrit dans un signal ouvre la porte aux boucles.

**Correction** — `readonly charCount = computed(() => this.abstract().length);` et supprimer l'effect (celui des lignes 41-43 vers `localStorage` est légitime, il reste).

### MAJOR · RX-01 · `valueChanges` jamais libéré
`src/app/proposals/proposal-form.ts:47`

**Problème** — `this.form.valueChanges.subscribe(v => this.draft = v)` sans `takeUntilDestroyed` : chaque visite de `/proposals` laisse un abonnement vivant.

**Correction** — supprimer `draft` et lire la valeur au moment de l'envoi : `const proposal = { ...this.form.getRawValue(), abstract: this.abstract() };`. Sinon `.pipe(takeUntilDestroyed(this.destroyRef))` comme ligne 51.

### MAJOR · ZL-01 · Le message « Merci ! » ne s'affiche jamais
`src/app/proposals/proposal-form.ts:67`

**Problème** — `this.submitted = true` dans un `setTimeout` : champ ordinaire, application zoneless, composant OnPush. Aucun rendu n'est planifié, le `role="status"` reste vide ; l'utilisateur ne sait pas si sa proposition est partie.

**Correction** — `readonly submitted = signal(false);`, `this.submitted.set(true)`, et `@if (submitted())` dans le template. Le `setTimeout` de 300 ms n'a pas de raison d'être.

### MAJOR · hors règles · Envoi refusé sans aucun message
`src/app/proposals/proposal-form.ts:61`

**Problème** — titre vide → `markAllAsTouched()` puis `return`, mais le template n'affiche aucune erreur et aucun style `ng-invalid` n'existe dans le projet. Le bouton « Envoyer » ne fait visiblement rien ; combiné à A11Y-03, l'utilisateur ne sait pas quel champ manque.

**Correction** — un message lié au champ :
```html
@if (form.controls['title'].touched && form.controls['title'].invalid) {
  <p id="title-error" class="field__error" role="alert">Le titre est obligatoire.</p>
}
```
avec `[attr.aria-invalid]` et `aria-describedby="title-error"` sur l'input.

### MINOR · NG-01 · `*ngIf` / `*ngFor` au lieu du control flow
`src/app/speakers/speaker-spotlight.html:3`

**Problème** — directives dépréciées (lignes 3, 5, 6, 22 ; `NgIf`, `NgFor` importés en `speaker-spotlight.ts:11`), contraire à la convention `AGENTS.md`.

**Correction** — `@if (speaker(); as s) { … } @else { … }`, `@for (talk of talks(); track talk.id) { … }`, et retirer `NgIf`, `NgFor` des imports.

### MINOR · NG-02 · `@Input` / `@Output` décorateurs
`src/app/speakers/speaker-spotlight.ts:17`

**Problème** — lignes 17-18 : `@Input() speakerId!` et `@Output() … new EventEmitter`, contraire à la convention `AGENTS.md`.

**Correction** — `readonly id = input.required<string>();` (lié au paramètre de route par `withComponentInputBinding`, ce qui rend aussi `ActivatedRoute` inutile).

### MINOR · NG-04 · `speaker` et `talks` typés `any`
`src/app/speakers/speaker-spotlight.ts:20`

**Problème** — `speaker: any; talks: any[]` (lignes 20-21) : c'est ce qui laisse passer `speaker.photoUrl`, absent du modèle.

**Correction** — `Speaker` et `Talk` de `talks/talk.model.ts`.

### MINOR · NG-12 · Calcul des initiales dupliqué
`src/app/speakers/speaker-spotlight.ts:42`

**Problème** — `getInitials` refait `initialsOf` (`talks/initials.ts`) en moins robuste : espaces multiples → `undefined` dans le résultat, pas de limite à deux lettres. Il est en plus appelé avec argument dans le template (`speaker-spotlight.html:6`, NG-08).

**Correction** — `readonly initials = computed(() => initialsOf(this.speaker()?.name ?? ''));` et `{{ initials() }}`.

### MINOR · NG-14 · Image sans `NgOptimizedImage`
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — `<img [src]>`. Gravité relevée d'INFO à MINOR : `NgOptimizedImage` est une convention de `AGENTS.md`, qui prime sur la référence.

**Correction** — `<img [ngSrc]="s.photoUrl" width="80" height="80" [alt]="…">` et `NgOptimizedImage` dans les imports.

### MINOR · NG-03 · Injection par constructeur
`src/app/speakers/speaker.service.ts:9`

**Problème** — `constructor(private http: HttpClient)`, contraire à la convention `AGENTS.md`.

**Correction** — `private readonly http = inject(HttpClient);` (si le service est conservé).

### MINOR · NG-04 · `Observable<any>` dans le service
`src/app/speakers/speaker.service.ts:11`

**Problème** — lignes 11 et 16 : les réponses n'ont pas de contrat.

**Correction** — `this.http.get<Speaker>(…)` et `this.http.get<Talk[]>(…)`.

### MINOR · NG-05 · `console.log` oublié
`src/app/speakers/speaker.service.ts:12`

**Correction** — supprimer la ligne.

### MINOR · TEST-02 · `SpeakerService` sans test
`src/app/speakers/speaker.service.ts:1`

**Correction** — un spec avec `HttpTestingController` vérifiant les URL appelées, ou rien si le service disparaît au profit de `TalksStore`.

### MINOR · TEST-03 · Le seul test vérifie la création
`src/app/speakers/speaker-spotlight.spec.ts:21`

**Problème** — `expect(component).toBeTruthy()` ne rend même pas le composant : il ne voit ni le NG0203 ni la page bloquée sur « Chargement ».

**Correction** — rendre la page pour un id connu (`fixture.componentRef.setInput('id', 's1')`, `await fixture.whenStable()`) et vérifier le nom, la liste des talks, et l'affichage de la bio en texte.

### MINOR · NG-09 · Formulaire non typé
`src/app/proposals/proposal-form.ts:3`

**Problème** — `UntypedFormBuilder` / `UntypedFormGroup` : `track` arrive en `any` (d'où l'annotation manuelle ligne 52).

**Correction** — `inject(FormBuilder).nonNullable.group({ title: ['', Validators.required], track: ['Frontend' as Track, Validators.required], bio: [''] })`, ou Signal Forms.

### MINOR · TEST-02 · `ProposalForm` sans test
`src/app/proposals/proposal-form.ts:1`

**Correction** — un spec qui vérifie le refus sans titre, l'enregistrement et l'affichage du message de confirmation (il aurait détecté le ZL-01).

### MINOR · NG-10 · Guard écrit en classe
`src/app/proposals/proposal.guard.ts:7`

**Correction** —
```ts
export const proposalsOpen: CanActivateFn = () =>
  Date.now() > CFP_CLOSES_AT.getTime() ? inject(Router).parseUrl('/') : true;
```
et `canActivate: [proposalsOpen]` dans `app.routes.ts`.

### MINOR · TEST-02 · Guard sans test
`src/app/proposals/proposal.guard.ts:1`

**Correction** — deux cas avec `vi.setSystemTime` : avant et après le 30 novembre 2026.

### INFO · NG-13 · `@Injectable({ providedIn: 'root' })` dans un nouveau fichier
`src/app/speakers/speaker.service.ts:5`

**Correction** — `@Service()` si le service est conservé.

## Écartés à la vérification

- `src/app/speakers/speaker-spotlight.ts:30` · RX-01 — `takeUntilDestroyed()` est bien présent ; le vrai problème est l'appel hors contexte, reclassé en SIG-04.
- `src/app/speakers/speaker-spotlight.ts:32` · RX-01 — appel HTTP qui se termine seul ; l'imbrication est traitée par RX-02.
- `src/app/speakers/speaker-spotlight.ts:35` · RX-01 — idem, fusionné dans RX-02.
- `src/app/proposals/proposal-form.ts:52` · RX-01 — `takeUntilDestroyed(this.destroyRef)` avec `DestroyRef` injecté : valide dans `ngOnInit`, pas de fuite.
- `src/app/proposals/proposal-form.ts:42` · SIG-03 — l'effect écrit dans `localStorage` : effet de bord légitime.
- `src/app/proposals/proposal-form.ts:20` · `localStorage` à l'initialisation — pas de `@angular/ssr` dans le projet.
- `src/app/proposals/proposal-form.ts:65` · SEC-05 — brouillon de proposition publique, pas de donnée sensible.
- `src/app/speakers/speaker-spotlight.html:13` · SEC-03 — même problème que SEC-01, fusionné.
- `src/app/speakers/speaker-spotlight.html:6` · NG-08 — fusionné dans NG-12, la même correction le règle.
- `src/app/talks/talk-card.html:3` · A11Y-04 — le retour porte bien `role="status"`.
