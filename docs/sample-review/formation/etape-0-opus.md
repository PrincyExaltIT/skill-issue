# Revue — `feat/speaker-spotlight` → `depart`

- Commit relu : `35d2f12 feat: speaker spotlight et proposition de talk`
- Base : `depart` (`0f3ee22`), 15 fichiers, +466 / −2
- Périmètre : page speaker (`/speakers/:id`), formulaire de proposition (`/proposals`) et son guard, lien speaker et message de retour dans `TalkCard`, `FavoritesStore.add()`.
- Non vérifié : `npm run build` et `npm test` n'ont pas été lancés (pas de `node_modules` dans le worktree, et l'installation n'a pas été autorisée). Les points ci-dessous viennent de la lecture du code.

## Synthèse

| Gravité | Nombre |
|---|---|
| BLOCKER | 6 |
| MAJOR | 9 |
| MINOR | 8 |
| INFO | 2 |

En l'état, la page speaker ne peut pas fonctionner : elle plante à l'initialisation, appelle une API qui n'existe pas et n'est jamais rafraîchie. Elle ouvre aussi une faille XSS stockée. Le formulaire de proposition n'affiche jamais sa confirmation, et le message de retour de `TalkCard` est toujours faux.

---

## BLOCKER

### B1. XSS stockée via la bio du speaker
`src/app/speakers/speaker-spotlight.ts:34` · `src/app/speakers/speaker-spotlight.html:13` · `src/app/proposals/proposal-form.html:36`

`bypassSecurityTrustHtml(speaker.bio)` suivi de `[innerHTML]` désactive la protection d'Angular sur une donnée saisie par l'utilisateur. Le formulaire de proposition invite même à mettre du HTML dans la bio (« HTML autorisé »). Un `<img src=x onerror=…>` dans une bio s'exécute chez tout visiteur de la page speaker. Le modèle le dit pourtant (`talk.model.ts`, `Speaker.bio`) : « Texte brut : toujours affiché par interpolation, jamais comme HTML. »

**Correction :** afficher `<p class="spotlight__bio">{{ speaker.bio }}</p>`, supprimer `DomSanitizer`/`bioHtml` et retirer la mention « HTML autorisé » du formulaire. Si le HTML est vraiment voulu, il faut une décision produit et une sanitisation côté serveur. Le bypass n'est pas une option.

### B2. `takeUntilDestroyed()` appelé hors contexte d'injection
`src/app/speakers/speaker-spotlight.ts:30`

Sans argument, `takeUntilDestroyed()` doit être appelé dans un contexte d'injection (constructeur, initialiseur de champ). Dans `ngOnInit`, il lève `NG0203` et la page plante à l'ouverture.

**Correction :** disparaît avec la réécriture en signals (B4). Sinon, injecter `DestroyRef` et le passer : `takeUntilDestroyed(this.destroyRef)`.

### B3. Le service speaker vise une API qui n'existe pas
`src/app/speakers/speaker.service.ts:7`

`http://localhost:3000/api/speakers` est en dur, ignore le token `API_BASE_URL` (`core/api-base-url.ts`) et pointe vers des endpoints (`/speakers/:id`, `/speakers/:id/talks`) absents du projet. Les données sont servies depuis `public/data/speakers.json` et `talks.json`. Dans tous les environnements, la page reste bloquée sur « Chargement du speaker… ».

**Correction :** supprimer `SpeakerService` et tout dériver de `TalksStore`, qui charge déjà speakers et talks :
```ts
readonly id = input.required<string>(); // lié par withComponentInputBinding()
private readonly store = inject(TalksStore);
protected readonly speaker = computed(() => this.store.speakersById().get(this.id()));
protected readonly talks = computed(() => this.store.schedule().filter((t) => t.speakerId === this.id()));
```

### B4. Page speaker jamais rafraîchie en zoneless
`src/app/speakers/speaker-spotlight.ts:14`, `:20-22`, `:33-37`

L'application est zoneless. Assigner un champ simple (`this.speaker = …`, `this.talks = …`) dans un `subscribe` HTTP ne déclenche aucune détection de changements, même avec `ChangeDetectionStrategy.Eager`. Le passage en `Eager` contourne la convention OnPush sans résoudre le problème. Les `subscribe` imbriqués, eux, ne sont pas nettoyés et créent une course quand l'`:id` change : la réponse de l'ancien speaker peut écraser celle du nouveau.

**Correction :** état en `computed` (voir B3), retirer `changeDetection: Eager` et les `subscribe` imbriqués.

### B5. `FavoritesStore.add()` mute le tableau du signal
`src/app/favorites/favorites.store.ts:28`

`this.ids().push(id)` modifie la valeur en place sans notifier le signal. Le compteur de la nav, `has()` et la persistance `localStorage` ne sont pas mis à jour, et « Tout ajouter à mes favoris » ajoute des doublons à chaque clic.

**Correction :**
```ts
add(id: string): void {
  this.ids.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
}
```
Ajouter un test dans `favorites.store.spec.ts` (compteur mis à jour, pas de doublon, valeur persistée).

### B6. `it.only` commité
`src/app/speakers/speaker-spotlight.spec.ts:20`

En CI, Vitest refuse `.only` par défaut (`allowOnly` vaut `false` quand `CI` est défini) et la suite échoue. En local, le modificateur masque les autres tests du fichier. Le test lui-même ne vérifie rien : sans `detectChanges()`, `ngOnInit` ne tourne jamais, ce qui cache B2.

**Correction :** `it(...)`. Écrire de vrais tests comportementaux sur le modèle de `talk-detail.spec.ts` (`provideHttpClientTesting`, `HttpTestingController`) : affichage du speaker, liste de ses talks, bio affichée en texte brut.

---

## MAJOR

### M1. Message de favori toujours faux dans `TalkCard`
`src/app/talks/talk-card.ts:28`

`!this.isFavorite` teste la fonction du signal, toujours vraie, et non sa valeur. Le message affiché est donc toujours « Retiré de vos favoris ».

**Correction :** `if (!this.isFavorite())`. Ajouter un test dans `talk-card.spec.ts` pour les deux cas.

### M2. Confirmation d'envoi jamais affichée
`src/app/proposals/proposal-form.ts:34`, `:66-68`

Le composant est OnPush par défaut, en zoneless. `submitted` est un champ simple, modifié dans un `setTimeout` : la vue n'est jamais marquée à rafraîchir et « Merci ! » n'apparaît pas. Le délai de 300 ms simule une latence qui n'existe pas.

**Correction :** `protected readonly submitted = signal(false);`, `this.submitted.set(true)` sans `setTimeout`, et `@if (submitted())` dans le template.

### M3. Le résumé échappe au formulaire et à la validation
`src/app/proposals/proposal-form.ts:20`, `:55-57` · `src/app/proposals/proposal-form.html:28-29`

Le résumé est géré à part, dans un signal relié à la main par `(input)`. Il n'a aucun validateur : on peut l'envoyer vide ou au-delà des « 600 caractères » annoncés. Le brouillon `localStorage` n'est jamais effacé après l'envoi.

**Correction :** en faire un contrôle du formulaire (`abstract: ['', [Validators.required, Validators.maxLength(600)]]`), ajouter `maxlength="600"` sur le textarea, dériver le compteur de la valeur du contrôle et `removeItem(ABSTRACT_DRAFT_KEY)` après l'envoi.

### M4. `effect()` utilisé pour dériver un état
`src/app/proposals/proposal-form.ts:33`, `:37-39`

Copier `abstract().length` dans un autre signal via `effect` est l'anti-pattern documenté : un rendu de retard, et un état qui peut diverger.

**Correction :** `protected readonly charCount = computed(() => this.abstract().length);`. Garder un `effect` uniquement pour la synchronisation `localStorage` (l. 41-43), qui est un vrai effet de bord.

### M5. Formulaires non typés
`src/app/proposals/proposal-form.ts:3`, `:16`, `:27`, `:32`

`UntypedFormBuilder`/`UntypedFormGroup` et `draft: Record<string, unknown>` font perdre tout le typage. La valeur envoyée n'est pas vérifiée par le compilateur.

**Correction :** `inject(NonNullableFormBuilder)`, puis `this.form.getRawValue()` au submit. Supprimer `draft` et l'abonnement de la l. 47, qui n'est d'ailleurs jamais désabonné.

### M6. Champ titre sans label
`src/app/proposals/proposal-form.html:15`

Le seul repère du champ est un `placeholder`, qui n'est pas un nom accessible et disparaît à la saisie. Les champs obligatoires n'affichent aucune erreur, malgré `markAllAsTouched()`.

**Correction :** ajouter un `<label for="title">Titre du talk</label>` (visuellement masqué si besoin) et `required`. Afficher un message d'erreur relié par `aria-describedby` quand le contrôle est invalide et touché.

### M7. Liste des talks du speaker non cliquable au clavier, et sans effet
`src/app/speakers/speaker-spotlight.html:22` · `src/app/speakers/speaker-spotlight.ts:18`

Un `<div (click)>` n'est ni focusable ni annoncé comme interactif. Le clic émet `select`, mais un composant routé n'a pas de parent qui écoute : il ne se passe rien.

**Correction :** retirer l'`@Output` et utiliser un lien : `<a [routerLink]="['/talks', talk.id]">`.

### M8. API Angular hors conventions du dépôt
`src/app/speakers/speaker-spotlight.ts:1-22` · `src/app/speakers/speaker-spotlight.html:3-6`, `:22`

Le composant utilise `@Input`/`@Output`/`EventEmitter` au lieu de `input()`/`output()`, `*ngIf`/`*ngFor`/`ng-template` au lieu de `@if`/`@for (track talk.id)`, et `any` partout (`speaker`, `talks`, `Observable<any>`). Ce typage `any` cache que `speaker.photoUrl` n'existe pas dans le modèle `Speaker`.

**Correction :** typer avec `Speaker`/`Talk` et passer au control flow natif. Supprimer la branche photo tant que le modèle n'a pas de `photoUrl`. Si elle est ajoutée, passer par `NgOptimizedImage` (`ngSrc`, dimensions, `alt`).

### M9. Couverture de tests insuffisante
`src/app/proposals/`, `src/app/proposals/proposal.guard.ts`, `src/app/favorites/favorites.store.ts:27`

Aucun test pour le formulaire (validation, envoi, compteur), le guard (avant et après la clôture), `FavoritesStore.add()` ou le message de `TalkCard`. Les specs existantes sont comportementales : il faut s'aligner sur elles.

---

## MINOR

### m1. Guard en classe (`CanActivate`), API dépréciée
`src/app/proposals/proposal.guard.ts:6-15`

**Correction :** guard fonctionnel.
```ts
export const proposalGuard: CanActivateFn = () =>
  Date.now() > CFP_CLOSES_AT.getTime() ? inject(Router).parseUrl('/') : true;
```
Mettre `canActivate: [proposalGuard]` dans `app.routes.ts:26`.

### m2. Date de clôture interprétée dans le fuseau du visiteur
`src/app/proposals/proposal.guard.ts:4`

`new Date('2026-11-30T23:59:59')`, sans fuseau, s'interprète en heure locale du navigateur. La clôture varie donc selon l'endroit d'où on consulte. **Correction :** expliciter l'offset du lieu, par exemple `'2026-11-30T23:59:59+01:00'`. La date est aussi dupliquée en dur dans `proposal-form.html:3` : la factoriser.

### m3. Lien « Proposer un talk » visible après la clôture
`src/app/app.html:25-29`

Après le 30 novembre, le lien redirige sans explication vers l'accueil. **Correction :** masquer le lien, ou afficher une page « appel clos », à partir de la même constante que le guard.

### m4. Route speaker chargée en eager
`src/app/app.routes.ts:3`, `:22`

Toutes les autres pages sont en `loadComponent`. **Correction :** `loadComponent: () => import('./speakers/speaker-spotlight')` avec un `export default`, comme `talk-detail.ts`.

### m5. `getInitials` duplique `initialsOf` et tourne à chaque rendu
`src/app/speakers/speaker-spotlight.ts:42-48` · `.html:6`

**Correction :** `protected readonly initials = computed(() => initialsOf(this.speaker()?.name ?? ''))`. Le helper existant gère déjà les espaces multiples et la limite à deux lettres.

### m6. `console.log` et injection par constructeur
`src/app/speakers/speaker.service.ts:9`, `:12`

À retirer si le service est conservé. Sinon, utiliser `inject(HttpClient)` et `inject(API_BASE_URL)`.

### m7. Une région live `role="status"` par carte
`src/app/talks/talk-card.html:3`

Le programme crée autant de régions live que de talks, et le message reste affiché indéfiniment. **Correction :** une seule région de statut au niveau de la liste (ou un service d'annonce `LiveAnnouncer`), avec un message effacé après quelques secondes.

### m8. Abonnement manuel pour suivre le track
`src/app/proposals/proposal-form.ts:49-52`

**Correction :** `selectedTrack = toSignal(this.form.controls.track.valueChanges, { initialValue: this.form.controls.track.value })`. Cela supprime `OnInit`, `DestroyRef` et le `subscribe`.

---

## INFO

- **i1.** `src/app/speakers/speaker-spotlight.ts:17` : `speakerId` en `@Input` sert de repli à `params.get('id')`. Avec `withComponentInputBinding()` déjà actif dans `app.config.ts`, `input.required<string>()` nommé `id` suffit (même pattern que `TalkDetail`).
- **i2.** `src/app/proposals/proposal-form.ts:65` : la proposition n'est stockée que dans `localStorage`, sous `conf-planner:last-proposal`, et rien n'est envoyé au comité. C'est acceptable pour une démo, mais le message « bien été enregistrée » le laisse croire : à préciser dans le texte ou dans la description de la PR.

---

## Verdict : **à corriger**

Les six BLOCKER empêchent le merge sur `depart` : faille XSS, crash de la page speaker, API inexistante, vue jamais rafraîchie, signal muté en place et `it.only` qui casse la CI. M1 et M2 sont des bugs visibles à corriger dans la même passe. La réécriture de `SpeakerSpotlight` en signals sur `TalksStore` règle d'un coup B2, B3, B4, M7, M8 et m5. Relancer ensuite `npm run build` et `npm test -- --watch=false` avant de redemander une revue.
