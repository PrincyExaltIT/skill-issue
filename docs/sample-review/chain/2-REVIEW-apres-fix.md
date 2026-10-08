# Review Angular — solution/review-fix → main

**Verdict : 🔴 REQUEST_CHANGES — corrections nécessaires avant merge**
Angular 22.2.1 · 19 fichier(s) revu(s) · 2026-10-08

> La branche ajoute la page speaker (/speakers/:id), le formulaire de proposition de talk (/proposals, protégé par un guard de date) et un retour textuel sur le bouton favori, puis enchaîne 21 commits de correction issus d'une review précédente. Le risque principal est fonctionnel : SpeakerService appelle http://localhost:3000, qui n'existe pas dans le projet, donc la nouvelle page speaker (liée depuis chaque carte de talk) échoue toujours. Le bouton de titre de talk y émet un output que personne n'écoute. Le reste porte sur la conformité aux conventions du projet (control flow natif, input(), inject(), typage, NgOptimizedImage) et sur le retour d'erreur du formulaire. La suite de tests n'a pas pu être exécutée pendant cette review.

| 🔴 BLOCKER | 🟠 MAJOR | 🟡 MINOR | 🔵 INFO |
|:---:|:---:|:---:|:---:|
| 1 | 2 | 15 | 5 |

## Findings

### 🔴 F-001 · R-ARCH-030 — URL d'API codée en dur
`src/app/speakers/speaker.service.ts:7` · architecture · confiance high · scan+review · sévérité MINOR → BLOCKER (orchestrator)

```ts
private baseUrl = 'http://localhost:3000/api/speakers';
```
**Problème** — Le service appelle `http://localhost:3000/api/speakers/...`, mais le dépôt ne fournit ni serveur sur ce port ni proxy (`angular.json`/`package.json` n'en déclarent pas). Les données de l'application sont les JSON statiques de `public/data` (`speakers.json`, `talks.json`), servis via le token `API_BASE_URL` (`/data`) qu'utilise `TalksStore`. Conséquence : avec `npm start` comme en production, chaque page `/speakers/:id` affiche « Impossible de charger ce speaker ». Or chaque carte de talk pointe désormais vers cette page (talk-card.html:28) : la fonctionnalité livrée par la branche est cassée à l'exécution.

**Correctif** — Brancher le service sur les données existantes : `private readonly baseUrl = inject(API_BASE_URL);` puis `getSpeaker(id)` = `this.http.get<Speaker[]>(`${this.baseUrl}/speakers.json`).pipe(map((all) => all.find((s) => s.id === id)))` et `getTalks(id)` = filtre de `talks.json` sur `speakerId` (ou réutiliser `TalksStore.speakersById()` / `schedule()`). Si une vraie API `/api/speakers` est prévue, la fournir via `API_BASE_URL` + proxy de dev, et ne pas merger avant qu'elle existe.

Source : https://angular.dev/guide/di/defining-dependency-providers

### 🟠 F-002 · R-ERR-008
`src/app/proposals/proposal-form.ts:59` · a11y-error · confiance high · review

```ts
      this.form.markAllAsTouched();
```
**Problème** — Quand le titre (requis) est vide, submit() marque le formulaire comme touché puis sort, mais rien n'exploite cet état : le template n'affiche aucun message d'erreur, aucun aria-invalid, et la CSS ne style pas .ng-invalid.ng-touched. Le clic sur « Envoyer ma proposition » ne produit donc aucun retour : un utilisateur voyant ne sait pas ce qui manque, un utilisateur de lecteur d'écran n'entend rien et le focus reste sur le bouton.

**Correctif** — Exposer l'erreur dans le template et la relier au champ, puis déplacer le focus sur le premier champ invalide :
<input id="proposal-title" ... [attr.aria-invalid]="titleInvalid()" [attr.aria-describedby]="titleInvalid() ? 'proposal-title-error' : null" />
@if (titleInvalid()) { <p id="proposal-title-error" class="field__error">Le titre est obligatoire.</p> }
Avec titleInvalid = signal(false) mis à jour dans submit() (form.get('title')!.invalid) — un signal, puisque l'appli est zoneless — et titleInput().nativeElement.focus() via viewChild.

Source : https://angular.dev/best-practices/error-handling

### 🟡 F-003 · R-SEC-001
`src/app/speakers/speaker-spotlight.html:18` · security · confiance high · review · sévérité MAJOR → MINOR

```html
<div class="spotlight__bio" [innerHTML]="speaker.bio"></div>
```
**Problème** — La bio vient de l'API (`speaker` typé `any`, aucun contrat) et elle est saisie par le speaker lui-même : le formulaire de proposition annonce « HTML autorisé (gras, liens…) : la bio s'affiche sur votre page speaker » (proposal-form.html:36). Du HTML saisi par un tiers est donc injecté dans la page publique. Le sanitizer automatique d'Angular retire `<script>`, les handlers `on*` et les URL `javascript:`, donc ce n'est pas une XSS exécutable aujourd'hui. Il laisse en revanche passer des liens et des images arbitraires : un speaker peut publier un faux lien « Billetterie » vers un site de phishing, un pixel de suivi `<img src="https://tracker…">` chargé par chaque visiteur, ou du balisage qui casse la mise en page. Cette sécurité repose sur un seul filet (le sanitizer) : tout futur `bypassSecurityTrustHtml` ajouté « pour garder le style » donnerait une XSS stockée.

**Correctif** — Afficher la bio en texte : `<p class="spotlight__bio">{{ speaker.bio }}</p>` avec `white-space: pre-line` dans le CSS, et retirer la mention « HTML autorisé » du formulaire. Si une mise en forme est nécessaire, accepter un sous-ensemble Markdown converti vers une liste blanche stricte (gras, italique, liens `https:` avec `rel="noopener nofollow ugc"`), assaini côté serveur à l'enregistrement. Typer `speaker` avec une interface `Speaker` pour que le contrat de `bio` soit explicite.

Source : https://angular.dev/best-practices/security#preventing-cross-site-scripting-xss

### 🟠 F-004 · R-ARCH-040
`src/app/speakers/speaker-spotlight.html:33` · architecture · confiance high · review

```html
      <button type="button" class="talk__select" (click)="talkSelected.emit(talk.id)">{{ talk.title }}</button>
```
**Problème** — `SpeakerSpotlight` n'est instancié que par le routeur (`speakers/:id` dans app.routes.ts ; aucun `<app-speaker-spotlight>` dans le code). Un composant routé n'a pas de parent qui écoute ses outputs : `talkSelected` n'est jamais consommé. Le bouton de titre de talk, rendu focusable et cliquable par F-003/F-019, ne fait donc rien pour l'utilisateur. Le test (spec ligne 148) ne vérifie que l'émission, pas un effet visible.

**Correctif** — Remplacer le bouton par un lien vers la page de détail existante et supprimer l'output : `<h3><a class="talk__select" [routerLink]="['/talks', talk.id]">{{ talk.title }}</a></h3>`. Adapter le test pour vérifier la navigation (`harness.routeNativeElement` / `TestBed.inject(Router).url`).

Source : https://angular.dev/guide/routing/common-router-tasks

### 🟡 F-005 · R-TEST-007
`src/app/speakers/speaker-spotlight.ts:72` · testing · confiance high · review · sévérité MAJOR → MINOR

```ts
    this.talks().forEach((talk) => this.favorites.add(talk.id));
```
**Problème** — Le bouton « Tout ajouter à mes favoris » (addAllToFavorites) est un comportement visible ajouté par le diff, mais aucun test de speaker-spotlight.spec.ts ne clique dessus. FavoritesStore.add() est testé seul, pas le branchement : si le bouton n'appelait plus la méthode, ou n'ajoutait que le premier talk, ou ajoutait les talks du speaker précédent, toute la suite resterait verte.

**Correctif** — Ajouter un test qui garde le vrai FavoritesStore (localStorage.clear() en beforeEach) : `await openSpeakerPage('camille-laurent'); page().querySelector<HTMLButtonElement>('.spotlight__talks-head button')!.click(); expect(TestBed.inject(FavoritesStore).favoriteIds()).toEqual(['signals-en-production', 'securite-front']);`, puis un second clic pour vérifier l'absence de doublon.

Source : https://angular.dev/guide/testing/components-scenarios

### 🟡 F-006 · R-A11Y-011
`src/app/talks/talk-card.html:3` · a11y-error · confiance medium · review · sévérité MAJOR → MINOR

```html
  <span class="talk-card__feedback" role="status">{{ feedback() }}</span>
```
**Problème** — Une live region par carte pose trois problèmes. (1) Sur /favoris, retirer un favori détruit la carte, donc sa région role="status" avec : « Retiré de vos favoris » n'est jamais annoncé, et le focus du bouton supprimé retombe sur <body>. C'est précisément le cas où l'annonce serait la plus utile. (2) La page affiche des dizaines de live regions, et le texte reste affiché indéfiniment à côté de chaque carte déjà basculée. (3) L'annonce est redondante avec aria-pressed, que le lecteur d'écran vocalise déjà au changement d'état du bouton.

**Correctif** — Sortir l'annonce de la carte : une seule région role="status" persistante au niveau de talk-list (ou de app.html), alimentée par un signal mis à jour dans le handler (favoriteToggled), qui survit à la destruction de la carte. Si @angular/cdk est ajouté (demander avant d'ajouter la dépendance, cf. AGENTS.md), utiliser LiveAnnouncer.announce('Retiré de vos favoris'). Sur /favoris, déplacer aussi le focus vers la carte suivante ou vers le titre de la liste après un retrait.

Source : https://angular.dev/best-practices/a11y

### 🟡 F-008 · R-A11Y-013
`src/app/proposals/proposal-form.html:15` · a11y-error · confiance medium · review

```html
  <label for="proposal-title" class="sr-only">Titre du talk</label>
```
**Problème** — Le label existe pour les technologies d'assistance, mais il est masqué visuellement : à l'écran, le placeholder « Titre du talk » est le seul libellé, et il disparaît dès la première frappe. C'est aussi le seul champ obligatoire du formulaire, sans aucune indication visible de ce caractère obligatoire.

**Correctif** — Rendre le label visible comme les autres champs (retirer sr-only, ou le placer dans un .field) et indiquer le caractère obligatoire : <label for="proposal-title">Titre du talk (obligatoire)</label> <input id="proposal-title" ... required />.

Source : https://angular.dev/best-practices/a11y

### 🟡 F-012 · R-ARCH-031 — Formulaires non typés
`src/app/proposals/proposal-form.ts:27` · architecture · confiance high · scan+review

```ts
form: UntypedFormGroup = this.fb.group({
```
**Problème** — Formulaire neuf non typé : toutes les valeurs sont `any`. L'annotation `(track: Track)` ligne 50 n'est donc qu'une affirmation non vérifiée, `form.get('track')` repose sur une chaîne non contrôlée, et le champ `draft` (ligne 32) duplique la valeur du formulaire via un abonnement alors que `getRawValue()` la fournit typée. Le fichier best-practices d'Angular 22 recommande même les Signal Forms pour un nouveau formulaire.

**Correctif** — `protected readonly form = inject(NonNullableFormBuilder).group({ title: ['', Validators.required], track: ['Frontend' as Track, Validators.required], bio: [''] });` puis `this.form.controls.track.valueChanges`, et dans `submit()` : `const proposal = { ...this.form.getRawValue(), abstract: this.abstract() };` (supprimer `draft` et son abonnement). Alternative : Signal Forms (`@angular/forms/signals`).

Source : https://angular.dev/guide/forms/typed-forms

### 🟡 F-014 · R-ERR-010
`src/app/proposals/proposal-form.ts:63` · a11y-error · confiance medium · review

```ts
    localStorage.setItem('conf-planner:last-proposal', JSON.stringify(proposal));
```
**Problème** — L'enregistrement de la proposition repose uniquement sur localStorage.setItem, qui peut lever une exception (QuotaExceededError, stockage bloqué en navigation privée ou par une politique navigateur). L'erreur part alors vers l'ErrorHandler global, la confirmation n'apparaît jamais et l'utilisateur ne reçoit aucun message : il croit sa proposition perdue, ou pense qu'il ne s'est rien passé.

**Correctif** — Protéger l'écriture au callsite et exposer un état d'erreur dans la région role="status" existante :
try {
  localStorage.setItem('conf-planner:last-proposal', JSON.stringify(proposal));
} catch (error) {
  console.error('proposal save failed', error);
  this.saveError.set(true); // affiché : « Impossible d'enregistrer votre proposition. Réessayez. »
  return;
}

Source : https://angular.dev/best-practices/error-handling

### 🔵 F-016 · R-ARCH-032 — Guard/resolver sous forme de classe
`src/app/proposals/proposal.guard.ts:7` · architecture · confiance high · scan+review · sévérité MINOR → INFO

```ts
export class ProposalGuard implements CanActivate {
```
**Problème** — Guard neuf écrit en classe (`implements CanActivate` + `@Injectable`) : non déprécié, mais l'idiome actuel est la fonction `CanActivateFn`, plus courte, sans service racine à déclarer, et testable par `TestBed.runInInjectionContext`.

**Correctif** — `export const proposalGuard: CanActivateFn = () => Date.now() > CFP_CLOSES_AT.getTime() ? inject(Router).parseUrl('/') : true;` puis `canActivate: [proposalGuard]` dans app.routes.ts (cela supprime aussi le `@Injectable({ providedIn: 'root' })`).

Source : https://angular.dev/guide/routing/route-guards

### 🟡 F-017 · R-ARCH-028 — Directives structurelles *ngIf/*ngFor/*ngSwitch (dépréciées depuis v20)
`src/app/speakers/speaker-spotlight.html:3` · architecture · confiance high · scan+review

```html
<section class="spotlight" *ngIf="speaker() as speaker; else loading">
```
**Problème** — `*ngIf … else` dans un template neuf, alors que NgIf est déprécié depuis Angular 20 et que AGENTS.md impose le control flow natif. Le même template mélange déjà `@if` (lignes 27 et 40) et `*ngIf`, et l'`ng-template #loading` n'existe que pour servir ce `else`.

**Correctif** — `@if (speaker(); as speaker) { <section class="spotlight">…</section> } @else if (loadError()) { <p role="alert">…</p> } @else { <p class="status">Chargement du speaker…</p> }`, puis retirer `NgIf`/`NgFor` des `imports` du composant. Migration : `ng generate @angular/core:control-flow`.

Source : https://angular.dev/guide/templates/control-flow

### 🟡 F-019 · R-PERF-034
`src/app/speakers/speaker-spotlight.html:8` · performance · confiance high · review

```html
[src]="speaker.photoUrl"
```
**Problème** — Le portrait du speaker est chargé via `[src]` sans NgOptimizedImage, alors que AGENTS.md impose NgOptimizedImage pour les images. C'est le premier visuel de la page (en-tête, au-dessus de la ligne de flottaison, candidat LCP) : pas de `width`/`height` intrinsèques dans le HTML (risque de CLS tant que la feuille de style n'est pas appliquée), pas de `fetchpriority=high`/preload, pas de `srcset`, et aucun avertissement en dev si l'image servie est surdimensionnée pour un rendu de 5rem (80 px).

**Correctif** — Importer `NgOptimizedImage` dans `imports` du composant et écrire : `<img class="spotlight__photo" [ngSrc]="speaker.photoUrl" width="80" height="80" priority [alt]="'Portrait de ' + speaker.name" />` (dimensions alignées sur `.spotlight__photo { width: 5rem; height: 5rem }`).

Source : AGENTS.md ; https://angular.dev/guide/image-optimization

### 🟡 F-024 · R-SIG-001 — Décorateurs @Input/@Output au lieu de input()/output()
`src/app/speakers/speaker-spotlight.ts:16` · reactivity · confiance high · scan+review

```ts
@Input() speakerId!: string;
```
**Problème** — Nouveau composant déclaré avec le décorateur @Input(), contraire à la convention du projet (AGENTS.md : input()/output()). En plus, `speakerId` n'est lu qu'une fois, dans `ngOnInit`, en repli de `paramMap` : il n'est pas réactif (un changement de valeur ne relance pas le chargement) et il n'est jamais lié, car `withComponentInputBinding()` lie le paramètre `:id` de la route à un input nommé `id`, pas `speakerId`. C'est du code mort qui fait croire que le composant est pilotable par input.

**Correctif** — Remplacer par un input signal nommé comme le paramètre de route et supprimer la plomberie `ActivatedRoute.paramMap` : `readonly id = input.required<string>();` (lié automatiquement par `withComponentInputBinding()`, comme dans `talk-detail.ts`). Le chargement se dérive alors de `this.id()` (voir R-SIG-007). Migration auto : `ng generate @angular/core:signal-input-migration`.

Source : https://angular.dev/guide/components/inputs

### 🟡 F-026 · R-ARCH-029 — `any` explicite
`src/app/speakers/speaker-spotlight.ts:19` · architecture · confiance high · scan+review

```ts
readonly speaker = signal<any>(undefined);
```
**Problème** — Le speaker est typé `any` alors que l'interface `Speaker` existe déjà (src/app/talks/talk.model.ts). Le type-checking strict des templates est donc aveugle : `speaker.photoUrl`, lu trois fois dans le template, n'existe pas dans le modèle `Speaker`, et aucune faute de frappe sur `name`/`company`/`handle` ne sera détectée au build.

**Correctif** — Typer le signal : `readonly speaker = signal<Speaker | undefined>(undefined);` et ajouter le champ manquant au modèle (`readonly photoUrl?: string;`) ou définir un type `SpeakerProfile extends Speaker` si la photo ne vient que de cette API.

Source : https://angular.dev/tools/cli/template-typecheck

### 🔵 F-029 · R-SIG-007
`src/app/speakers/speaker-spotlight.ts:60` · reactivity · confiance high · review · sévérité MINOR → INFO

```ts
      .subscribe((talks) => this.talks.set(talks));
```
**Problème** — Le chargement du speaker et de ses talks est fait à la main : un `subscribe` dans `ngOnInit` qui remplit quatre signals (`speaker`, `talks`, `loadError`, `talksError`) et réinitialise l'état dans un `tap`. Le flux est correct (switchMap, takeUntilDestroyed avec DestroyRef explicite), mais il réimplémente ce que `rxResource`/`httpResource` fournissent en standard depuis Angular 22 (chargement, erreur, annulation, rechargement quand le paramètre change) : 35 lignes d'état impératif à maintenir et à tester, et des drapeaux d'erreur qu'il faut penser à remettre à zéro.

**Correctif** — Dériver les données de l'input de route avec des resources :
```ts
readonly id = input.required<string>();
readonly speaker = rxResource({
  params: () => this.id(),
  stream: ({ params }) => this.speakerService.getSpeaker(params),
});
readonly talks = rxResource({
  params: () => this.id(),
  stream: ({ params }) => this.speakerService.getTalks(params),
  defaultValue: [],
});
```
Et dans le template : `speaker.isLoading()`, `speaker.error()`, `speaker.hasValue()` / `talks.error()`. `ngOnInit`, `DestroyRef`, `ActivatedRoute` et les signals `loadError`/`talksError` disparaissent.

Source : https://angular.dev/guide/signals/resource

### 🟡 F-030 · R-ARCH-024
`src/app/speakers/speaker-spotlight.ts:63` · architecture · confiance high · review

```ts
getInitials(name: string): string {
```
**Problème** — Réimplémentation de `initialsOf()` déjà présente dans src/app/talks/initials.ts, avec un comportement divergent : pas de limite à deux lettres et découpage sur un seul espace. « Marie Anne de la Tour » donne « MADLT » ici et « MA » sur la carte de talk : le même speaker affiche des initiales différentes selon la page. L'appel de méthode dans le template est en plus réévalué à chaque passage de détection de changements.

**Correctif** — Supprimer la méthode et exposer `protected readonly initials = computed(() => initialsOf(this.speaker()?.name ?? ''));`, puis `{{ initials() }}` dans le template.

Source : https://angular.dev/guide/signals#computed-signals

### 🟡 F-032 · R-TEST-001
`src/app/speakers/speaker.service.ts:6` · testing · confiance high · review

```ts
export class SpeakerService {
```
**Problème** — Le nouveau SpeakerService n'a pas de spec, et le seul test qui le concerne (speaker-spotlight.spec.ts) le remplace par un faux. Les URLs réellement appelées (`/api/speakers/:id` et `/api/speakers/:id/talks`) ne sont donc vérifiées nulle part : une faute dans le chemin passerait la CI et casserait la page speaker en production.

**Correctif** — Créer speaker.service.spec.ts avec `providers: [provideHttpClient(), provideHttpClientTesting()]`, puis `TestBed.inject(SpeakerService).getTalks('camille-laurent').subscribe(...)` et `TestBed.inject(HttpTestingController).expectOne('http://localhost:3000/api/speakers/camille-laurent/talks').flush([SIGNALS_TALK])`, avec `http.verify()` en afterEach.

Source : https://angular.dev/guide/http/testing

### 🟡 F-033 · R-ARCH-007 — Injection par paramètres de constructeur
`src/app/speakers/speaker.service.ts:9` · architecture · confiance high · scan+review

```ts
constructor(private http: HttpClient) {}
```
**Problème** — Injection par constructeur dans un service neuf, contraire à la convention du projet (AGENTS.md : `inject()`) et au reste du code (`TalksStore`, composants). Elle empêche aussi d'initialiser `baseUrl` à partir d'un token injecté dans un initialiseur de champ.

**Correctif** — `private readonly http = inject(HttpClient);` — migration automatique : `ng generate @angular/core:inject`.

Source : https://angular.dev/reference/migrations/inject-function

### 🟡 F-034 · R-ARCH-029 — `any` explicite
`src/app/speakers/speaker.service.ts:11` · architecture · confiance high · scan+review

```ts
getSpeaker(id: string): Observable<any> {
```
**Problème** — `Observable<any>` à la frontière HTTP : le `any` se propage dans tout le composant (`speaker.id` ligne 51 de speaker-spotlight.ts, template), et c'est la source des deux autres `any` du composant.

**Correctif** — `getSpeaker(id: string): Observable<Speaker> { return this.http.get<Speaker>(`${this.baseUrl}/${id}`); }`

Source : https://angular.dev/tools/cli/template-typecheck

### 🟡 F-035 · R-ARCH-022 — console.log résiduel
`src/app/speakers/speaker.service.ts:12` · architecture · confiance high · scan+review

```ts
console.log('getSpeaker', id);
```
**Problème** — Log de debug résiduel : il s'exécute à chaque navigation vers une page speaker et pollue la console en production.

**Correctif** — Supprimer la ligne.

Source : https://angular.dev/best-practices/error-handling

### 🔵 F-040 · R-A11Y-014
`src/app/speakers/speaker-spotlight.html:11` · a11y-error · confiance medium · review

```html
    <span *ngIf="!speaker.photoUrl" class="spotlight__initials">{{ getInitials(speaker.name) }}</span>
```
**Problème** — Quand il n'y a pas de photo, l'avatar à initiales est lu tel quel par le lecteur d'écran (« J D ») juste avant le <h1> qui donne déjà le nom complet. C'est du bruit, et ça diffère de talk-card, où l'avatar à initiales est masqué avec aria-hidden.

**Correctif** — Le traiter comme une image décorative : <span class="spotlight__initials" aria-hidden="true">{{ getInitials(speaker.name) }}</span>.

Source : https://angular.dev/best-practices/a11y

### 🔵 F-041 · R-TEST-003
`src/app/speakers/speaker-spotlight.spec.ts:63` · testing · confiance medium · review

```ts
    expect(component).toBeTruthy();
```
**Problème** — Le test « should create » ne vérifie que l'existence de l'instance et repose sur un `TestBed.createComponent(SpeakerSpotlight)` (ligne 40) créé hors routeur, que les autres tests n'utilisent pas : tous passent par RouterTestingHarness. Ce composant en trop est instancié avant chaque test, et le test reste vert même quand la page est cassée. Les autres tests couvrent déjà le rendu réel.

**Correctif** — Supprimer le test « should create » ainsi que les variables `fixture` et `component` du beforeEach, et ne garder que `harness = await RouterTestingHarness.create();`.

Source : https://angular.dev/guide/testing/components-basics

### 🔵 F-042 · R-ERR-006
`src/app/speakers/speaker-spotlight.ts:43` · a11y-error · confiance medium · review

```ts
            catchError(() => {
```
**Problème** — Les deux catchError (lignes 43 et 52) donnent bien un retour utilisateur (loadError / talksError, affichés en role="alert"), mais ils jettent l'erreur sans la consigner. Une 404, une 500 ou une erreur réseau deviennent indiscernables, et on perd le contexte (id du speaker) au diagnostic.

**Correctif** — Conserver l'erreur pour le diagnostic : catchError((error) => { console.error('getSpeaker failed', { id, error }); this.loadError.set(true); return EMPTY; }) (idem pour getTalks avec speaker.id), ou passer par un service de logging s'il existe.

Source : https://angular.dev/best-practices/error-handling

## Écartés à la vérification

Candidats rejetés pendant l'étape de vérification, avec la raison. Ils alimentent les evals (précision du skill).

- ~~R-PERF-002~~ `src/app/app.routes.ts:23` — La forme .then((m) => m.SpeakerSpotlight) est valide et sans coût : question de cohérence de style, sans conséquence.
- ~~R-ARCH-031~~ `src/app/proposals/proposal-form.ts:3` — Regroupé dans F-012 (même règle, même fichier).
- ~~R-ARCH-031~~ `src/app/proposals/proposal-form.ts:16` — Regroupé dans F-012 (même règle, même fichier).
- ~~R-ARCH-008~~ `src/app/proposals/proposal-form.ts:21` — Composant routé chargé en export default : aucun parent ne peut accéder à ses membres. Style, sans conséquence concrète.
- ~~R-ARCH-013~~ `src/app/proposals/proposal-form.ts:53` — Convention de nommage sans conséquence fonctionnelle.
- ~~R-ARCH-016~~ `src/app/proposals/proposal-form.ts:63` — Pas de backend dans le projet : la persistance locale simulée est assumée ; aucune conséquence concrète aujourd'hui.
- ~~R-ARCH-028~~ `src/app/speakers/speaker-spotlight.html:6` — Regroupé dans F-017 (même règle, même fichier).
- ~~R-ARCH-028~~ `src/app/speakers/speaker-spotlight.html:11` — Regroupé dans F-017 (même règle, même fichier).
- ~~R-PERF-037~~ `src/app/speakers/speaker-spotlight.html:11` — Regroupé dans F-030 : remplacer getInitials par un computed basé sur initialsOf règle les deux points.
- ~~R-ARCH-028~~ `src/app/speakers/speaker-spotlight.html:31` — Regroupé dans F-017 (même règle, même fichier).
- ~~R-PERF-036~~ `src/app/speakers/speaker-spotlight.html:31` — Couvert par F-017 : la migration vers @for impose track talk.id.
- ~~R-ARCH-026~~ `src/app/speakers/speaker-spotlight.ts:16` — Doublon de F-024 (même ligne).
- ~~R-ARCH-029~~ `src/app/speakers/speaker-spotlight.ts:20` — Regroupé dans F-026 (même règle, même fichier).
- ~~R-ARCH-008~~ `src/app/speakers/speaker-spotlight.ts:21` — Composant routé : aucun parent n'accède à ses membres. Style, sans conséquence concrète.
- ~~R-TEST-001~~ `src/app/speakers/speaker.service.ts:1` — Regroupé dans F-032 (même règle, même fichier).
- ~~R-ARCH-029~~ `src/app/speakers/speaker.service.ts:16` — Regroupé dans F-034 (même règle, même fichier).
- ~~R-SIG-009~~ `src/app/proposals/proposal-form.ts:27` — Regroupé dans F-012 (même formulaire non typé ; Signal Forms mentionné en note).
- ~~R-ARCH-034~~ `src/app/proposals/proposal.guard.ts:6` — Regroupé dans F-016 (même fichier, même classe).
- ~~R-PERF-034~~ `src/app/speakers/speaker-spotlight.html:5` — Doublon de F-019 (même image).
- ~~R-ARCH-034~~ `src/app/speakers/speaker.service.ts:5` — @Injectable reste valide en v22 ; limite de 5 INFO atteinte, et passer à inject() (F-033) prime.

## Points positifs

- La bio n'est plus contournée via bypassSecurityTrustHtml : le sanitizer d'Angular s'applique à nouveau.
- Flux de chargement speaker/talks propre : switchMap qui annule les requêtes obsolètes, takeUntilDestroyed avec DestroyRef explicite, et états d'erreur distincts annoncés en role=alert.
- Les corrections de la review précédente sont atomiques, une par commit, chacune référencée et accompagnée de tests ciblés (fake timers Vitest pour le guard et la confirmation d'envoi).

## Reviewers

- scan — 21 constat(s) brut(s)
- angular-a11y-error-reviewer — 6 constat(s) brut(s)
- angular-architecture-reviewer — 21 constat(s) brut(s)
- angular-performance-reviewer — 4 constat(s) brut(s)
- angular-reactivity-reviewer — 3 constat(s) brut(s)
- angular-security-reviewer — 1 constat(s) brut(s)
- angular-testing-reviewer — 3 constat(s) brut(s)
- orchestrator — 2 constat(s) brut(s)

## Validation empirique

Non exécutée.

---

<sub>angular-review v2 · règles : `references/*.md` · verdict calculé par `scripts/findings.mjs` (≥ 1 BLOCKER ou ≥ 3 MAJOR → REQUEST_CHANGES ; 0 finding → APPROVE ; sinon COMMENT) · données : `.review/findings.json`</sub>
