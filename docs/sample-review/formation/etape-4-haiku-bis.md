# Revue — 35d2f12 (feat: speaker spotlight et proposition de talk) → depart

**Verdict : à corriger**

La branche ajoute la page speaker (`/speakers/:id`), le formulaire de proposition de talk (`/proposals`, derrière un guard de date de clôture) et des actions sur les favoris. Le risque principal : la page speaker lève NG0203 à son ouverture, et affiche la bio sans nettoyage (XSS stockée).

| BLOCKER | MAJOR | MINOR | INFO |
|:---:|:---:|:---:|:---:|
| 4 | 13 | 15 | 0 |

## Findings

### BLOCKER · SIG-04 · La page speaker ne s'ouvre pas
`src/app/speakers/speaker-spotlight.ts:30`

**Problème** — `takeUntilDestroyed()` sans argument est appelé dans `ngOnInit`, hors contexte d'injection : Angular lève NG0203 à l'ouverture de `/speakers/:id` et la page ne s'affiche pas. Le spec ne le voit pas : `should create` ne déclenche jamais `ngOnInit` (pas de `detectChanges()`).

**Correction** — injecter le `DestroyRef` en champ et le passer explicitement :
```ts
private readonly destroyRef = inject(DestroyRef);
// …
this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(…)
```

### BLOCKER · SEC-01 · Bio affichée sans nettoyage (XSS stockée)
`src/app/speakers/speaker-spotlight.ts:34`

**Problème** — `bypassSecurityTrustHtml(speaker.bio)` désactive le sanitizer sur une bio venue de l'API. Le formulaire de proposition (`src/app/proposals/proposal-form.html:35`) annonce « HTML autorisé » pour la bio : un speaker peut y écrire `<img src=x onerror=…>`, qui s'exécute chez chaque visiteur de sa page. Le `[innerHTML]` de `speaker-spotlight.html:13` affiche ce HTML tel quel.

**Correction** — ne plus contourner le sanitizer. Le plus sûr : afficher la bio en texte (`{{ speaker.bio }}`), retirer « HTML autorisé » du formulaire, et supprimer `DomSanitizer`, `bioHtml` et `bypassSecurityTrustHtml`. Si le HTML doit rester, lier `[innerHTML]="speaker.bio"` pour que le sanitizer d'Angular nettoie.

### BLOCKER · A11Y-02 · Talk de la page speaker inaccessible au clavier
`src/app/speakers/speaker-spotlight.html:22`

**Problème** — `<div class="talk" (click)="select.emit(talk.id)">` n'est ni focusable ni activable au clavier, alors que c'est le seul élément interactif de la section « Ses talks ». Par ailleurs, rien ne lie `(select)` dans l'application : le clic ne produit aucun effet, même à la souris.

**Correction** — un lien vers la fiche, comme dans `talk-card.html:16` : `<a [routerLink]="['/talks', talk.id]">{{ talk.title }}</a>` dans le `h3`. Et voir le finding sur l'output `select` (`speaker-spotlight.ts:18`).

### BLOCKER · A11Y-03 · Champ titre sans label
`src/app/proposals/proposal-form.html:15`

**Problème** — `<input formControlName="title" placeholder="Titre du talk" />` n'a pas de label. Le placeholder disparaît à la saisie et n'est pas toujours annoncé : le champ principal du formulaire est anonyme pour un lecteur d'écran.

**Correction** — `<label for="title">Titre du talk</label>` au-dessus, puis `<input id="title" …>`, comme les autres champs du formulaire.

### MAJOR · SIG-02 · « Tout ajouter à mes favoris » ne fait rien à l'écran
`src/app/favorites/favorites.store.ts:28`

**Problème** — `add()` fait `this.ids().push(id)` : le tableau change sans que sa référence change. Ni le compteur du menu (`count`), ni l'effect de persistance ne se déclenchent : rien ne se met à jour et rien n'est sauvegardé. Un id déjà présent peut en outre être ajouté en double.

**Correction** —
```ts
add(id: string): void {
  this.ids.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
}
```

### MAJOR · ZL-01 · Confirmation d'envoi jamais affichée (zoneless)
`src/app/proposals/proposal-form.ts:67`

**Problème** — `submitted` est un champ ordinaire, passé à `true` dans un `setTimeout`. En zoneless, rien ne notifie la vue : « Merci ! Votre proposition a bien été enregistrée » (`proposal-form.html:10`) n'apparaît pas tant que l'utilisateur n'a pas déclenché un autre événement.

**Correction** — `submitted = signal(false);`, `this.submitted.set(true)` directement (le `setTimeout` de 300 ms n'a pas de raison d'être), et `@if (submitted())` dans le template.

### MAJOR · ZL-01 · Page speaker figée après le chargement (zoneless)
`src/app/speakers/speaker-spotlight.ts:33`

**Problème** — `speaker`, `talks` et `bioHtml` sont des champs ordinaires remplis dans les callbacks HTTP. Sans zone.js, la réponse ne déclenche aucun rendu : la page reste sur « Chargement du speaker… » jusqu'au prochain événement. `ChangeDetectionStrategy.Eager` (ligne 14) ne règle pas ce point.

**Correction** — passer ces champs en signals (`speaker = signal<Speaker | null>(null)`, `talks = signal<Talk[]>([])`) et les lire en `speaker()` / `talks()` dans le template.

### MAJOR · SIG-03 · `charCount` dérivé par un effect
`src/app/proposals/proposal-form.ts:38`

**Problème** — l'effect recopie la longueur de `abstract` dans `charCount` : le compteur se met à jour un tour après la saisie. C'est le cas que l'équipe écarte. L'autre effect (localStorage, ligne 42) est légitime et reste.

**Correction** — `readonly charCount = computed(() => this.abstract().length);`, et supprimer le premier effect. Le template (`charCount()`) ne change pas.

### MAJOR · RX-02 · Réponses HTTP qui se doublent
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — `subscribe` imbriqués : `paramMap` → `getSpeaker` (ligne 32) → `getTalks` (ligne 35). Si l'id change pendant une requête en vol, la réponse la plus lente peut écraser la plus récente, et les talks du speaker précédent peuvent rester affichés.

**Correction** — un seul pipeline : `switchMap` sur `paramMap`, puis `switchMap` sur `getSpeaker`, puis `getTalks`, avec un seul `subscribe` et `takeUntilDestroyed(this.destroyRef)`.

### MAJOR · RX-03 · Erreur de chargement non gérée
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — aucun `catchError` ni état d'erreur : si l'API ne répond pas (le service vise `localhost:3000`), l'écran affiche « Chargement du speaker… » indéfiniment.

**Correction** — un état d'erreur (signal ou `httpResource`) et un message dans le template, avec un lien de retour au programme.

### MAJOR · NG-11 · Page speaker chargée d'emblée
`src/app/app.routes.ts:22`

**Problème** — `component: SpeakerSpotlight`, avec l'import statique de la ligne 3, met la page dans le bundle initial. Les autres pages sont chargées à la demande.

**Correction** —
```ts
{
  path: 'speakers/:id',
  loadComponent: () => import('./speakers/speaker-spotlight').then((m) => m.SpeakerSpotlight),
  title: 'Speaker · Conf Planner',
},
```
et retirer l'import statique ligne 3.

### MAJOR · A11Y-01 · Photo sans texte alternatif
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — `<img [src]="speaker.photoUrl">` n'a pas d'`alt` : le lecteur d'écran lit le nom du fichier, ou rien.

**Correction** — `alt="Portrait de {{ speaker.name }}"`.

### MAJOR · SIG-01 · Message de favori toujours « Retiré » (gravité ramenée de BLOCKER)
`src/app/talks/talk-card.ts:28`

**Problème** — `this.isFavorite` sans parenthèses lit la fonction signal, toujours truthy : `!this.isFavorite` vaut toujours `false`, donc le message est « Retiré de vos favoris » même à l'ajout. Ce texte est annoncé au lecteur d'écran (`talk-card.html:3`, `role="status"`). Gravité ramenée à MAJOR : pas de crash, pas de perte de données, seulement un message faux.

**Correction** — `if (!this.isFavorite())`.

### MAJOR · TEST-01 · Test focalisé
`src/app/speakers/speaker-spotlight.spec.ts:20`

**Problème** — `it.only` ne fait tourner que ce test : le reste de la suite est sauté. En CI, cela casse le build.

**Correction** — `it(…)`.

### MAJOR · NG-07 · Détection de changement forcée en Eager
`src/app/speakers/speaker-spotlight.ts:14`

**Problème** — `ChangeDetectionStrategy.Eager` force une vérification à chaque cycle, sans justification. Il ne compense pas le problème zoneless (ZL-01 ci-dessus).

**Correction** — retirer la ligne : OnPush est le défaut.

### MAJOR · SEC-02 · URL en dur
`src/app/speakers/speaker.service.ts:7`

**Problème** — `http://localhost:3000/api/speakers` contourne le token `API_BASE_URL` (`src/app/core/api-base-url.ts`), déjà utilisé par `talks.store.ts:9`. Ce service ne parle donc pas au même backend que le reste de l'application (qui lit `/data`), et il casse dès qu'un environnement change.

**Correction** — `private readonly baseUrl = inject(API_BASE_URL);`, puis `${this.baseUrl}/speakers`. Attention : `/speakers/:id` n'existe pas dans le mode `/data` (fichiers JSON) : à valider avec l'équipe.

### MAJOR · TEST-04 · Test avec un HttpClient réel
`src/app/speakers/speaker-spotlight.spec.ts:13`

**Problème** — `provideHttpClient()` réel : dès qu'un test fera tourner `ngOnInit`, la requête partira vers `localhost:3000`.

**Correction** — `provideHttpClientTesting()`, et `HttpTestingController` pour vérifier la requête attendue.

### MINOR · NG-02 · NG-06 · Output `select` : décorateur déprécié et nom d'événement DOM
`src/app/speakers/speaker-spotlight.ts:17`

**Problème** — `@Input() speakerId` et `@Output() select = new EventEmitter<string>()` utilisent les décorateurs et non `input()` / `output()`. `select` est aussi un événement DOM natif. Gravité ramenée de MAJOR à MINOR : aucun parent ne lie `(select)` aujourd'hui, donc il n'y a pas de collision réelle.

**Correction** — `readonly speakerId = input<string>();` et `readonly talkSelected = output<string>();`. Ou supprimer l'output s'il n'a pas de consommateur (voir A11Y-02).

### MINOR · NG-01 · Directives structurelles dépréciées
`src/app/speakers/speaker-spotlight.html:3`

**Problème** — `*ngIf` (lignes 3, 5, 6) et `*ngFor` (ligne 22). Dépréciés depuis Angular 20.

**Correction** — `@if (speaker) { … } @else { <p class="status">Chargement du speaker…</p> }`, `@for (talk of talks; track talk.id) { … }`, et retirer `NgIf`, `NgFor` des imports.

### MINOR · NG-08 · Méthode appelée dans le template
`src/app/speakers/speaker-spotlight.html:6`

**Problème** — `{{ getInitials(speaker.name) }}` réexécute la méthode à chaque détection de changement.

**Correction** — un `computed` d'initiales, avec `initialsOf` (voir NG-12).

### MINOR · NG-12 · Utilitaire dupliqué
`src/app/speakers/speaker-spotlight.ts:42`

**Problème** — `getInitials` refait `initialsOf` (`src/app/talks/initials.ts`), déjà utilisé par `talk-card.ts` et `talk-detail.ts`. Les deux ne donnent pas le même résultat : « Anne Marie Dupont » → « AMD » ici, « AM » avec `initialsOf`.

**Correction** — supprimer `getInitials` et importer `initialsOf` depuis `../talks/initials`.

### MINOR · NG-04 · Type `any`
`src/app/speakers/speaker-spotlight.ts:20`

**Problème** — `speaker: any` et `talks: any[]` : le template ne vérifie plus rien.

**Correction** — `speaker: Speaker | null` et `talks: Talk[]`, depuis `../talks/talk.model`.

### MINOR · NG-04 · Type `any` dans le service
`src/app/speakers/speaker.service.ts:11`

**Problème** — `Observable<any>` aux lignes 11 et 16.

**Correction** — `Observable<Speaker>` et `Observable<Talk[]>`.

### MINOR · NG-03 · Injection par constructeur
`src/app/speakers/speaker.service.ts:9`

**Problème** — `constructor(private http: HttpClient) {}`, alors que le projet utilise `inject()`.

**Correction** — `private readonly http = inject(HttpClient);`, constructeur supprimé.

### MINOR · NG-05 · Trace de débogage oubliée
`src/app/speakers/speaker.service.ts:12`

**Problème** — `console.log('getSpeaker', id)` part en production.

**Correction** — supprimer la ligne.

### MINOR · TEST-02 · Nouveau service sans test
`src/app/speakers/speaker.service.ts:1`

**Correction** — un `speaker.service.spec.ts` qui vérifie l'URL demandée avec `provideHttpClientTesting()` et `HttpTestingController`.

### MINOR · TEST-02 · Nouveau formulaire sans test
`src/app/proposals/proposal-form.ts:1`

**Correction** — un spec qui vérifie qu'un formulaire sans titre est invalide, et que l'envoi affiche la confirmation.

### MINOR · TEST-02 · Nouveau guard sans test
`src/app/proposals/proposal.guard.ts:1`

**Correction** — un spec avant et après la date de clôture, avec `vi.useFakeTimers()` et `vi.setSystemTime(…)`.

### MINOR · NG-09 · Formulaire non typé
`src/app/proposals/proposal-form.ts:16`

**Problème** — `UntypedFormBuilder` et `UntypedFormGroup` (ligne 3) renvoient des `any`.

**Correction** — `private readonly fb = inject(FormBuilder);` et `this.fb.nonNullable.group({ … })`, avec un type de formulaire.

### MINOR · NG-10 · Guard écrit en classe
`src/app/proposals/proposal.guard.ts:7`

**Problème** — `implements CanActivate` : les guards en classe sont dépréciés, et la fonction se teste seule.

**Correction** — `export const proposalsOpen: CanActivateFn = () => …`, puis `canActivate: [proposalsOpen]` dans `app.routes.ts:26`.

### MINOR · TEST-03 · Test qui ne vérifie que la création
`src/app/speakers/speaker-spotlight.spec.ts:21`

**Problème** — une seule assertion, `toBeTruthy()` : aucun comportement n'est testé.

**Correction** — une fois TEST-04 corrigé, tester le rendu du nom et des talks après une réponse HTTP simulée.

### MINOR · NG-14 · Image sans `NgOptimizedImage` (gravité relevée de INFO)
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — `<img [src]>` au lieu de `NgOptimizedImage`. Gravité relevée à MINOR : `AGENTS.md` prescrit `NgOptimizedImage` pour les images.

**Correction** — `<img [ngSrc]="speaker.photoUrl" width="80" height="80" alt="…" />`, avec `NgOptimizedImage` dans les imports.

## Écartés à la vérification

- `src/app/proposals/proposal-form.ts:47` · RX-01 — `valueChanges` est souscrit sans `takeUntilDestroyed`, mais la source (`this.form`) appartient au composant : elle est collectée avec lui, pas de fuite. Incohérence de style avec la ligne 51 : cosmétique.
- `src/app/proposals/proposal-form.ts:52` · RX-01 — faux positif : `takeUntilDestroyed(this.destroyRef)` est présent.
- `src/app/speakers/speaker-spotlight.ts:30` · RX-01 — `takeUntilDestroyed()` est bien présent ; le vrai problème (NG0203) est repris dans SIG-04.
- `src/app/speakers/speaker-spotlight.ts:32` et `:35` · RX-01 — requêtes HTTP qui se terminent seules : pas de fuite. Les problèmes réels sont RX-02 et RX-03.
- `src/app/speakers/speaker.service.ts:1` · NG-13 — le dépôt utilise `@Injectable({ providedIn: 'root' })` partout (`talks.store.ts`, `favorites.store.ts`) : convention respectée.
- `src/app/proposals/proposal-form.ts:20` · `localStorage` lu à l'initialisation — le projet n'a pas de SSR.
- `src/app/proposals/proposal-form.ts:41-43` et `src/app/favorites/favorites.store.ts:15` · effects qui écrivent dans `localStorage` — effets de bord légitimes, pas une dérivation de signal.
- `src/app/proposals/proposal-form.ts:64-65` · SEC-05 — brouillon de proposition public, pas une donnée sensible.
- `src/app/talks/talk-card.html` · A11Y-04 et A11Y-05 — `role="status"` et `aria-pressed` sont présents : conformes.
- `src/app/proposals/proposal-form.html:19`, `:28`, `:34` · A11Y-03 — labels associés (`for`) : conformes.

## Hors périmètre, à savoir

- Les corrections de confirmation zoneless (`7393afe`) et de `charCount` (`9877d9d`) existent déjà sur la branche `solution/review-fix`, pas sur `depart` : elles peuvent être reprises plutôt que réécrites.
