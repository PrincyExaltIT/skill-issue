# Revue — run/chaine → depart

**Verdict : à corriger**

La branche ajoute une page speaker (`/speakers/:id`), un formulaire de proposition de talk protégé par un guard, un lien speaker et un message de retour sur la carte de talk. Risque principal : la page speaker plante à l'ouverture (NG0203) et, une fois ce plantage corrigé, elle affiche en HTML non nettoyé une bio que le formulaire invite à saisir en HTML : c'est une XSS stockée.

| BLOCKER | MAJOR | MINOR | INFO |
|:---:|:---:|:---:|:---:|
| 5 | 14 | 15 | 1 |

> Piste de correction d'ensemble pour `SpeakerSpotlight` : le projet charge déjà les speakers et les talks dans `TalksStore` (`speakersById()`, `schedule()`, avec un état d'erreur). Un `readonly id = input.required<string>()`, alimenté par `withComponentInputBinding()`, plus deux `computed()` sur le store, suppriment `SpeakerService`, les abonnements, les champs non réactifs et l'URL en dur. Cela corrige SIG-04, RX-02, RX-03, ZL-01, SEC-02, NG-02, NG-04 et NG-07 d'un coup.

## Findings

### BLOCKER · SIG-04 · La page speaker plante à l'ouverture
`src/app/speakers/speaker-spotlight.ts:30`

**Problème** — `takeUntilDestroyed()` sans argument appelle `inject(DestroyRef)`. Dans `ngOnInit`, on est hors contexte d'injection : l'appel lève NG0203. Tout clic sur un nom de speaker depuis une carte de talk (le nouveau lien de `talk-card.html:28`) mène à une page cassée. Le test ne le voit pas parce qu'il ne déclenche jamais `ngOnInit` (voir TEST-03).

**Correction** — Remplacer l'abonnement par l'input de route et des `computed()` (voir la piste d'ensemble). Pour garder l'abonnement, il faut `private readonly destroyRef = inject(DestroyRef);` puis `takeUntilDestroyed(this.destroyRef)`.

### BLOCKER · SEC-01 · XSS stockée via la bio du speaker
`src/app/speakers/speaker-spotlight.ts:34`

**Problème** — `bypassSecurityTrustHtml(speaker.bio)` puis `[innerHTML]="bioHtml"` (`speaker-spotlight.html:13`) injectent la bio telle quelle, `<script>` et `onerror=` compris. Or la bio vient de l'utilisateur : le formulaire annonce « HTML autorisé (gras, liens…) : la bio s'affiche sur votre page speaker » (`proposal-form.html:35`). Le modèle dit l'inverse : `Speaker.bio` est du « texte brut : toujours affiché par interpolation, jamais comme HTML » (`talk.model.ts`).

**Correction** — Supprimer `DomSanitizer`, `bioHtml` et le `[innerHTML]`, puis afficher `<p class="spotlight__bio">{{ speaker.bio }}</p>`. Corriger aussi l'aide du formulaire, par exemple : « Texte brut : la bio s'affiche sur votre page speaker. »

### BLOCKER · SIG-01 · Le retour annonce toujours « Retiré de vos favoris »
`src/app/talks/talk-card.ts:28`

**Problème** — `!this.isFavorite` teste la fonction de l'input, toujours vraie, et jamais sa valeur. La branche « Ajouté » n'est jamais prise : quand on ajoute un favori, la région `role="status"` annonce « Retiré de vos favoris », y compris aux lecteurs d'écran.

**Correction** — `if (!this.isFavorite())`.

### BLOCKER · A11Y-02 · Les talks du speaker ne sont ni atteignables au clavier ni cliquables utilement
`src/app/speakers/speaker-spotlight.html:22`

**Problème** — `<div class="talk" (click)="select.emit(talk.id)">` ne prend pas le focus et ne réagit pas au clavier. Pire encore, le composant est routé : aucun parent n'écoute `select`, donc le clic ne fait rien même à la souris, malgré le `cursor: pointer` du CSS.

**Correction** — Une navigation est un lien : `<a class="talk" [routerLink]="['/talks', talk.id]">…</a>`, et l'output disparaît.

### BLOCKER · A11Y-03 · Le titre du talk n'a pas de label
`src/app/proposals/proposal-form.html:15`

**Problème** — `<input formControlName="title" placeholder="Titre du talk" />` n'a ni `<label for>` ni `aria-label`. Le placeholder disparaît dès la saisie et n'est pas toujours annoncé. C'est le seul champ obligatoire du formulaire.

**Correction** — `<label for="title" class="sr-only">Titre du talk</label>` puis `<input id="title" class="proposal__title" formControlName="title" placeholder="Titre du talk" />`. La classe `sr-only` existe déjà (`talk-card.html:11`).

### MAJOR · ZL-01 · La page speaker reste sur « Chargement du speaker… »
`src/app/speakers/speaker-spotlight.ts:33`

**Problème** — L'application est zoneless. `this.speaker = …`, `this.bioHtml = …` (l. 34) et `this.talks = …` (l. 36) sont des champs ordinaires affectés dans des callbacks HTTP, et rien ne planifie de rendu. `ChangeDetectionStrategy.Eager` n'y change rien : il dit *quoi* vérifier, pas *quand*. L'écran reste sur le chargement jusqu'au prochain événement du template.

**Correction** — Des signals ou des `computed()` : `protected readonly speaker = computed(() => this.talksStore.speakersById().get(this.id()));`

### MAJOR · RX-02 · Abonnements HTTP imbriqués
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — `getSpeaker(...).subscribe` est imbriqué dans `paramMap.subscribe`, et `getTalks(...).subscribe` dans le premier (l. 35). Si on passe d'un speaker à l'autre, la requête précédente n'est pas annulée et une réponse tardive peut afficher le speaker A avec les talks de B.

**Correction** — `paramMap.pipe(switchMap(p => this.speakerService.getSpeaker(p.get('id')!)), switchMap(...))` avec un seul abonnement, ou mieux, la piste d'ensemble (sans abonnement).

### MAJOR · RX-03 · Aucune gestion d'erreur sur la page speaker
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — Pas de `catchError` ni d'état d'erreur. Sur un 404 (id inconnu) ou une API injoignable, l'écran reste indéfiniment sur « Chargement du speaker… ».

**Correction** — Un état d'erreur visible avec une action : `@if (talksStore.talks.error()) { <p role="alert">Impossible de charger ce speaker. <button (click)="talksStore.reload()">Réessayer</button></p> }`, et un message « Speaker introuvable » si `speaker()` est `undefined` une fois le chargement terminé.

### MAJOR · NG-07 · Détection de changement forcée en Eager sans justification
`src/app/speakers/speaker-spotlight.ts:14`

**Problème** — `ChangeDetectionStrategy.Eager` fait vérifier le composant à chaque cycle, et aucun commentaire ne justifie ce choix. Il semble servir à contourner ZL-01, ce qu'il ne fait pas.

**Correction** — Supprimer la ligne (et l'import) une fois l'état passé en signals.

### MAJOR · NG-06 · Output nommé `select`, comme un événement DOM
`src/app/speakers/speaker-spotlight.ts:18`

**Problème** — `@Output() select` se confond avec l'événement natif `select`. Un parent qui écrirait `(select)` recevrait aussi l'événement DOM.

**Correction** — Supprimer l'output (voir A11Y-02). S'il reste utile, le nommer selon l'intention : `readonly talkSelected = output<string>();`

### MAJOR · A11Y-01 · Photo du speaker sans `alt`
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — `<img [src]="speaker.photoUrl" />` n'a pas d'`alt` : un lecteur d'écran lit l'URL du fichier. Par ailleurs, `photoUrl` n'existe pas dans l'interface `Speaker`.

**Correction** — `alt="Portrait de {{ speaker.name }}"`, et ajouter `photoUrl?: string` au modèle si l'API le fournit.

### MAJOR · SIG-02 · « Tout ajouter à mes favoris » ne met rien à jour
`src/app/favorites/favorites.store.ts:28`

**Problème** — `this.ids().push(id)` modifie le tableau sans changer sa référence. Le compteur « Mes favoris » ne bouge pas, l'effect ne persiste rien dans `localStorage` (un rechargement efface l'ajout) et les cartes ne passent pas en favori. Sans test `includes`, des doublons s'accumulent aussi.

**Correction** — `this.ids.update((ids) => (ids.includes(id) ? ids : [...ids, id]));`

### MAJOR · RX-01 · `valueChanges` jamais libéré
`src/app/proposals/proposal-form.ts:47`

**Problème** — `this.form.valueChanges.subscribe(v => this.draft = v)` est appelé sans `takeUntilDestroyed`. Chaque visite de `/proposals` laisse un abonnement vivant. Le champ `draft` est en plus inutile : le formulaire connaît déjà sa valeur.

**Correction** — Supprimer `draft` et l'abonnement, puis utiliser `{ ...this.form.getRawValue(), abstract: this.abstract() }` dans `submit()`.

### MAJOR · SIG-03 · `charCount` dérivé par un effect
`src/app/proposals/proposal-form.ts:37`

**Problème** — `effect(() => this.charCount.set(this.abstract().length))` met le compteur à jour un tour trop tard et ouvre la porte aux boucles.

**Correction** — `readonly charCount = computed(() => this.abstract().length);`. L'effect `localStorage` (l. 41) est légitime et reste.

### MAJOR · ZL-01 · Le message « Merci ! » ne s'affiche jamais
`src/app/proposals/proposal-form.ts:67`

**Problème** — `this.submitted = true` est affecté dans un `setTimeout`, sur un champ ordinaire, dans une application zoneless : aucun rendu n'est planifié. L'utilisateur envoie sa proposition et ne voit aucune confirmation, ce qui l'incite à la renvoyer.

**Correction** — `readonly submitted = signal(false);`, `this.submitted.set(true)`, et `@if (submitted())` dans le template. Le `setTimeout` n'a pas de raison d'être.

### MAJOR · NG-11 · La page speaker est chargée d'emblée
`src/app/app.routes.ts:22`

**Problème** — `component: SpeakerSpotlight` (avec l'import statique l. 3) met la page dans le bundle initial, alors que toutes les autres routes sont chargées à la demande.

**Correction** — `loadComponent: () => import('./speakers/speaker-spotlight').then((m) => m.SpeakerSpotlight)`, ou un `export default` comme `TalkDetail`, puis supprimer l'import l. 3.

### MAJOR · SEC-02 · URL d'API en dur
`src/app/speakers/speaker.service.ts:7`

**Problème** — `'http://localhost:3000/api/speakers'` casse hors du poste de dev et contourne `API_BASE_URL` (`src/app/core/api-base-url.ts`), que `TalksStore` utilise déjà. L'endpoint ne correspond pas non plus à l'API du projet (`speakers.json`).

**Correction** — `private readonly baseUrl = inject(API_BASE_URL);`, ou supprimer le service au profit de `TalksStore.speakersById()`.

### MAJOR · TEST-01 · Test focalisé
`src/app/speakers/speaker-spotlight.spec.ts:20`

**Problème** — Avec `it.only`, Vitest ne lance que ce test dans le fichier ; avec `CI=true`, la suite échoue.

**Correction** — `it(`.

### MAJOR · TEST-04 · Vrai `HttpClient` dans le test
`src/app/speakers/speaker-spotlight.spec.ts:13`

**Problème** — `provideHttpClient()` est fourni sans `provideHttpClientTesting()`. Dès que le test déclenchera `ngOnInit`, il appellera `localhost:3000`.

**Correction** — `providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]`, puis `HttpTestingController`, comme dans `talk-detail.spec.ts`.

### MINOR · TEST-03 · Le seul test ne vérifie que la création
`src/app/speakers/speaker-spotlight.spec.ts:20`

**Problème** — `expect(component).toBeTruthy()` sans `whenStable()` : `ngOnInit` ne tourne jamais, et le test passe alors que la page plante (SIG-04).

**Correction** — Fixer l'input `id`, attendre `whenStable()`, puis vérifier le nom, la bio en texte et les liens vers les talks.

### MINOR · NG-01 · `*ngIf` / `*ngFor` dans un nouveau template
`src/app/speakers/speaker-spotlight.html:3`

**Problème** — Ces directives sont dépréciées et le reste du projet utilise le control flow natif. Mêmes occurrences l. 5, 6 et 22, ainsi que `NgIf, NgFor` dans les imports (`speaker-spotlight.ts:11`).

**Correction** — `@if (speaker(); as s) { … } @else { <p class="status">Chargement du speaker…</p> }` et `@for (talk of talks(); track talk.id) { … }`.

### MINOR · NG-02 · Décorateurs `@Input` / `@Output`
`src/app/speakers/speaker-spotlight.ts:17`

**Problème** — `@Input() speakerId!` et `@Output() select` (l. 18). De plus, `withComponentInputBinding()` lie le paramètre `:id` à un input nommé `id` : `speakerId` n'est jamais alimenté par la route.

**Correction** — `readonly id = input.required<string>();`, qui remplace aussi la lecture de `paramMap`.

### MINOR · NG-04 · `any` pour le speaker et ses talks
`src/app/speakers/speaker-spotlight.ts:20`

**Problème** — `speaker: any` et `talks: any[]` (l. 21) : une faute de frappe dans le template passe la compilation.

**Correction** — `Speaker` et `Talk` de `talks/talk.model.ts`.

### MINOR · NG-12 · Calcul des initiales dupliqué
`src/app/speakers/speaker-spotlight.ts:42`

**Problème** — `getInitials` refait `initialsOf` (`talks/initials.ts`) en moins bien : il ne plafonne pas à deux lettres et casse sur un double espace. Il est en plus appelé avec un argument dans le template (`speaker-spotlight.html:6`, NG-08).

**Correction** — `protected readonly initials = computed(() => initialsOf(this.speaker()?.name ?? ''));` et `{{ initials() }}`.

### MINOR · NG-14 · Image sans `NgOptimizedImage`
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — `<img [src]>` au lieu de `ngSrc`. La règle est INFO, mais elle est relevée en MINOR parce qu'`AGENTS.md` en fait une convention du projet.

**Correction** — `<img [ngSrc]="s.photoUrl" width="80" height="80" alt="…">` et `NgOptimizedImage` dans les imports.

### MINOR · NG-04 · `Observable<any>` dans le service
`src/app/speakers/speaker.service.ts:11`

**Problème** — `getSpeaker` et `getTalks` (l. 16) renvoient `Observable<any>` : le contrat de l'API est perdu.

**Correction** — `this.http.get<Speaker>(…)` et `this.http.get<Talk[]>(…)`.

### MINOR · NG-03 · Injection par constructeur
`src/app/speakers/speaker.service.ts:9`

**Problème** — `constructor(private http: HttpClient)` va contre la convention `inject()`.

**Correction** — `private readonly http = inject(HttpClient);`

### MINOR · NG-05 · `console.log` oublié
`src/app/speakers/speaker.service.ts:12`

**Problème** — `console.log('getSpeaker', id)` part en production.

**Correction** — Supprimer la ligne.

### MINOR · TEST-02 · `SpeakerService` sans test
`src/app/speakers/speaker.service.ts:1`

**Problème** — C'est un nouveau service, sans `.spec.ts`.

**Correction** — Un test `HttpTestingController` sur l'URL appelée, ou supprimer le service (piste d'ensemble).

### MINOR · NG-09 · Formulaire non typé
`src/app/proposals/proposal-form.ts:16`

**Problème** — `UntypedFormBuilder` et `UntypedFormGroup` (l. 27) font sortir des `any` : `submit()` construit la proposition sans aucun contrôle de type.

**Correction** — `inject(FormBuilder).nonNullable.group({ title: ['', Validators.required], track: ['Frontend' as Track, Validators.required], bio: [''] })`, ou Signal Forms.

### MINOR · hors règles · L'envoi d'un formulaire invalide échoue en silence
`src/app/proposals/proposal-form.ts:61`

**Problème** — Sans titre, `submit()` appelle `markAllAsTouched()` et sort, mais aucun message d'erreur n'existe dans le template ni dans le CSS. L'utilisateur clique sur « Envoyer » et rien ne se passe.

**Correction** — Sous le champ titre : `@if (form.controls.title.touched && form.controls.title.invalid) { <p id="title-error" role="alert">Le titre est obligatoire.</p> }`, avec `aria-describedby="title-error"` sur l'input.

### MINOR · TEST-02 · `ProposalForm` sans test
`src/app/proposals/proposal-form.ts:1`

**Problème** — C'est un nouveau composant, avec de la logique (brouillon, validation, envoi), sans `.spec.ts`.

**Correction** — Tester le refus sans titre, l'affichage de la confirmation et la restauration du brouillon.

### MINOR · NG-10 · Guard écrit en classe
`src/app/proposals/proposal.guard.ts:7`

**Problème** — Sur du code neuf, la forme fonction est l'idiome du projet.

**Correction** — `export const proposalsOpen: CanActivateFn = () => Date.now() <= CFP_CLOSES_AT.getTime() || inject(Router).parseUrl('/');`

### MINOR · TEST-02 · Guard sans test
`src/app/proposals/proposal.guard.ts:1`

**Problème** — Le comportement à la date de clôture n'est vérifié par aucun test.

**Correction** — Deux tests avec `vi.setSystemTime` : avant et après le 30 novembre.

### INFO · NG-13 · `@Injectable({ providedIn: 'root' })` dans un nouveau fichier
`src/app/speakers/speaker.service.ts:5`

**Problème** — Angular 22 déclare un service racine avec `@Service()`. Même remarque pour `proposal.guard.ts:6` s'il reste en classe.

**Correction** — `@Service() export class SpeakerService { … }`

## Écartés à la vérification

- `src/app/speakers/speaker-spotlight.ts:30` · RX-01 — L'abonnement a bien un `takeUntilDestroyed`. Le vrai problème est l'appel hors contexte (SIG-04).
- `src/app/speakers/speaker-spotlight.ts:32` · RX-01 — Il s'agit d'un appel HTTP, qui se termine seul. Le problème réel est l'imbrication, fusionné dans RX-02.
- `src/app/speakers/speaker-spotlight.ts:35` · RX-01 — Même raison : appel HTTP, fusionné dans RX-02.
- `src/app/proposals/proposal-form.ts:52` · RX-01 — `takeUntilDestroyed(this.destroyRef)` avec un `DestroyRef` injecté : valide dans `ngOnInit`, pas de fuite.
- `src/app/proposals/proposal-form.ts:41` · SIG-03 — L'effect écrit dans `localStorage`, ce qui est un effet de bord légitime.
- `src/app/proposals/proposal-form.ts:20` · — `localStorage` lu à l'initialisation d'un signal : le projet n'a pas `@angular/ssr`.
- `src/app/proposals/proposal-form.ts:65` · SEC-05 — Une proposition de talk publique dans `localStorage` n'est pas une donnée sensible.
- `src/app/speakers/speaker-spotlight.html:13` · SEC-03 — `[innerHTML]` : même problème que SEC-01, fusionné.
- `src/app/speakers/speaker-spotlight.html:5`, `:6`, `:22` · NG-01 — Occurrences fusionnées dans le finding NG-01 (l. 3).
- `src/app/speakers/speaker-spotlight.ts:18` · NG-02 — Fusionné dans NG-02 (l. 17).
- `src/app/speakers/speaker-spotlight.ts:21`, `speaker.service.ts:16` · NG-04 — Fusionnés dans le finding NG-04 de leur fichier.
- `src/app/speakers/speaker-spotlight.html:6` · NG-08 — `getInitials(...)` dans le template : même correction que NG-12, fusionné.
- `src/app/talks/talk-card.html:3` · A11Y-04 — Le message de retour a bien `role="status"`.
