# Review Angular — feat/speaker-spotlight → main

**Verdict : 🔴 REQUEST_CHANGES — corrections nécessaires avant merge**
Angular 22.2.1 · 15 fichier(s) revu(s) · 2026-10-08

> La branche ajoute une page speaker (/speakers/:id), un formulaire de proposition de talk protégé par un guard de date, un bouton « Tout ajouter aux favoris » et un retour d'état sur les cartes. Risque élevé : la page speaker plante dès l'affichage (NG0203), injecte une bio distante en HTML non sanitisé (XSS stockée) et dépend d'une API localhost:3000 inexistante ; plusieurs états ne se rafraîchissent pas en zoneless (page speaker, confirmation d'envoi) et l'ajout groupé aux favoris mute le signal sans effet. Build et tests non exécutés pendant la review (approbation requise) : constats issus de la lecture du code.

| 🔴 BLOCKER | 🟠 MAJOR | 🟡 MINOR | 🔵 INFO |
|:---:|:---:|:---:|:---:|
| 2 | 11 | 14 | 1 |

## Findings

### 🔴 F-002 · R-SIG-005 — API à contexte d'injection appelée hors contexte (NG0203)
`src/app/speakers/speaker-spotlight.ts:30` · reactivity · confiance medium · scan+review

```ts
this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
```
**Problème** — `takeUntilDestroyed()` sans argument doit être appelé dans un contexte d'injection ; dans `ngOnInit` il lève NG0203. La route `/speakers/:id` plante à l'affichage, et tous les liens speaker ajoutés dans `TalkCard` mènent à une page en erreur. Le spec ne le détecte pas car il n'appelle jamais `detectChanges()`.

**Correctif** — Injecter `DestroyRef` (`private destroyRef = inject(DestroyRef)`) et écrire `takeUntilDestroyed(this.destroyRef)`, ou mieux : supprimer l'abonnement en dérivant l'état d'un input lié à la route (`id = input.required<string>()`, déjà possible grâce à `withComponentInputBinding()`) et d'un `httpResource`/`computed`.

Source : https://angular.dev/errors/NG0203

### 🔴 F-004 · R-SEC-003 — bypassSecurityTrust* (sanitizer contourné)
`src/app/speakers/speaker-spotlight.ts:34` · security · confiance medium · scan+review

```ts
this.bioHtml = this.sanitizer.bypassSecurityTrustHtml(speaker.bio);
```
**Problème** — XSS stockée : la bio vient du réseau et est injectée via [innerHTML] après contournement du sanitizer. Le formulaire de proposition invite même à saisir du HTML (« HTML autorisé », proposal-form.html:35), alors que le modèle `Speaker.bio` est documenté comme « Texte brut : toujours affiché par interpolation, jamais comme HTML ». Une bio contenant `<img src=x onerror=…>` s'exécute chez chaque visiteur de la page speaker.

**Correctif** — Afficher la bio par interpolation : `<p class="spotlight__bio">{{ speaker.bio }}</p>` et supprimer `DomSanitizer`/`bioHtml`. Si du formatage est vraiment voulu, `[innerHTML]="speaker.bio"` sans bypass (le sanitizer d'Angular retire scripts et handlers) et retirer la mention « HTML autorisé » du formulaire tant que ce n'est pas décidé.

Source : https://angular.dev/best-practices/security

### 🟠 F-006 · R-SIG-004 — Mutation en place de la valeur d'un signal
`src/app/favorites/favorites.store.ts:28` · reactivity · confiance medium · scan+review

```ts
this.ids().push(id);
```
**Problème** — Mutation en place du tableau du signal : la référence ne change pas, donc ni `count`, ni les templates, ni l'effet de persistance ne sont notifiés. « Tout ajouter à mes favoris » ne met à jour ni le compteur de la nav ni le localStorage, et peut créer des doublons.

**Correctif** — `this.ids.update((ids) => (ids.includes(id) ? ids : [...ids, id]));` — et idéalement une méthode `addAll(ids: string[])` qui fait une seule mise à jour.

Source : https://angular.dev/guide/signals

### 🟠 F-007 · R-A11Y-013 — Champ de formulaire sans label
`src/app/proposals/proposal-form.html:15` · a11y · confiance low · scan+review

```html
<input class="proposal__title" formControlName="title" placeholder="Titre du talk" />
```
**Problème** — Champ obligatoire sans label (placeholder seul) : pas de nom accessible, et le placeholder disparaît à la saisie. Aucun message d'erreur n'est affiché quand `markAllAsTouched()` invalide le formulaire.

**Correctif** — `<div class="field"><label for="title">Titre du talk</label><input id="title" formControlName="title" required aria-describedby="title-error" /></div>` et un message d'erreur visible lié par `aria-describedby`.

Source : https://angular.dev/best-practices/a11y

### 🟠 F-008 · R-PERF-035 — Zoneless : état modifié hors signal dans un callback asynchrone
`src/app/proposals/proposal-form.ts:67` · performance · confiance low · scan+review

```ts
this.submitted = true;
```
**Problème** — Champ simple modifié dans un `setTimeout` dans une application zoneless : la confirmation « Merci ! Votre proposition a bien été enregistrée » ne s'affiche pas (ni n'est annoncée par la région role="status") tant qu'aucun autre événement ne déclenche un rendu. L'utilisateur croit que l'envoi a échoué et renvoie.

**Correctif** — `submitted = signal(false);` puis `this.submitted.set(true)` et `@if (submitted())` dans le template. Le `setTimeout` de 300 ms n'a pas de raison d'être : le supprimer.

Source : https://angular.dev/guide/zoneless

### 🟠 F-009 · R-A11Y-014 — Image sans attribut alt
`src/app/speakers/speaker-spotlight.html:5` · a11y · confiance high · scan+review

```html
<img *ngIf="speaker.photoUrl" class="spotlight__photo" [src]="speaker.photoUrl" />
```
**Problème** — Image sans `alt` : les lecteurs d'écran lisent l'URL de la photo.

**Correctif** — La photo est décorative à côté du `<h1>` portant le nom : `alt=""`. Sinon `[alt]="'Photo de ' + speaker.name"`.

Source : https://angular.dev/best-practices/a11y

### 🟠 F-010 · R-A11Y-005 — (click) sur un élément non interactif
`src/app/speakers/speaker-spotlight.html:22` · a11y · confiance medium · scan+review

```html
<div class="talk" *ngFor="let talk of talks" (click)="select.emit(talk.id)">
```
**Problème** — `<div>` cliquable : ni focusable ni activable au clavier. Et comme le composant est routé, personne n'écoute `select` : le clic ne fait rien, pour tout le monde.

**Correctif** — Remplacer par un lien vers le détail : `<a class="talk" [routerLink]="['/talks', talk.id]">…</a>` et supprimer l'output `select`.

Source : https://angular.dev/best-practices/a11y

### 🟠 F-011 · R-TEST-002 — Test focalisé (fit/fdescribe/.only)
`src/app/speakers/speaker-spotlight.spec.ts:20` · testing · confiance high · scan+review

```ts
it.only('should create', () => {
```
**Problème** — `it.only` oublié : Vitest refuse `.only` en CI (`allowOnly` vaut false quand `CI` est défini), donc la CI échoue ; en local, les autres tests du fichier sont ignorés en silence.

**Correctif** — `it('should create', …)`.

Source : https://angular.dev/guide/testing

### 🟠 F-012 · R-RX-001 — subscribe imbriqués
`src/app/speakers/speaker-spotlight.ts:32` · reactivity · confiance high · scan+review

```ts
this.speakerService.getSpeaker(id).subscribe((speaker) => {
```
**Problème** — Trois `subscribe` imbriqués. Le composant est réutilisé quand on passe de `/speakers/a` à `/speakers/b` : les requêtes de `a` ne sont pas annulées et peuvent répondre après celles de `b`, affichant le mauvais speaker ou ses talks. Aucune gestion d'erreur non plus.

**Correctif** — Un seul flux : `paramMap.pipe(map(p => p.get('id')!), switchMap(id => getSpeaker(id).pipe(switchMap(s => getTalks(s.id).pipe(map(talks => ({ s, talks })))))))` converti avec `toSignal`, ou deux `httpResource` dépendant de l'input `id`.

Source : https://angular.dev/ecosystem/rxjs-interop

### 🟠 F-013 · R-ERR-008
`src/app/speakers/speaker-spotlight.ts:32` · error-handling · confiance medium · review

```ts
this.speakerService.getSpeaker(id).subscribe((speaker) => {
```
**Problème** — Aucun traitement d'erreur : un 404 ou une API injoignable laisse « Chargement du speaker… » affiché indéfiniment, sans message ni possibilité de réessayer. Avec l'URL `localhost:3000` codée en dur, c'est le cas systématique hors poste de dev.

**Correctif** — Avec `httpResource`, afficher un état `@if (speaker.error())` (« Speaker introuvable » + lien retour), comme le fait déjà `TalksStore` pour le programme.

Source : https://angular.dev/guide/http/http-resource

### 🟠 F-014 · R-PERF-035 — Zoneless : état modifié hors signal dans un callback asynchrone
`src/app/speakers/speaker-spotlight.ts:33` · performance · confiance low · scan+review

```ts
this.speaker = speaker;
```
**Problème** — Application zoneless : `speaker`, `bioHtml` et `talks` sont des champs simples modifiés dans des callbacks HTTP. Rien ne planifie la détection de changements, donc la page reste sur « Chargement du speaker… » jusqu'au prochain événement DOM. Le passage en `Eager` ne compense pas : il dit *quoi* vérifier, pas *quand*.

**Correctif** — Porter l'état en signals (`speaker = signal<Speaker | null>(null)`) ou, mieux, le dériver via `toSignal`/`httpResource` (voir le finding sur les subscribe imbriqués), puis revenir au OnPush par défaut.

Source : https://angular.dev/guide/zoneless

### 🟠 F-017 · R-ARCH-030 — URL d'API codée en dur
`src/app/speakers/speaker.service.ts:7` · architecture · confiance high · scan+review

```ts
private baseUrl = 'http://localhost:3000/api/speakers';
```
**Problème** — URL codée en dur vers une API qui n'existe pas dans ce projet : en production (et sur tout poste sans serveur sur le port 3000) la page speaker ne charge jamais. Le projet expose déjà `API_BASE_URL`, et `TalksStore` charge déjà speakers (`speakersById`) et talks (`schedule`).

**Correctif** — Supprimer `SpeakerService` et dériver la page depuis `TalksStore` : `speaker = computed(() => store.speakersById().get(this.id()))`, `talks = computed(() => store.schedule().filter(t => t.speakerId === this.id()))`. Si une API dédiée est vraiment prévue, injecter `API_BASE_URL`.

Source : https://angular.dev/guide/di/defining-dependency-providers

### 🟠 F-018 · R-SIG-010 — Signal testé sans être appelé
`src/app/talks/talk-card.ts:28` · reactivity · confiance high · scan+review

```ts
if (!this.isFavorite) {
```
**Problème** — `isFavorite` est un input signal : la fonction elle-même est toujours truthy, donc `!this.isFavorite` vaut toujours `false`. Le message annoncé (role="status") est toujours « Retiré de vos favoris », y compris à l'ajout — information fausse pour les utilisateurs de lecteur d'écran.

**Correctif** — Appeler le signal : `this.feedback.set(this.isFavorite() ? 'Retiré de vos favoris' : 'Ajouté à vos favoris');` et ajouter un test qui vérifie le message dans les deux sens.

Source : https://angular.dev/guide/signals

### 🟡 F-019 · R-PERF-001
`src/app/app.routes.ts:22` · performance · confiance high · review

```ts
{ path: 'speakers/:id', component: SpeakerSpotlight, title: 'Speaker · Conf Planner' },
```
**Problème** — Seule route importée statiquement : `SpeakerSpotlight` (et `DomSanitizer`, `SpeakerService`, `NgIf`/`NgFor`) part dans le bundle initial alors que toutes les autres pages sont en `loadComponent`.

**Correctif** — `loadComponent: () => import('./speakers/speaker-spotlight')` avec `export default class SpeakerSpotlight`, et retirer l'import en tête de fichier.

Source : https://angular.dev/guide/routing/define-routes#lazily-loaded-components

### 🟡 F-020 · R-TEST-001 — Nouveau composant/service sans fichier de test
`src/app/proposals/proposal-form.ts:1` · testing · confiance high · scan+review

```ts
import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
```
**Problème** — Nouveau formulaire sans spec : la confirmation après envoi (qui ne s'affiche pas en zoneless) aurait été détectée par un test.

**Correctif** — `proposal-form.spec.ts` : soumission invalide → pas d'enregistrement ; soumission valide → message de confirmation visible et `localStorage` rempli.

Source : https://angular.dev/guide/testing

### 🟡 F-021 · R-ARCH-031 — Formulaires non typés
`src/app/proposals/proposal-form.ts:3` · architecture · confiance high · scan+review

```ts
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
```
**Problème** — Formulaire non typé dans un nouveau composant. Le résumé vit hors du formulaire (signal séparé) : il n'est ni requis ni limité à 600 caractères malgré le compteur affiché. Le champ `draft` recopié via `valueChanges` duplique `form.getRawValue()`.

**Correctif** — `inject(NonNullableFormBuilder).group({ title: ['', Validators.required], track: ['Frontend' as Track], abstract: ['', [Validators.required, Validators.maxLength(600)]], bio: [''] })` et `getRawValue()` au submit (ou Signal Forms, recommandé en v22 pour un nouveau formulaire).

Source : https://angular.dev/guide/forms/typed-forms

### 🟡 F-024 · R-SIG-003 — effect() qui écrit dans un signal (état dérivé)
`src/app/proposals/proposal-form.ts:38` · reactivity · confiance medium · scan+review

```ts
this.charCount.set(this.abstract().length);
```
**Problème** — État dérivé recopié par un `effect()` : un cycle supplémentaire et un état intermédiaire incohérent, pour une valeur qui se calcule directement.

**Correctif** — `charCount = computed(() => this.abstract().length);` et supprimer l'effet.

Source : https://angular.dev/guide/signals/linked-signal

### 🟡 F-026 · R-ARCH-032 — Guard/resolver sous forme de classe
`src/app/proposals/proposal.guard.ts:7` · architecture · confiance high · scan+review

```ts
export class ProposalGuard implements CanActivate {
```
**Problème** — Guard sous forme de classe (interface `CanActivate` dépréciée).

**Correctif** — `export const proposalGuard: CanActivateFn = () => Date.now() > CFP_CLOSES_AT.getTime() ? inject(Router).parseUrl('/') : true;`

Source : https://angular.dev/guide/routing/route-guards

### 🟡 F-027 · R-ARCH-028 — Directives structurelles *ngIf/*ngFor/*ngSwitch (dépréciées depuis v20)
`src/app/speakers/speaker-spotlight.html:3` · architecture · confiance high · scan+review

```html
<section class="spotlight" *ngIf="speaker; else loading">
```
**Problème** — `*ngIf` / `*ngFor` (dépréciés depuis v20) au lieu du control flow natif exigé par AGENTS.md. Concerne les lignes 3, 5, 6 et 22.

**Correctif** — `@if (speaker(); as s) { … } @else { <p class="status">Chargement…</p> }` et `@for (talk of talks(); track talk.id)` ; retirer `NgIf`/`NgFor` des imports. Schematic : `ng g @angular/core:control-flow`.

Source : https://angular.dev/guide/templates/control-flow

### 🟡 F-029 · R-PERF-034 — <img src> sans NgOptimizedImage
`src/app/speakers/speaker-spotlight.html:5` · performance · confiance high · scan+review

```html
<img *ngIf="speaker.photoUrl" class="spotlight__photo" [src]="speaker.photoUrl" />
```
**Problème** — Image sans `NgOptimizedImage` ni dimensions, contraire aux conventions du projet (AGENTS.md) : décalage de mise en page (CLS) au chargement de la photo.

**Correctif** — Importer `NgOptimizedImage` et écrire `<img [ngSrc]="photoUrl" width="96" height="96" alt="" …>`.

Source : https://angular.dev/guide/image-optimization

### 🔵 F-031 · R-PERF-037 — Appel de méthode avec arguments dans le template
`src/app/speakers/speaker-spotlight.html:6` · performance · confiance medium · scan · sévérité MINOR → INFO

```html
<span *ngIf="!speaker.photoUrl" class="spotlight__initials">{{ getInitials(speaker.name) }}</span>
```
**Problème** — Une méthode appelée avec arguments dans le template est ré-exécutée à chaque vérification de la vue (les signals, eux, s'appellent sans argument).

**Correctif** — Précalculer avec `computed()`, un pipe pur, ou enrichir le modèle en amont.

Source : https://angular.dev/best-practices/runtime-performance

### 🟡 F-033 · R-TEST-003 — Spec qui ne vérifie que la création
`src/app/speakers/speaker-spotlight.spec.ts:21` · testing · confiance medium · scan+review

```ts
expect(component).toBeTruthy();
```
**Problème** — Le seul test vérifie la création sans `detectChanges()` : `ngOnInit` ne s'exécute jamais, d'où le crash NG0203 non détecté. Il passe aussi par le vrai `HttpClient` au lieu de `provideHttpClientTesting()`.

**Correctif** — Tester le comportement : fournir un id, `await fixture.whenStable()`, vérifier le nom affiché, le rendu en texte brut d'une bio contenant `<img onerror>`, et que « Tout ajouter » met à jour `FavoritesStore.count()`.

Source : https://angular.dev/guide/testing/components-basics

### 🟡 F-034 · R-PERF-020 — Composant forcé en Eager/Default (Angular ≥ 22)
`src/app/speakers/speaker-spotlight.ts:14` · performance · confiance high · scan+review

```ts
changeDetection: ChangeDetectionStrategy.Eager,
```
**Problème** — Le composant sort du OnPush par défaut d'Angular 22 et est vérifié à chaque cycle, uniquement pour compenser un état non réactif (qui ne s'affiche pas pour autant en zoneless).

**Correctif** — Supprimer la ligne une fois l'état passé en signals.

Source : https://angular.dev/best-practices/skipping-subtrees

### 🟡 F-035 · R-SIG-001 — Décorateurs @Input/@Output au lieu de input()/output()
`src/app/speakers/speaker-spotlight.ts:17` · reactivity · confiance high · scan+review

```ts
@Input() speakerId!: string;
```
**Problème** — Décorateurs `@Input`/`@Output` contraires aux conventions du projet (AGENTS.md : `input()` / `output()`). De plus `speakerId` n'est jamais alimenté : avec `withComponentInputBinding()` le paramètre de route s'appelle `id`.

**Correctif** — `readonly id = input.required<string>();` (lié automatiquement au paramètre `:id`) et supprimer la lecture manuelle de `paramMap`.

Source : https://angular.dev/guide/components/inputs

### 🟡 F-036 · R-ARCH-027 — Output nommé comme un événement DOM natif
`src/app/speakers/speaker-spotlight.ts:18` · architecture · confiance high · scan+review

```ts
@Output() select = new EventEmitter<string>();
```
**Problème** — Output nommé comme l'événement DOM natif `select` (collision possible avec l'événement de l'hôte) et jamais écouté puisque le composant est routé : code mort.

**Correctif** — Supprimer l'output et naviguer via `routerLink` (voir le finding a11y sur le `<div>` cliquable).

Source : https://angular.dev/guide/components/outputs

### 🟡 F-038 · R-ARCH-029 — `any` explicite
`src/app/speakers/speaker-spotlight.ts:20` · architecture · confiance high · scan+review

```ts
speaker: any;
```
**Problème** — `any` sur `speaker`, `talks` et les retours de `SpeakerService` alors que `Speaker` et `Talk` existent : le template n'est plus vérifié (ex. `speaker.photoUrl` n'existe pas dans le modèle `Speaker`).

**Correctif** — Typer avec `Speaker` / `Talk[]` (`http.get<Speaker>(…)`) et ajouter `photoUrl?` au modèle si le champ est réel.

Source : https://angular.dev/tools/cli/template-typecheck

### 🟡 F-041 · R-ARCH-007 — Injection par paramètres de constructeur
`src/app/speakers/speaker.service.ts:9` · architecture · confiance high · scan+review

```ts
constructor(private http: HttpClient) {}
```
**Problème** — Injection par constructeur, contraire à la convention `inject()` du projet.

**Correctif** — `private readonly http = inject(HttpClient);`

Source : https://angular.dev/reference/migrations/inject-function

### 🟡 F-043 · R-ARCH-022 — console.log résiduel
`src/app/speakers/speaker.service.ts:12` · architecture · confiance high · scan+review

```ts
console.log('getSpeaker', id);
```
**Problème** — `console.log` de debug laissé dans le code livré.

**Correctif** — Supprimer la ligne.

Source : https://angular.dev/best-practices/error-handling

## Écartés à la vérification

Candidats rejetés pendant l'étape de vérification, avec la raison. Ils alimentent les evals (précision du skill).

- ~~R-ARCH-017~~ `src/app/proposals/proposal-form.ts:47` — Le FormGroup est créé et détenu par le composant : abonnement et formulaire sont collectés ensemble, pas de fuite. La recopie inutile dans `draft` est couverte par le finding R-ARCH-031.
- ~~R-ARCH-017~~ `src/app/speakers/speaker-spotlight.ts:32` — HttpClient complète après une émission : pas de fuite. Le vrai problème (requêtes non annulées, course entre speakers) est le finding R-RX-001 sur la même ligne.
- ~~R-ARCH-017~~ `src/app/speakers/speaker-spotlight.ts:35` — HttpClient complète après une émission : pas de fuite ; couvert par R-RX-001.
- ~~R-RX-001~~ `src/app/speakers/speaker-spotlight.ts:35` — Même chaîne de subscribe imbriqués que R-RX-001 ligne 32.
- ~~R-PERF-035~~ `src/app/speakers/speaker-spotlight.ts:36` — Même cause et même correction que R-PERF-035 ligne 33 (état non réactif du composant).
- ~~R-ARCH-031~~ `src/app/proposals/proposal-form.ts:16` — Doublon de R-ARCH-031 ligne 3 (même formulaire).
- ~~R-ARCH-031~~ `src/app/proposals/proposal-form.ts:27` — Doublon de R-ARCH-031 ligne 3 (même formulaire).
- ~~R-TEST-001~~ `src/app/proposals/proposal.guard.ts:1` — Une seule comparaison de dates ; une fois en CanActivateFn (R-ARCH-032) le test apporte peu par rapport aux specs du formulaire.
- ~~R-ARCH-028~~ `src/app/speakers/speaker-spotlight.html:5` — Regroupé dans R-ARCH-028 ligne 3 (même template, même migration).
- ~~R-ARCH-028~~ `src/app/speakers/speaker-spotlight.html:6` — Regroupé dans R-ARCH-028 ligne 3.
- ~~R-ARCH-028~~ `src/app/speakers/speaker-spotlight.html:22` — Regroupé dans R-ARCH-028 ligne 3.
- ~~R-SIG-001~~ `src/app/speakers/speaker-spotlight.ts:18` — Même correction que R-SIG-001 ligne 17 ; l'output est de toute façon à supprimer (R-ARCH-027).
- ~~R-ARCH-029~~ `src/app/speakers/speaker-spotlight.ts:21` — Regroupé dans R-ARCH-029 ligne 20.
- ~~R-TEST-001~~ `src/app/speakers/speaker.service.ts:1` — Le service est à supprimer au profit de TalksStore (R-ARCH-030).
- ~~R-ARCH-029~~ `src/app/speakers/speaker.service.ts:11` — Regroupé dans R-ARCH-029 ligne 20 ; service à supprimer (R-ARCH-030).
- ~~R-ARCH-029~~ `src/app/speakers/speaker.service.ts:16` — Regroupé dans R-ARCH-029 ligne 20 ; service à supprimer (R-ARCH-030).
- ~~R-ARCH-034~~ `src/app/proposals/proposal.guard.ts:6` — Le guard doit devenir une CanActivateFn (R-ARCH-032) : plus de classe injectable.
- ~~R-ARCH-034~~ `src/app/speakers/speaker.service.ts:5` — Le service est à supprimer au profit de TalksStore (R-ARCH-030).

## Points positifs

- Le lien vers la page speaker dans TalkCard utilise un vrai <a routerLink>, accessible au clavier.

## Reviewers

- scan — 44 constat(s) brut(s)
- angular-a11y-error-reviewer — 4 constat(s) brut(s)
- angular-architecture-reviewer — 8 constat(s) brut(s)
- angular-performance-reviewer — 5 constat(s) brut(s)
- angular-reactivity-reviewer — 6 constat(s) brut(s)
- angular-security-reviewer — 1 constat(s) brut(s)
- angular-testing-reviewer — 3 constat(s) brut(s)

## Validation empirique

Non exécutée.

---

<sub>angular-review v2 · règles : `references/*.md` · verdict calculé par `scripts/findings.mjs` (≥ 1 BLOCKER ou ≥ 3 MAJOR → REQUEST_CHANGES ; 0 finding → APPROVE ; sinon COMMENT) · données : `.review/findings.json`</sub>
