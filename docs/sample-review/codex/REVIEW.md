# Review Angular — feat/speaker-spotlight → main

**Verdict : 🔴 REQUEST_CHANGES — corrections nécessaires avant merge**
Angular 22.2.1 · 15 fichier(s) revu(s) · 2026-10-08

> La branche ajoute une page speaker, un formulaire de proposition, un guard de clôture et du feedback favori. Le périmètre est à haut risque avant merge : la page speaker peut planter à l'ouverture (NG0203), rend du HTML d'API comme trusted, contient deux barrières clavier/lecteur d'écran et plusieurs états ne rafraîchissent pas en mode zoneless. La suite et le build n'ont pas pu être exécutés dans ce sandbox car Node 24.12.0 est inférieur au minimum 24.15.0 exigé par Angular CLI ; cette validation reste donc à refaire dans l'environnement du projet.

| 🔴 BLOCKER | 🟠 MAJOR | 🟡 MINOR | 🔵 INFO |
|:---:|:---:|:---:|:---:|
| 8 | 13 | 16 | 0 |

## Findings

### 🔴 F-001 · R-A11Y-013 — Champ de formulaire sans label
`src/app/proposals/proposal-form.html:15` · a11y · confiance low · scan+review

```html
<input class="proposal__title" formControlName="title" placeholder="Titre du talk" />
```
**Problème** — Le champ de titre n'a aucun libellé accessible : le placeholder disparaît dès la saisie et n'est pas annoncé comme un label fiable par les technologies d'assistance.

**Correctif** — Ajouter un `<label for="proposal-title">Titre du talk</label>` et `id="proposal-title"` sur l'input (éventuellement avec une classe de label visuellement masqué).

Source : https://angular.dev/best-practices/a11y

### 🔴 F-002 · R-ARCH-017 — subscribe sans désabonnement dans un composant/directive
`src/app/proposals/proposal-form.ts:47` · architecture · confiance medium · scan+review

```ts
this.form.valueChanges.subscribe(v => this.draft = v);
```
**Problème** — Cet abonnement à `valueChanges`, une source qui ne se termine pas, conserve chaque instance détruite de `ProposalForm`; des navigations répétées vers le formulaire accumulent les abonnements et les callbacks.

**Correctif** — Ajouter `.pipe(takeUntilDestroyed(this.destroyRef))` avant `subscribe`, ou dériver la valeur via l'interop signal/RxJS.

Source : https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed

### 🔴 F-003 · R-A11Y-005 — (click) sur un élément non interactif
`src/app/speakers/speaker-spotlight.html:22` · a11y · confiance medium · scan+review

```html
<div class="talk" *ngFor="let talk of talks" (click)="select.emit(talk.id)">
```
**Problème** — Chaque talk est cliquable via un `<div>` non focusable et sans comportement clavier : les utilisateurs au clavier ne peuvent pas déclencher la sélection.

**Correctif** — Utiliser un élément natif `<button type="button">` pour l'action, ou un `<a>` si la sélection navigue vers le talk, puis conserver le style visuel sur cet élément.

Source : https://angular.dev/best-practices/a11y

### 🔴 F-004 · R-SIG-005 — API à contexte d'injection appelée hors contexte (NG0203)
`src/app/speakers/speaker-spotlight.ts:30` · reactivity · confiance medium · scan+review

```ts
this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
```
**Problème** — `takeUntilDestroyed()` est appelé sans `DestroyRef` dans `ngOnInit`, donc hors contexte d'injection. L'ouverture de la route speaker lève NG0203 avant tout chargement et la page reste bloquée.

**Correctif** — Injecter `DestroyRef` dans un champ et appeler `takeUntilDestroyed(this.destroyRef)`, ou construire toute la chaîne dans un initialiseur de champ avec `toSignal`/`resource`.

Source : https://angular.dev/errors/NG0203

### 🔴 F-005 · R-ERR-005
`src/app/speakers/speaker-spotlight.ts:32` · a11y-errors · confiance high · review

```ts
this.speakerService.getSpeaker(id).subscribe((speaker) => {
```
**Problème** — La requête du speaker est consommée sans callback `error` ni `catchError`; une réponse HTTP en erreur remonte comme erreur non gérée et la page reste sur « Chargement du speaker… ».

**Correctif** — Gérer l'erreur dans la chaîne RxJS (`catchError`) et exposer un état d'erreur visible dans le template, idéalement via `rxResource`/`httpResource`.

Source : https://angular.dev/best-practices/error-handling

### 🔴 F-006 · R-SEC-003 — bypassSecurityTrust* (sanitizer contourné)
`src/app/speakers/speaker-spotlight.ts:34` · security · confiance medium · scan+review

```ts
this.bioHtml = this.sanitizer.bypassSecurityTrustHtml(speaker.bio);
```
**Problème** — La bio renvoyée par l'API est déclarée sûre sans aucun assainissement, puis injectée avec `[innerHTML]`. Si un tiers contrôle `speaker.bio`, un payload stocké comme `<img src=x onerror=...>` contourne le sanitizer Angular et exécute du JavaScript dans le navigateur de chaque visiteur de la page speaker.

**Correctif** — Supprimer `bypassSecurityTrustHtml`, conserver la bio comme chaîne et laisser Angular assainir le binding `[innerHTML]`; appliquer aussi une allow-list côté serveur à l'enregistrement si le HTML riche doit rester autorisé, et couvrir un payload avec attribut `onerror` par un test.

Source : https://angular.dev/best-practices/security

### 🔴 F-007 · R-ERR-005
`src/app/speakers/speaker-spotlight.ts:35` · a11y-errors · confiance high · review

```ts
this.speakerService.getTalks(speaker.id).subscribe((talks) => {
```
**Problème** — La requête des talks n'a aucune gestion d'erreur; un échec HTTP devient une erreur RxJS non gérée sans message pour l'utilisateur.

**Correctif** — Composer cette requête dans la chaîne principale avec `switchMap` et `catchError`, puis rendre un état d'erreur ou une liste de repli explicite.

Source : https://angular.dev/best-practices/error-handling

### 🔴 F-008 · R-SIG-010 — Signal testé sans être appelé
`src/app/talks/talk-card.ts:28` · reactivity · confiance high · scan+review

```ts
if (!this.isFavorite) {
```
**Problème** — `isFavorite` est un `InputSignal`, donc une fonction toujours truthy. La négation est toujours fausse : cliquer sur un talk non favori affiche systématiquement « Retiré de vos favoris » au lieu de « Ajouté ».

**Correctif** — Lire la valeur du signal : `if (!this.isFavorite()) { ... }`.

Source : https://angular.dev/guide/signals

### 🟠 F-009 · R-PERF-001
`src/app/app.routes.ts:22` · performance · confiance high · review

```ts
{ path: 'speakers/:id', component: SpeakerSpotlight, title: 'Speaker · Conf Planner' },
```
**Problème** — Cette route secondaire charge `SpeakerSpotlight` et tout son graphe (HTTP, template, styles) dans le bundle initial, même si l'utilisateur ne consulte jamais une page speaker.

**Correctif** — Supprimer l'import statique et charger la page à la demande, par exemple `loadComponent: () => import('./speakers/speaker-spotlight').then(m => m.SpeakerSpotlight)` (ou exporter la classe par défaut pour utiliser la forme courte).

Source : https://angular.dev/best-practices/performance/lazy-loaded-routes

### 🟠 F-010 · R-SIG-004 — Mutation en place de la valeur d'un signal
`src/app/favorites/favorites.store.ts:28` · reactivity · confiance medium · scan+review

```ts
this.ids().push(id);
```
**Problème** — `add()` modifie le tableau du signal en place sans changer sa référence. Le signal ne notifie donc ni `count`, ni l'effet de persistance, ni les vues zoneless : « Tout ajouter à mes favoris » peut laisser le compteur et `localStorage` inchangés jusqu'à une autre mise à jour.

**Correctif** — Produire une nouvelle référence, en évitant aussi les doublons : `this.ids.update(ids => ids.includes(id) ? ids : [...ids, id]);`.

Source : https://angular.dev/guide/signals

### 🟠 F-012 · R-TEST-001
`src/app/proposals/proposal-form.ts:15` · testing · confiance high · review

```ts
export default class ProposalForm implements OnInit {
```
**Problème** — Le nouveau formulaire contient validation, synchronisation de brouillon, persistance et confirmation asynchrone, mais aucun spec voisin ne protège ce parcours utilisateur.

**Correctif** — Ajouter `proposal-form.spec.ts` couvrant validation, restauration/persistance du brouillon, changement de track, soumission et message de confirmation en fake timers Vitest.

Source : https://angular.dev/guide/testing

### 🟠 F-013 · R-SIG-003 — effect() qui écrit dans un signal (état dérivé)
`src/app/proposals/proposal-form.ts:38` · reactivity · confiance medium · scan+review

```ts
this.charCount.set(this.abstract().length);
```
**Problème** — L'effet recopie un état purement dérivé dans un second signal. Avec un brouillon restauré, `charCount` démarre à 0 puis est corrigé lors de l'exécution asynchrone de l'effet, ce qui crée un état intermédiaire incohérent et une vérification supplémentaire.

**Correctif** — Remplacer le signal et l'effet par `readonly charCount = computed(() => this.abstract().length);`.

Source : https://angular.dev/guide/signals/linked-signal

### 🟠 F-014 · R-PERF-035 — Zoneless : état modifié hors signal dans un callback asynchrone
`src/app/proposals/proposal-form.ts:67` · performance · confiance low · scan+review

```ts
this.submitted = true;
```
**Problème** — En mode zoneless, ce champ simple est modifié dans le callback de `setTimeout` sans notification Angular : le message de confirmation peut rester absent jusqu'à un autre événement utilisateur.

**Correctif** — Déclarer `submitted = signal(false)`, appeler `this.submitted.set(true)` dans le callback et lire `submitted()` dans le template (ou appeler explicitement `markForCheck()`).

Source : https://angular.dev/guide/zoneless

### 🟠 F-015 · R-TEST-001
`src/app/proposals/proposal.guard.ts:7` · testing · confiance high · review

```ts
export class ProposalGuard implements CanActivate {
```
**Problème** — La règle métier qui ferme l'appel à propositions après une date précise est ajoutée sans test; une erreur de borne ou de redirection peut rendre le formulaire accessible ou inaccessible au mauvais moment.

**Correctif** — Ajouter un spec avec temps système contrôlé par Vitest, couvrant juste avant, à l'instant et après la date de clôture ainsi que l'UrlTree retourné.

Source : https://angular.dev/guide/testing

### 🟠 F-016 · R-A11Y-014 — Image sans attribut alt
`src/app/speakers/speaker-spotlight.html:5` · a11y · confiance high · scan+review

```html
<img *ngIf="speaker.photoUrl" class="spotlight__photo" [src]="speaker.photoUrl" />
```
**Problème** — La photo informative du speaker n'a pas d'attribut `alt`; un lecteur d'écran ne reçoit donc aucune alternative textuelle pour ce contenu.

**Correctif** — Ajouter un texte alternatif utile, par exemple `[alt]="'Portrait de ' + speaker.name"`, ou `alt=""` seulement si la photo est réellement décorative.

Source : https://angular.dev/best-practices/a11y

### 🟠 F-017 · R-TEST-002 — Test focalisé (fit/fdescribe/.only)
`src/app/speakers/speaker-spotlight.spec.ts:20` · testing · confiance high · scan+review

```ts
it.only('should create', () => {
```
**Problème** — Le test est focalisé avec `.only`; en CI, Vitest ignore silencieusement le reste de la suite et peut laisser merger des régressions non exécutées.

**Correctif** — Remplacer `it.only` par `it` avant le merge.

Source : https://angular.dev/guide/testing

### 🟠 F-018 · R-PERF-020 — Composant forcé en Eager/Default (Angular ≥ 22)
`src/app/speakers/speaker-spotlight.ts:14` · performance · confiance high · scan+review

```ts
changeDetection: ChangeDetectionStrategy.Eager,
```
**Problème** — Ce nouveau composant force la stratégie `Eager` alors qu'Angular 22 utilise OnPush par défaut : sa vue sera revérifiée à chaque cycle global, sans justification locale.

**Correctif** — Supprimer l'option `changeDetection` et exposer l'état affiché avec des signals afin de conserver le comportement OnPush par défaut d'Angular 22.

Source : https://angular.dev/best-practices/skipping-subtrees

### 🟠 F-019 · R-ARCH-027 — Output nommé comme un événement DOM natif
`src/app/speakers/speaker-spotlight.ts:18` · architecture · confiance high · scan+review

```ts
@Output() select = new EventEmitter<string>();
```
**Problème** — `select` est aussi un événement DOM natif: un binding `(select)` sur le composant peut recevoir l'output Angular ou un événement natif qui remonte d'un descendant, avec des déclenchements ambigus ou doublés.

**Correctif** — Nommer l'événement selon l'intention métier, par exemple `readonly talkSelected = output<string>()`, puis adapter le binding parent.

Source : https://angular.dev/guide/components/outputs

### 🟠 F-020 · R-RX-001 — subscribe imbriqués
`src/app/speakers/speaker-spotlight.ts:32` · reactivity · confiance high · scan+review

```ts
this.speakerService.getSpeaker(id).subscribe((speaker) => {
```
**Problème** — Les chargements du speaker puis de ses talks sont imbriqués dans l'abonnement aux paramètres de route. Lors d'une navigation rapide entre deux ids, aucune requête précédente n'est annulée et une réponse lente de l'ancien id peut remplacer le speaker ou les talks courants.

**Correctif** — Composer une seule chaîne `paramMap.pipe(map(...), distinctUntilChanged(), switchMap(id => getSpeaker(id)), switchMap(speaker => ...))` et l'exposer avec `toSignal`, en gardant ensemble le speaker et ses talks.

Source : https://angular.dev/ecosystem/rxjs-interop

### 🟠 F-021 · R-PERF-035 — Zoneless : état modifié hors signal dans un callback asynchrone
`src/app/speakers/speaker-spotlight.ts:33` · performance · confiance low · scan+review

```ts
this.speaker = speaker;
```
**Problème** — En mode zoneless, l'émission HTTP met à jour un champ simple sans notifier Angular : les informations du speaker peuvent laisser l'écran sur « Chargement » jusqu'à une autre notification de rendu.

**Correctif** — Stocker le speaker dans un signal (`speaker.set(...)`) ou exposer le flux via `toSignal`/`async`; adapter ensuite les lectures du template.

Source : https://angular.dev/guide/zoneless

### 🟠 F-024 · R-PERF-035 — Zoneless : état modifié hors signal dans un callback asynchrone
`src/app/speakers/speaker-spotlight.ts:36` · performance · confiance low · scan+review

```ts
this.talks = talks;
```
**Problème** — La liste des talks est affectée dans une seconde souscription HTTP sans signal ni `markForCheck()` ; en zoneless, la liste peut ne pas apparaître à la réception de la réponse.

**Correctif** — Déclarer `talks` comme signal et utiliser `this.talks.set(talks)`, ou composer les requêtes puis convertir le résultat en signal avec `toSignal`.

Source : https://angular.dev/guide/zoneless

### 🟡 F-027 · R-ARCH-031 — Formulaires non typés
`src/app/proposals/proposal-form.ts:3` · architecture · confiance high · scan+review

```ts
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
```
**Problème** — Le nouveau formulaire importe les API `Untyped*`, ce qui propage `any` dans les valeurs et supprime la vérification de forme attendue avec TypeScript strict.

**Correctif** — Importer `NonNullableFormBuilder` et laisser le groupe inférer son type, ou utiliser les Signal Forms stables en Angular 22.

Source : https://angular.dev/guide/forms/typed-forms

### 🟡 F-031 · R-ARCH-032 — Guard/resolver sous forme de classe
`src/app/proposals/proposal.guard.ts:7` · architecture · confiance high · scan+review

```ts
export class ProposalGuard implements CanActivate {
```
**Problème** — Ce guard est du code neuf mais utilise la forme classe; elle ajoute un service racine et du boilerplate alors qu'un `CanActivateFn` compose directement `inject(Router)` et la règle de date.

**Correctif** — Exporter `proposalGuard: CanActivateFn = () => Date.now() > CFP_CLOSES_AT.getTime() ? inject(Router).parseUrl('/') : true` et référencer cette fonction dans la route.

Source : https://angular.dev/guide/routing/route-guards

### 🟡 F-032 · R-ARCH-028 — Directives structurelles *ngIf/*ngFor/*ngSwitch (dépréciées depuis v20)
`src/app/speakers/speaker-spotlight.html:3` · architecture · confiance high · scan+review

```html
<section class="spotlight" *ngIf="speaker; else loading">
```
**Problème** — Ce nouveau template emploie `NgIf`, déprécié depuis Angular 20, au lieu du control flow natif exigé par le projet.

**Correctif** — Remplacer ce bloc par `@if (speaker; as currentSpeaker) { ... } @else { ... }`.

Source : https://angular.dev/guide/templates/control-flow

### 🟡 F-035 · R-PERF-037 — Appel de méthode avec arguments dans le template
`src/app/speakers/speaker-spotlight.html:6` · performance · confiance medium · scan+review

```html
<span *ngIf="!speaker.photoUrl" class="spotlight__initials">{{ getInitials(speaker.name) }}</span>
```
**Problème** — `getInitials` effectue `split`/`map`/`join` depuis le template et recrée plusieurs objets à chaque vérification de cette vue, aggravé ici par la stratégie Eager.

**Correctif** — Précalculer les initiales avec un `computed()` fondé sur le signal speaker, ou utiliser un pipe pur.

Source : https://angular.dev/best-practices/runtime-performance

### 🟡 F-036 · R-ARCH-028 — Directives structurelles *ngIf/*ngFor/*ngSwitch (dépréciées depuis v20)
`src/app/speakers/speaker-spotlight.html:22` · architecture · confiance high · scan+review

```html
<div class="talk" *ngFor="let talk of talks" (click)="select.emit(talk.id)">
```
**Problème** — La nouvelle liste utilise `NgFor`, déprécié depuis Angular 20, et ne fournit aucun suivi par identifiant; les mises à jour recréent plus de DOM que nécessaire.

**Correctif** — Employer `@for (talk of talks; track talk.id) { ... }` et retirer `NgFor` des imports.

Source : https://angular.dev/guide/templates/control-flow

### 🟡 F-037 · R-TEST-003 — Spec qui ne vérifie que la création
`src/app/speakers/speaker-spotlight.spec.ts:21` · testing · confiance medium · scan+review

```ts
expect(component).toBeTruthy();
```
**Problème** — La seule assertion vérifie uniquement que l'instance existe; elle ne couvre ni le chargement route/HTTP, ni l'affichage, ni les favoris, ni la sélection.

**Correctif** — Mocker `SpeakerService`, fournir un id de route, puis vérifier le rendu du speaker, les talks, les erreurs et l'émission de sélection.

Source : https://angular.dev/guide/testing/components-basics

### 🟡 F-038 · R-SIG-001 — Décorateurs @Input/@Output au lieu de input()/output()
`src/app/speakers/speaker-spotlight.ts:17` · reactivity · confiance high · scan+review

```ts
@Input() speakerId!: string;
```
**Problème** — Le nouveau composant déclare son input et son output avec `@Input`/`@Output`, contrairement aux conventions du projet et aux API signal recommandées pour Angular 22. L'identifiant n'est ainsi pas directement composable dans un `computed`, `resource` ou `switchMap` via `toObservable`.

**Correctif** — Utiliser `readonly speakerId = input<string>();` (ou `input.required<string>()` si la route ne fournit pas l'id) et `readonly select = output<string>();`.

Source : https://angular.dev/guide/components/inputs

### 🟡 F-040 · R-ARCH-029 — `any` explicite
`src/app/speakers/speaker-spotlight.ts:20` · architecture · confiance high · scan+review

```ts
speaker: any;
```
**Problème** — `any` désactive le contrôle strict du template pour toutes les propriétés du speaker; une réponse API incomplète devient une erreur d'exécution dans le rendu.

**Correctif** — Typer ce membre avec `Speaker | undefined` en important le modèle existant depuis `talk.model.ts`.

Source : https://angular.dev/tools/cli/template-typecheck

### 🟡 F-041 · R-ARCH-029 — `any` explicite
`src/app/speakers/speaker-spotlight.ts:21` · architecture · confiance high · scan+review

```ts
talks: any[] = [];
```
**Problème** — Le tableau `any[]` retire au compilateur la capacité de vérifier `id`, `title`, `start` et `room` utilisés dans le template et dans l'ajout aux favoris.

**Correctif** — Déclarer `talks: Talk[] = []` (ou un signal typé) en réutilisant l'interface `Talk` existante.

Source : https://angular.dev/tools/cli/template-typecheck

### 🟡 F-046 · R-TEST-001
`src/app/speakers/speaker.service.ts:6` · testing · confiance high · review

```ts
export class SpeakerService {
```
**Problème** — Le nouveau service HTTP n'a pas de spec voisin; ses URL et contrats de réponse ne sont donc pas vérifiés.

**Correctif** — Ajouter `speaker.service.spec.ts` avec `provideHttpClientTesting()` et `HttpTestingController` pour les deux endpoints.

Source : https://angular.dev/guide/http/testing

### 🟡 F-047 · R-ARCH-030 — URL d'API codée en dur
`src/app/speakers/speaker.service.ts:7` · architecture · confiance high · scan+review

```ts
private baseUrl = 'http://localhost:3000/api/speakers';
```
**Problème** — Cette URL absolue couple la feature à un serveur local: après déploiement, la page speaker appelle la machine du visiteur au lieu du backend configuré et contourne `API_BASE_URL` déjà utilisé par l'application.

**Correctif** — Injecter le token `API_BASE_URL` existant et construire l'URL relative au même contrat de données que `TalksStore`.

Source : https://angular.dev/guide/di/defining-dependency-providers

### 🟡 F-048 · R-ARCH-007 — Injection par paramètres de constructeur
`src/app/speakers/speaker.service.ts:9` · architecture · confiance high · scan+review

```ts
constructor(private http: HttpClient) {}
```
**Problème** — Ce nouveau service utilise l'injection par constructeur alors que le projet Angular 22 impose `inject()`; cela rend aussi la classe incohérente avec les autres services récents.

**Correctif** — Remplacer le constructeur par `private readonly http = inject(HttpClient)` et importer `inject` depuis `@angular/core`.

Source : https://angular.dev/reference/migrations/inject-function

### 🟡 F-049 · R-ARCH-029 — `any` explicite
`src/app/speakers/speaker.service.ts:11` · architecture · confiance high · scan+review

```ts
getSpeaker(id: string): Observable<any> {
```
**Problème** — Le contrat HTTP du speaker est exposé en `any`, si bien que le composant peut consommer sans alerte des champs absents ou de mauvais type.

**Correctif** — Retourner `Observable<Speaker>` et appeler `this.http.get<Speaker>(...)` avec le modèle partagé.

Source : https://angular.dev/tools/cli/template-typecheck

### 🟡 F-050 · R-ARCH-022 — console.log résiduel
`src/app/speakers/speaker.service.ts:12` · architecture · confiance high · scan+review

```ts
console.log('getSpeaker', id);
```
**Problème** — Ce log de diagnostic s'exécutera pour chaque consultation d'un speaker en production et polluera la console sans passer par une politique de journalisation.

**Correctif** — Supprimer ce `console.log`, ou utiliser le service de logging du projet si cette trace doit être conservée.

Source : https://angular.dev/best-practices/error-handling

### 🟡 F-051 · R-ARCH-029 — `any` explicite
`src/app/speakers/speaker.service.ts:16` · architecture · confiance high · scan+review

```ts
getTalks(speakerId: string): Observable<any> {
```
**Problème** — Le contrat des talks est également `any`; le retour n'est même pas garanti comme tableau, alors que le composant l'itère et lit plusieurs propriétés.

**Correctif** — Retourner `Observable<Talk[]>` et typer `this.http.get<Talk[]>(...)` avec le modèle existant.

Source : https://angular.dev/tools/cli/template-typecheck

### 🟡 F-054 · R-PERF-034 — <img src> sans NgOptimizedImage
`src/app/speakers/speaker-spotlight.html:5` · performance · confiance high · scan · sévérité INFO → MINOR

```html
<img *ngIf="speaker.photoUrl" class="spotlight__photo" [src]="speaker.photoUrl" />
```
**Problème** — Image chargée sans NgOptimizedImage : pas de lazy-loading par défaut, pas de srcset, pas d'avertissement sur les images surdimensionnées (LCP).

**Correctif** — Importer `NgOptimizedImage` et utiliser `ngSrc` avec `width`/`height` (ou `fill`) ; `priority` sur l'image LCP.

Source : https://angular.dev/guide/image-optimization

## Écartés à la vérification

Candidats rejetés pendant l'étape de vérification, avec la raison. Ils alimentent les evals (précision du skill).

- ~~R-TEST-007~~ `src/app/favorites/favorites.store.ts:28` — Doublon de la régression directement établie par F-010; le test manquant est inclus dans sa correction.
- ~~R-PERF-035~~ `src/app/speakers/speaker-spotlight.ts:34` — Même cause et même correction que F-021; la bio doit être dérivée du signal speaker.
- ~~R-RX-001~~ `src/app/speakers/speaker-spotlight.ts:35` — Deuxième occurrence de la même chaîne de subscribe imbriqués déjà couverte par F-020.
- ~~R-TEST-007~~ `src/app/talks/talk-card.ts:28` — Doublon de la régression fonctionnelle certaine F-008; ajouter le test fait partie de la correction proposée.
- ~~R-TEST-001~~ `src/app/proposals/proposal-form.ts:1` — Doublon moins précis de F-012 sur l'absence de spec du formulaire.
- ~~R-ARCH-031~~ `src/app/proposals/proposal-form.ts:16` — Même cause Untyped Forms que F-027, déjà décrite avec une correction globale.
- ~~R-ARCH-031~~ `src/app/proposals/proposal-form.ts:27` — Même cause Untyped Forms que F-027, déjà décrite avec une correction globale.
- ~~R-TEST-001~~ `src/app/proposals/proposal.guard.ts:1` — Doublon moins précis de F-015 sur l'absence de spec du guard.
- ~~R-ARCH-028~~ `src/app/speakers/speaker-spotlight.html:5` — Occurrence du même usage de NgIf dans le template neuf déjà couvert par F-032.
- ~~R-ARCH-028~~ `src/app/speakers/speaker-spotlight.html:6` — Occurrence du même usage de NgIf dans le template neuf déjà couvert par F-032.
- ~~R-SIG-001~~ `src/app/speakers/speaker-spotlight.ts:18` — Le finding F-038 couvre ensemble l'input et l'output legacy et propose leur migration.
- ~~R-ARCH-017~~ `src/app/speakers/speaker-spotlight.ts:32` — HttpClient complète normalement; le risque de concurrence concret est déjà couvert par F-020.
- ~~R-SIG-007~~ `src/app/speakers/speaker-spotlight.ts:32` — Suggestion de modernisation recouverte par F-020 et les findings d'erreur/zoneless; pas de conséquence distincte.
- ~~R-ARCH-017~~ `src/app/speakers/speaker-spotlight.ts:35` — HttpClient complète normalement; le risque de concurrence concret est déjà couvert par F-020.
- ~~R-TEST-001~~ `src/app/speakers/speaker.service.ts:1` — Doublon scanner de F-046 sur le service sans spec.
- ~~R-SIG-009~~ `src/app/proposals/proposal-form.ts:3` — Conseil optionnel Signal Forms recouvert par le défaut concret de typage F-027.
- ~~R-ARCH-034~~ `src/app/proposals/proposal.guard.ts:6` — @Injectable reste valide pour ce guard à injection; suggestion stylistique sans conséquence distincte.
- ~~R-ARCH-034~~ `src/app/speakers/speaker.service.ts:5` — @Injectable reste nécessaire avec l'injection par constructeur actuelle; F-048 couvre la migration cohérente.

## Points positifs

- La route du formulaire de proposition est chargée en lazy loading.
- Le formulaire de proposition utilise déjà le control flow natif avec un track stable pour les talks.
- Le nouveau lien de navigation expose correctement ariaCurrentWhenActive=page.

## Reviewers

- scan — 44 constat(s) brut(s)
- angular-a11y-error-reviewer — 5 constat(s) brut(s)
- angular-architecture-reviewer — 19 constat(s) brut(s)
- angular-performance-reviewer — 7 constat(s) brut(s)
- angular-reactivity-reviewer — 8 constat(s) brut(s)
- angular-security-reviewer — 1 constat(s) brut(s)
- angular-testing-reviewer — 7 constat(s) brut(s)

## Validation empirique

Non exécutée.

---

<sub>angular-review v2 · règles : `references/*.md` · verdict calculé par `scripts/findings.mjs` (≥ 1 BLOCKER ou ≥ 3 MAJOR → REQUEST_CHANGES ; 0 finding → APPROVE ; sinon COMMENT) · données : `.review/findings.json`</sub>
