# Revue — speaker-spotlight (HEAD 35d2f12 = feat/speaker-spotlight) → depart

**Verdict : à corriger**

La branche ajoute la fiche speaker (`/speakers/:id`) et le formulaire de proposition de talk (`/proposals`). Elle ne doit pas être mergée en l'état : le clic favori affiche toujours le mauvais message, la page speaker lève NG0203 au chargement, le sanitizer contourne la protection XSS sur la bio, et la proposition n'est jamais envoyée au serveur alors que l'interface annonce qu'elle est enregistrée.

Périmètre : diff `depart...HEAD` (15 fichiers, +466 / -2). Le code applicatif de `feat/speaker-spotlight` est identique à celui de HEAD ; cette branche ajoute en plus le kit skill-issue (CI, AGENTS.md, skills, README), non relu ici.

| BLOCKER | MAJOR | MINOR | INFO |
|:---:|:---:|:---:|:---:|
| 6 | 14 | 11 | 2 |

## Findings

### BLOCKER · SIG-01 · Signal testé sans être appelé
`src/app/talks/talk-card.ts:28`

**Problème** — `isFavorite` est un `input()` : sans `()`, `!this.isFavorite` vaut toujours `false`. Le message est donc toujours « Retiré de vos favoris », même à l'ajout.

**Correction** — `this.feedback.set(this.isFavorite() ? 'Retiré de vos favoris' : 'Ajouté à vos favoris');`

### BLOCKER · SIG-04 · API à contexte d'injection appelée hors contexte (NG0203)
`src/app/speakers/speaker-spotlight.ts:30`

**Problème** — `takeUntilDestroyed()` sans argument est appelé dans `ngOnInit`. Il lève NG0203 à l'exécution : la page speaker ne s'affiche pas.

**Correction** — injecter `private readonly destroyRef = inject(DestroyRef);` en champ et écrire `takeUntilDestroyed(this.destroyRef)`, ou remplacer tout le bloc par un observable unique (voir RX-02).

### BLOCKER · SEC-01 · Sanitizer contourné
`src/app/speakers/speaker-spotlight.ts:34` (affiché par `src/app/speakers/speaker-spotlight.html:13`)

**Problème** — `bypassSecurityTrustHtml(speaker.bio)` fait passer la bio en HTML brut. `src/app/talks/talk.model.ts:22` documente pourtant le champ comme texte brut, et `src/app/proposals/proposal-form.html:35` annonce « HTML autorisé ». Le contrat est contradictoire, et toute bio contenant du HTML devient une XSS.

**Correction** — retirer `DomSanitizer` et afficher `{{ speaker.bio }}`. Corriger en même temps le hint de `proposal-form.html:35`.

### BLOCKER · A11Y-02 · Clic sur un élément non interactif
`src/app/speakers/speaker-spotlight.html:22`

**Problème** — `<div class="talk" (click)="select.emit(talk.id)">` ne prend pas le focus et ne réagit pas au clavier : les talks d'un speaker sont inaccessibles au clavier.

**Correction** — un lien : `<a class="talk" [routerLink]="['/talks', talk.id]">` (RouterLink est déjà importé). Le output `select` n'a alors plus d'usage.

### BLOCKER · A11Y-03 · Champ de formulaire sans label
`src/app/proposals/proposal-form.html:15`

**Problème** — l'input du titre n'a que `placeholder="Titre du talk"`. Le placeholder disparaît à la saisie et n'est pas annoncé de façon fiable.

**Correction** — `<label for="title" class="sr-only">Titre du talk</label>` puis `id="title"` sur l'input (ou un label visible).

### BLOCKER · hors règles · Proposition jamais envoyée, confirmation affichée quand même
`src/app/proposals/proposal-form.ts:64`

**Problème** — `submit()` ne fait que `localStorage.setItem('conf-planner:last-proposal', …)`. Aucun appel HTTP n'existe, et le message « Votre proposition a bien été enregistrée » s'affiche quand même. L'organisateur ne reçoit jamais la proposition, et le titre et la bio restent dans le navigateur (SEC-05).

**Correction** — envoyer la proposition via un service HTTP avec gestion d'erreur (RX-03), et n'afficher la confirmation qu'après succès. Si le backend n'existe pas encore, le signaler dans la PR plutôt que de simuler l'envoi.

### MAJOR · SIG-02 · Valeur d'un signal modifiée en place
`src/app/favorites/favorites.store.ts:28`

**Problème** — `this.ids().push(id)` modifie le tableau sans changer sa référence : ni `count`, ni la vue, ni l'effet de persistance ne sont notifiés. « Tout ajouter » ne met donc pas le compteur à jour et n'est sauvegardé qu'au prochain changement. Les doublons ne sont pas évités.

**Correction** — `add(id: string): void { this.ids.update((ids) => (ids.includes(id) ? ids : [...ids, id])); }`

### MAJOR · SIG-03 · `effect()` qui écrit dans un signal
`src/app/proposals/proposal-form.ts:38`

**Problème** — `charCount` est alimenté par un `effect()` qui fait `.set()` : la valeur se met à jour un tour trop tard et ouvre la porte aux boucles.

**Correction** — `readonly charCount = computed(() => this.abstract().length);`, puis supprimer l'effet (lignes 37-39).

### MAJOR · RX-01 · Abonnement jamais libéré
`src/app/proposals/proposal-form.ts:47`

**Problème** — `this.form.valueChanges.subscribe(…)` dans `ngOnInit` n'est jamais libéré, alors que la ligne 51 du même hook utilise `takeUntilDestroyed`.

**Correction** — `this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((v) => (this.draft = v));`

### MAJOR · ZL-01 · Champ ordinaire modifié dans un callback asynchrone (zoneless)
`src/app/proposals/proposal-form.ts:67`

**Problème** — `submitted` est un champ ordinaire lu par le template (`@if (submitted)`, `proposal-form.html:9`) et modifié dans un `setTimeout`. En zoneless, la confirmation n'apparaît jamais. Le délai de 300 ms n'a aucune justification.

**Correction** — `readonly submitted = signal(false);`, `this.submitted.set(true)` sans `setTimeout`, et `@if (submitted())` dans le template.

### MAJOR · NG-07 · Détection de changement forcée en Eager
`src/app/speakers/speaker-spotlight.ts:14`

**Problème** — `ChangeDetectionStrategy.Eager` fait vérifier le composant à chaque cycle, sans justification. OnPush est déjà le défaut.

**Correction** — retirer la ligne `changeDetection`.

### MAJOR · NG-06 · `output()` nommé comme un événement DOM
`src/app/speakers/speaker-spotlight.ts:18`

**Problème** — `@Output() select` porte le nom d'un événement DOM natif : le parent peut recevoir les deux, ou le mauvais.

**Correction** — supprimer l'output (voir A11Y-02) ou le nommer selon l'intention, `talkSelected`, avec `output<string>()`.

### MAJOR · RX-02 · Abonnements imbriqués
`src/app/speakers/speaker-spotlight.ts:35`

**Problème** — `getTalks` est appelé dans le `subscribe` de `getSpeaker`, lui-même dans le `subscribe` de `paramMap`. Rien n'annule la requête précédente quand le paramètre change : réponses dans le désordre et abonnements qui s'accumulent.

**Correction** — un seul pipeline : `route.paramMap.pipe(map((p) => p.get('id')), switchMap((id) => this.speakerService.getSpeaker(id)), switchMap((speaker) => …forkJoin ou combineLatest avec getTalks…))`, puis `toSignal`.

### MAJOR · RX-03 · Erreur HTTP non gérée
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — ni `getSpeaker` ni `getTalks` n'ont de `catchError`. En cas d'échec, l'écran reste sur « Chargement du speaker… » sans issue.

**Correction** — un état d'erreur visible (`role="alert"`, message et lien de retour) alimenté par `catchError`.

### MAJOR · ZL-01 · Champ ordinaire modifié dans un callback asynchrone (zoneless)
`src/app/speakers/speaker-spotlight.ts:33`

**Problème** — `speaker`, `bioHtml` (ligne 34) et `talks` (ligne 36) sont des champs lus par le template et modifiés dans les callbacks HTTP. En zoneless, la page ne se met pas à jour après le chargement.

**Correction** — passer par des signaux : `toSignal` sur le pipeline unique de RX-02, ou `httpResource`.

### MAJOR · A11Y-01 · Image sans alt
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — `<img *ngIf="speaker.photoUrl" [src]="speaker.photoUrl" />` n'a pas d'attribut `alt`.

**Correction** — `[alt]="'Portrait de ' + speaker.name"`.

### MAJOR · SEC-02 · URL en dur
`src/app/speakers/speaker.service.ts:7`

**Problème** — `http://localhost:3000/api/speakers` contourne la configuration `API_BASE_URL` déjà utilisée par `src/app/talks/talks.store.ts:3`.

**Correction** — injecter `API_BASE_URL` (`src/app/core/api-base-url.ts`) comme le fait `TalksStore`.

### MAJOR · NG-11 · Page chargée d'emblée
`src/app/app.routes.ts:22`

**Problème** — `component: SpeakerSpotlight` avec l'import statique de la ligne 3 place la page dans le bundle initial, alors que les autres routes sont chargées à la demande.

**Correction** — `{ path: 'speakers/:id', loadComponent: () => import('./speakers/speaker-spotlight').then((m) => m.SpeakerSpotlight), title: 'Speaker · Conf Planner' }`, et supprimer l'import de la ligne 3.

### MAJOR · TEST-01 · Test focalisé
`src/app/speakers/speaker-spotlight.spec.ts:20`

**Problème** — `it.only` : seul ce test tourne. Avec `CI=true`, Vitest échoue ; sans, la suite passe sans rien vérifier d'autre.

**Correction** — `it(` à la place.

### MAJOR · TEST-04 · Test qui appelle le vrai backend
`src/app/speakers/speaker-spotlight.spec.ts:13`

**Problème** — `provideHttpClient()` réel : toute requête partirait vers `localhost`.

**Correction** — `provideHttpClientTesting()` et `HttpTestingController` pour vérifier les requêtes attendues.

### MINOR · NG-09 · Formulaire non typé
`src/app/proposals/proposal-form.ts:16`

**Problème** — `UntypedFormBuilder` et `UntypedFormGroup` (ligne 27) renvoient des `any`.

**Correction** — `inject(FormBuilder).nonNullable.group({ title: ['', Validators.required], track: ['Frontend' as Track, Validators.required], bio: [''] })`, ou Signal Forms.

### MINOR · hors règles · Limite de 600 caractères non appliquée
`src/app/proposals/proposal-form.html:28`

**Problème** — le hint affiche « / 600 caractères » mais rien ne limite la saisie. Le textarea n'est pas dans le `FormGroup` : `form.invalid` ignore donc le résumé.

**Correction** — `maxlength="600"` et un contrôle dans le formulaire réactif (`Validators.maxLength(600)`, `Validators.required`).

### MINOR · NG-01 · Directive structurelle dépréciée
`src/app/speakers/speaker-spotlight.html:3`

**Problème** — `*ngIf` (lignes 3, 5, 6), `*ngFor` (ligne 22) et `NgIf`/`NgFor` dans `speaker-spotlight.ts:1` et `:11`.

**Correction** — `@if (speaker) { … } @else { … }` et `@for (talk of talks(); track talk.id) { … }`.

### MINOR · NG-04 · Type `any`
`src/app/speakers/speaker-spotlight.ts:20`

**Problème** — `speaker: any` et `talks: any[]` (ligne 21) coupent le typage. Des `Speaker` et `Talk` existent dans `talk.model.ts`.

**Correction** — `speaker: Speaker | undefined;` et `talks: Talk[] = [];`.

### MINOR · NG-02 · Décorateur `@Input` / `@Output`
`src/app/speakers/speaker-spotlight.ts:17`

**Problème** — `@Input() speakerId!` n'est jamais alimenté (pas de `withComponentInputBinding`) : le fallback `params.get('id') ?? this.speakerId` (ligne 31) ne sert à rien.

**Correction** — supprimer `speakerId` et lire uniquement le paramètre de route.

### MINOR · NG-03 · Injection par constructeur
`src/app/speakers/speaker.service.ts:9`

**Problème** — `constructor(private http: HttpClient)`.

**Correction** — `private readonly http = inject(HttpClient);`

### MINOR · NG-04 · Type `any`
`src/app/speakers/speaker.service.ts:11`

**Problème** — `Observable<any>` ici et ligne 16 (`getTalks`).

**Correction** — `this.http.get<Speaker>(…)` retourné en `Observable<Speaker>`, et `Observable<Talk[]>` pour `getTalks`.

### MINOR · NG-05 · Trace de débogage oubliée
`src/app/speakers/speaker.service.ts:12`

**Problème** — `console.log('getSpeaker', id)` laissé dans le code.

**Correction** — supprimer la ligne.

### MINOR · NG-10 · Guard écrit en classe
`src/app/proposals/proposal.guard.ts:7`

**Problème** — `implements CanActivate` sur une classe : la forme dépréciée, plus difficile à tester seule.

**Correction** — `export const proposalsOpen: CanActivateFn = () => …`, puis `canActivate: [proposalsOpen]` dans `app.routes.ts:26`.

### MINOR · TEST-02 · Nouveau fichier sans test
`src/app/proposals/proposal-form.ts:1`

**Problème** — `proposal-form.ts`, `proposal.guard.ts` et `speaker.service.ts` sont des fichiers nouveaux sans `.spec.ts`.

**Correction** — un test de comportement par fichier : le formulaire affiche la confirmation après envoi, le guard redirige après le 30 novembre, le service appelle la bonne URL (`HttpTestingController`).

### MINOR · TEST-03 · Test qui ne vérifie que la création
`src/app/speakers/speaker-spotlight.spec.ts:21`

**Problème** — seule assertion : `expect(component).toBeTruthy()`.

**Correction** — tester un rendu ou une requête attendue (le nom du speaker affiché pour un id donné).

### INFO · NG-13 · Service racine déclaré avec `providedIn: 'root'`
`src/app/speakers/speaker.service.ts:5`

**Problème** — convention 2025 : `@Injectable({ providedIn: 'root' })` est remplacé par `@Service()` dans Angular 22.

**Correction** — `@Service() export class SpeakerService { … }`.

### INFO · NG-14 · Image sans `NgOptimizedImage`
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — `<img [src]="…">` sans `NgOptimizedImage`.

**Correction** — `<img [ngSrc]="speaker.photoUrl" width="80" height="80" [alt]="…">`, en gardant `alt` (voir A11Y-01).
