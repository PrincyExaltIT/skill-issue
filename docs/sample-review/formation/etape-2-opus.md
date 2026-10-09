# Revue — lab/speaker-spotlight → depart

**Verdict : à corriger**

La branche ajoute une page speaker (`/speakers/:id`), un formulaire de proposition de talk derrière un guard de date, un lien vers le speaker et un message de retour sur la carte de talk. Le risque principal : la page speaker plante à l'ouverture (NG0203) et, une fois réparée, affiche du HTML non nettoyé saisi par les speakers (XSS stockée).

| BLOCKER | MAJOR | MINOR | INFO |
|:---:|:---:|:---:|:---:|
| 5 | 14 | 12 | 2 |

> Tests non exécutés pendant la revue (commande non autorisée dans cette session). Les findings de tests viennent de la lecture du code.

## Findings

### BLOCKER · SEC-01 · Sanitizer contourné sur la bio du speaker
`src/app/speakers/speaker-spotlight.ts:34`

**Problème** — `bypassSecurityTrustHtml(speaker.bio)` puis `[innerHTML]="bioHtml"` (`speaker-spotlight.html:13`) affichent la bio telle quelle. Le formulaire invite justement à y mettre du HTML (`proposal-form.html:35`) : n'importe quel speaker peut injecter un script exécuté chez chaque visiteur. Le modèle dit pourtant l'inverse : `Speaker.bio` est du « texte brut : toujours affiché par interpolation, jamais comme HTML » (`talk.model.ts`).

**Correction** — Afficher la bio en texte : `<p class="spotlight__bio">{{ speaker().bio }}</p>`, supprimer `bioHtml` et `DomSanitizer`, et retirer la mention « HTML autorisé » du formulaire.

### BLOCKER · SIG-04 · `takeUntilDestroyed()` appelé dans `ngOnInit`
`src/app/speakers/speaker-spotlight.ts:30`

**Problème** — Sans argument, `takeUntilDestroyed()` exige un contexte d'injection. Dans `ngOnInit`, il lève NG0203 : la page speaker plante dès qu'on clique sur un nom de speaker.

**Correction** — Lire le paramètre via l'input lié à la route (`withComponentInputBinding()` est déjà actif) : `readonly id = input.required<string>();`, puis dériver les données (voir RX-02). À défaut : `takeUntilDestroyed(inject(DestroyRef))` capturé dans un initialiseur de champ.

### BLOCKER · SIG-01 · `isFavorite` testé sans être appelé
`src/app/talks/talk-card.ts:28`

**Problème** — `isFavorite` est un `input()`, donc une fonction : `!this.isFavorite` vaut toujours `false`. Le message annonce « Retiré de vos favoris » même quand on ajoute un favori, et le lecteur d'écran le lit (`role="status"`).

**Correction** — `this.feedback.set(this.isFavorite() ? 'Retiré de vos favoris' : 'Ajouté à vos favoris');`

### BLOCKER · A11Y-02 · Clic sur un `div` pour ouvrir un talk
`src/app/speakers/speaker-spotlight.html:22`

**Problème** — `<div class="talk" (click)=…>` ne prend pas le focus et ne réagit pas au clavier. De plus il émet `select` alors que la page est routée : personne n'écoute, le clic ne fait rien.

**Correction** — Un lien : `<a class="talk" [routerLink]="['/talks', talk.id]">…</a>`, et supprimer l'output.

### BLOCKER · A11Y-03 · Champ « Titre du talk » sans label
`src/app/proposals/proposal-form.html:15`

**Problème** — Le titre, seul champ obligatoire, n'a qu'un `placeholder`. Il disparaît à la saisie et n'est pas toujours annoncé.

**Correction** — `<label for="title">Titre du talk</label>` puis `<input id="title" class="proposal__title" formControlName="title" />` (le label peut être visuellement masqué avec `sr-only` si le design l'exige).

### MAJOR · SIG-02 · `add()` modifie le tableau du signal en place
`src/app/favorites/favorites.store.ts:28`

**Problème** — `this.ids().push(id)` ne change pas la référence : ni le compteur de la nav, ni les cartes, ni l'effet de persistance ne réagissent. « Tout ajouter à mes favoris » semble ne rien faire, et l'ajout est perdu au rechargement. Il ne dédoublonne pas non plus : un talk déjà favori serait compté deux fois.

**Correction** — `this.ids.update((ids) => (ids.includes(id) ? ids : [...ids, id]));` et un test dans `favorites.store.spec.ts`.

### MAJOR · RX-02 · Abonnements imbriqués sur trois niveaux
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — `paramMap` → `getSpeaker` → `getTalks`, chacun dans le `subscribe` du précédent. En passant d'un speaker à l'autre, les requêtes précédentes ne sont pas annulées et peuvent répondre dans le désordre.

**Correction** — Le plus simple : ne pas appeler d'API. `TalksStore` expose déjà `speakersById` et `schedule` :
```ts
readonly id = input.required<string>();
protected readonly speaker = computed(() => this.talksStore.speakersById().get(this.id()));
protected readonly talks = computed(() => this.talksStore.schedule().filter((t) => t.speakerId === this.id()));
```
Sinon, `httpResource()` ou un seul flux avec `switchMap`.

### MAJOR · ZL-01 · Champs de la page speaker modifiés dans des callbacks HTTP
`src/app/speakers/speaker-spotlight.ts:33`

**Problème** — L'application est zoneless : `this.speaker = …`, `this.bioHtml = …` et `this.talks = …` dans un `subscribe` ne déclenchent aucun rendu. La page reste sur « Chargement du speaker… » jusqu'à un événement sans rapport.

**Correction** — Des `signal`/`computed` (voir RX-02).

### MAJOR · ZL-01 · Message de confirmation jamais affiché
`src/app/proposals/proposal-form.ts:67`

**Problème** — `submitted` est un champ ordinaire passé à `true` dans un `setTimeout` : rien ne redemande le rendu, « Merci ! Votre proposition a bien été enregistrée. » n'apparaît pas.

**Correction** — `protected readonly submitted = signal(false);`, `this.submitted.set(true)`, et `@if (submitted())`. Le `setTimeout` de 300 ms n'a pas de raison d'être : le supprimer.

### MAJOR · RX-03 · Erreur HTTP non gérée sur la page speaker
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — Un id inconnu ou une API indisponible laisse l'écran sur « Chargement du speaker… » sans message ni issue.

**Correction** — Un état « Speaker introuvable » avec un lien vers le programme (`@if (!speaker()) { … }` si on passe par `TalksStore`, ou lecture de `resource.error()`).

### MAJOR · RX-01 · `valueChanges` jamais désabonné
`src/app/proposals/proposal-form.ts:47`

**Problème** — `this.form.valueChanges.subscribe(v => this.draft = v)` survit au composant : fuite à chaque visite de la page. Le champ `draft` est d'ailleurs inutile.

**Correction** — Supprimer `draft` et lire `this.form.getRawValue()` dans `submit()`.

### MAJOR · SIG-03 · `effect()` qui écrit dans `charCount`
`src/app/proposals/proposal-form.ts:38`

**Problème** — Le compteur est dérivé un tour trop tard via un effect. (L'effect qui écrit dans `localStorage`, ligne 42, est légitime.)

**Correction** — `protected readonly charCount = computed(() => this.abstract().length);`

### MAJOR · NG-06 · Output nommé `select`
`src/app/speakers/speaker-spotlight.ts:18`

**Problème** — `select` est aussi un événement DOM : un parent qui écoute `(select)` peut recevoir l'événement natif.

**Correction** — Supprimer l'output (la page est routée, voir A11Y-02), ou le renommer `talkSelected`.

### MAJOR · NG-07 · Détection de changement forcée en `Eager`
`src/app/speakers/speaker-spotlight.ts:14`

**Problème** — `ChangeDetectionStrategy.Eager` n'est pas justifié ; il masque en partie le problème ZL-01 au lieu de le corriger.

**Correction** — Retirer la ligne une fois l'état passé en signals.

### MAJOR · NG-11 · Page speaker chargée d'emblée
`src/app/app.routes.ts:22`

**Problème** — `component: SpeakerSpotlight` (import statique ligne 3) met la page dans le bundle initial, alors que toutes les autres routes sont lazy.

**Correction** — `loadComponent: () => import('./speakers/speaker-spotlight').then((m) => m.SpeakerSpotlight)` (ou `export default` comme les autres pages), et supprimer l'import ligne 3.

### MAJOR · SEC-02 · URL d'API en dur
`src/app/speakers/speaker.service.ts:7`

**Problème** — `http://localhost:3000/api/speakers` casse hors du poste de dev et ignore le token `API_BASE_URL` du projet (`src/app/core/api-base-url.ts`). Cette API n'existe pas ailleurs dans le projet, qui sert `speakers.json`.

**Correction** — Passer par `TalksStore` (voir RX-02) et supprimer le service ; sinon `private readonly baseUrl = inject(API_BASE_URL);`.

### MAJOR · A11Y-01 · Photo du speaker sans `alt`
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — Le lecteur d'écran lit l'URL de l'image, ou rien.

**Correction** — `alt="Portrait de {{ speaker().name }}"`.

### MAJOR · TEST-01 · Test focalisé avec `it.only`
`src/app/speakers/speaker-spotlight.spec.ts:20`

**Problème** — Avec `CI=true`, Vitest échoue ; en local, seul ce test tourne dans le fichier.

**Correction** — `it(…)`.

### MAJOR · TEST-04 · `HttpClient` réel dans le test
`src/app/speakers/speaker-spotlight.spec.ts:13`

**Problème** — `provideHttpClient()` sans `provideHttpClientTesting()` : dès qu'un test lancera `detectChanges()`, il appellera `localhost:3000`.

**Correction** — Ajouter `provideHttpClientTesting()` et vérifier les requêtes avec `HttpTestingController` (ou, si la page passe par `TalksStore`, réutiliser les helpers de `src/app/talks/testing/`).

### MINOR · NG-01 · `*ngIf` / `*ngFor` dans la page speaker
`src/app/speakers/speaker-spotlight.html:3`

**Problème** — Directives structurelles dépréciées (lignes 3, 5, 6, 22, et `NgIf`/`NgFor` importés `speaker-spotlight.ts:11`).

**Correction** — `@if (speaker(); as speaker) { … } @else { … }` et `@for (talk of talks(); track talk.id) { … }`.

### MINOR · NG-02 · `@Input` / `@Output` décorateurs
`src/app/speakers/speaker-spotlight.ts:17`

**Problème** — `@Input() speakerId!` et `@Output() select = new EventEmitter` au lieu des API signals.

**Correction** — `readonly id = input.required<string>();` (lié à `:id` par la route).

### MINOR · NG-04 · Type `any` sur le speaker et ses talks
`src/app/speakers/speaker-spotlight.ts:20`

**Problème** — `speaker: any`, `talks: any[]` et `Observable<any>` (`speaker.service.ts:11`, `:16`) cachent les erreurs : le template lit `speaker.photoUrl`, qui n'existe pas dans `Speaker`.

**Correction** — Utiliser `Speaker` et `Talk` de `talk.model.ts` ; ajouter `photoUrl?` au modèle si la donnée existe vraiment.

### MINOR · NG-12 · Calcul des initiales dupliqué
`src/app/speakers/speaker-spotlight.ts:42`

**Problème** — `getInitials` refait `initialsOf` (`src/app/talks/initials.ts`), en moins robuste (espaces multiples, pas de limite à deux lettres).

**Correction** — `protected readonly initials = computed(() => initialsOf(this.speaker()?.name ?? ''));`

### MINOR · NG-08 · Méthode appelée dans le template
`src/app/speakers/speaker-spotlight.html:6`

**Problème** — `{{ getInitials(speaker.name) }}` est recalculé à chaque détection de changement.

**Correction** — Le `computed` `initials()` ci-dessus.

### MINOR · NG-09 · Formulaire non typé
`src/app/proposals/proposal-form.ts:16`

**Problème** — `UntypedFormBuilder` / `UntypedFormGroup` renvoient des `any`.

**Correction** — `private readonly fb = inject(FormBuilder).nonNullable;` et `readonly form = this.fb.group({ title: ['', Validators.required], track: this.fb.control<Track>('Frontend'), bio: [''] });`, ou Signal Forms.

### MINOR · NG-10 · Guard écrit en classe
`src/app/proposals/proposal.guard.ts:7`

**Problème** — `implements CanActivate` est déprécié.

**Correction** — `export const proposalsOpen: CanActivateFn = () => Date.now() <= CFP_CLOSES_AT.getTime() || inject(Router).parseUrl('/');`

### MINOR · NG-03 · Injection par constructeur
`src/app/speakers/speaker.service.ts:9`

**Problème** — `constructor(private http: HttpClient)` au lieu de `inject()`.

**Correction** — `private readonly http = inject(HttpClient);` (sans objet si le service est supprimé).

### MINOR · NG-05 · `console.log` oublié
`src/app/speakers/speaker.service.ts:12`

**Problème** — Trace de débogage livrée en production.

**Correction** — Supprimer la ligne.

### MINOR · hors règles · Limite de 600 caractères affichée mais pas appliquée
`src/app/proposals/proposal-form.html:28`

**Problème** — L'interface annonce « / 600 caractères » mais rien n'empêche d'envoyer un résumé plus long, ni un résumé vide.

**Correction** — `maxlength="600"` sur le `textarea`, ou intégrer le résumé au formulaire avec `Validators.required` et `Validators.maxLength(600)`.

### MINOR · TEST-02 · Nouveaux fichiers sans test
`src/app/proposals/proposal-form.ts:15`

**Problème** — `proposal-form.ts`, `proposal.guard.ts:7` et `speaker.service.ts:6` n'ont pas de `.spec.ts`. Le guard (date de clôture) et l'envoi du formulaire sont les comportements les plus faciles à casser.

**Correction** — Un test du guard avant/après le 30 novembre (`vi.setSystemTime`), un test d'envoi du formulaire (message de confirmation, titre obligatoire).

### MINOR · TEST-03 · Le test ne vérifie que la création
`src/app/speakers/speaker-spotlight.spec.ts:21`

**Problème** — `expect(component).toBeTruthy()` passe sans même lancer `ngOnInit` : il n'aurait pas vu le crash NG0203.

**Correction** — Rendre la page pour un id donné et vérifier le nom, la bio en texte et la liste des talks.

### INFO · NG-13 · `@Injectable({ providedIn: 'root' })` dans un nouveau fichier
`src/app/speakers/speaker.service.ts:5`

**Problème** — Angular 22 propose `@Service()` pour un service racine.

**Correction** — `@Service() export class SpeakerService { … }` (sans objet si le service est supprimé).

### INFO · NG-14 · Image sans `NgOptimizedImage`
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — `<img [src]>` ne profite pas du chargement optimisé.

**Correction** — `<img [ngSrc]="…" width="80" height="80" alt="…">`.
