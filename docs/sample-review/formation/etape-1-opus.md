# Revue — lab/speaker-spotlight → depart

**Verdict : à corriger**

La branche ajoute une page speaker (`/speakers/:id`), un formulaire de proposition de talk (`/proposals`) protégé par un guard de date, un lien speaker et un message de retour sur la carte de talk. Le risque principal est la page speaker : elle injecte la bio en HTML sans sanitizer (XSS stockée), plante à l'ouverture (`takeUntilDestroyed()` hors contexte d'injection) et appelle une API `localhost:3000` qui n'existe pas.

| BLOCKER | MAJOR | MINOR | INFO |
|:---:|:---:|:---:|:---:|
| 3 | 7 | 12 | 3 |

> Revue statique : `npm run build` et `npm test` n'ont pas été lancés pendant cette revue.

## Findings

### BLOCKER · XSS stockée : la bio contourne le sanitizer
`src/app/speakers/speaker-spotlight.ts:34`

**Problème** — `bypassSecurityTrustHtml(speaker.bio)` puis `[innerHTML]="bioHtml"` (`speaker-spotlight.html:13`) rend tel quel le HTML fourni par le speaker. Le formulaire l'y invite (« HTML autorisé », `src/app/proposals/proposal-form.html:35`) : un `<img src=x onerror=…>` dans une bio s'exécute chez chaque visiteur. Le modèle dit pourtant l'inverse : `Speaker.bio` est du « texte brut : toujours affiché par interpolation, jamais comme HTML » (`talk.model.ts`).

**Correction** — Supprimer `DomSanitizer`/`bioHtml` et afficher `<p class="spotlight__bio">{{ speaker.bio }}</p>`. Retirer la mention « HTML autorisé » du formulaire. Si du formatage est vraiment voulu, passer par `[innerHTML]` *sans* bypass (sanitizer Angular) et le décider explicitement.

### BLOCKER · `takeUntilDestroyed()` appelé hors contexte d'injection
`src/app/speakers/speaker-spotlight.ts:30`

**Problème** — Sans argument, `takeUntilDestroyed()` doit être appelé dans un contexte d'injection (constructeur, initialiseur de champ). Dans `ngOnInit`, il lève `NG0203` : la page speaker plante à chaque ouverture. Le test (`speaker-spotlight.spec.ts`) ne déclenche pas `ngOnInit`, donc il ne le voit pas.

**Correction** — Ne plus s'abonner du tout (voir finding suivant). À défaut : `inject(DestroyRef)` en champ et `takeUntilDestroyed(this.destroyRef)`.

### BLOCKER · URL d'API en dur vers un serveur qui n'existe pas
`src/app/speakers/speaker.service.ts:7`

**Problème** — `http://localhost:3000/api/speakers` est en dur et ne correspond à rien dans le projet : les données viennent de `/data/speakers.json` et `/data/talks.json` via le token `API_BASE_URL`. En production (et en dev sans ce serveur), les requêtes échouent, aucune erreur n'est gérée et la page reste sur « Chargement du speaker… ».

**Correction** — Supprimer `SpeakerService` et dériver la page du `TalksStore`, qui charge déjà speakers et talks :

```ts
export default class SpeakerSpotlight {
  readonly id = input.required<string>(); // lié au paramètre :id (withComponentInputBinding)
  private readonly store = inject(TalksStore);
  protected readonly speaker = computed(() => this.store.speakersById().get(this.id()));
  protected readonly talks = computed(() =>
    this.store.schedule().filter((talk) => talk.speakerId === this.id()),
  );
}
```

Gérer les états chargement / erreur / speaker inconnu à partir de `store.talks`.

### MAJOR · `FavoritesStore.add()` mute le tableau du signal
`src/app/favorites/favorites.store.ts:28`

**Problème** — `this.ids().push(id)` modifie le tableau en place : le signal ne notifie personne, donc le compteur de la nav, les étoiles et la persistance `localStorage` (l'`effect`) ne bougent pas. Un id déjà présent est en plus ajouté en double. « Tout ajouter à mes favoris » semble donc ne rien faire.

**Correction** —
```ts
add(id: string): void {
  this.ids.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
}
```
Ajouter un test dans `favorites.store.spec.ts` (compteur, pas de doublon, persistance).

### MAJOR · `isFavorite` lu sans être appelé : le message est toujours « Retiré »
`src/app/talks/talk-card.ts:28`

**Problème** — `isFavorite` est un `input()`, donc une fonction : `!this.isFavorite` vaut toujours `false`. Chaque clic annonce « Retiré de vos favoris », y compris quand on ajoute.

**Correction** — `if (!this.isFavorite())`, et un test qui vérifie les deux messages.

### MAJOR · Le message de confirmation du formulaire ne s'affiche jamais
`src/app/proposals/proposal-form.ts:66`

**Problème** — `submitted` est un champ simple modifié dans un `setTimeout`. L'application est zoneless et le composant OnPush par défaut : rien ne déclenche de détection de changement, donc « Merci ! Votre proposition a bien été enregistrée. » n'apparaît pas. Le délai de 300 ms est en plus arbitraire.

**Correction** — `protected readonly submitted = signal(false);`, `this.submitted.set(true)` directement après l'enregistrement (sans `setTimeout`), `@if (submitted())` dans le template.

### MAJOR · Requêtes imbriquées non annulées : mauvais speaker affiché
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — Trois `subscribe` imbriqués : au changement de `:id`, les requêtes du speaker précédent ne sont pas annulées. Si elles répondent après, la page affiche le speaker B avec les talks du speaker A (ou l'inverse). Les abonnements internes ne sont jamais libérés.

**Correction** — Les `computed` sur `TalksStore` du finding sur l'URL en dur règlent le problème. Si un appel HTTP dédié reste nécessaire, utiliser `httpResource(() => …)` plutôt que des `subscribe`.

### MAJOR · État hors signals en mode `Eager` : l'affichage ne se met pas à jour
`src/app/speakers/speaker-spotlight.ts:14`

**Problème** — `changeDetection: ChangeDetectionStrategy.Eager` désactive l'OnPush par défaut. L'état (`speaker`, `talks`, `bioHtml`) est fait de champs simples assignés dans des callbacks HTTP. En zoneless, ces assignations ne planifient aucune détection de changement : la vue peut rester sur « Chargement… » même après la réponse.

**Correction** — Retirer `changeDetection` (OnPush par défaut) et exposer l'état en `signal`/`computed`, comme le veut `AGENTS.md`.

### MAJOR · Talks cliquables inaccessibles au clavier, et le clic ne mène nulle part
`src/app/speakers/speaker-spotlight.html:22`

**Problème** — `<div class="talk" (click)=…>` n'est ni focalisable ni activable au clavier, et n'a pas de rôle. En plus, le clic émet l'output `select`, mais personne ne l'écoute (le composant est routé) : il ne se passe rien, même à la souris, malgré le `cursor: pointer`.

**Correction** — Un vrai lien : `<h3><a [routerLink]="['/talks', talk.id]">{{ talk.title }}</a></h3>`, et supprimer l'output `select` (dont le nom masque en plus l'événement DOM natif `select`).

### MAJOR · Champ titre sans label ni message d'erreur
`src/app/proposals/proposal-form.html:15`

**Problème** — Le seul champ obligatoire n'a qu'un `placeholder`, qui n'est pas un nom accessible et disparaît à la saisie. Quand on envoie le formulaire sans titre, `markAllAsTouched()` ne produit aucun retour visible ni annoncé : le formulaire semble simplement ne pas marcher.

**Correction** — `<label for="title">Titre du talk</label><input id="title" …>`, puis un message d'erreur relié (`aria-describedby`, `aria-invalid`) affiché quand le contrôle est `invalid && touched`.

### MINOR · Control flow et directives legacy
`src/app/speakers/speaker-spotlight.html:3`

**Problème** — `*ngIf … else`, `*ngFor` sans `track`, `NgIf`/`NgFor` importés : contraire à la convention (control flow natif, `@for` avec `track item.id`).

**Correction** — `@if (speaker(); as speaker) { … } @else { … }` et `@for (talk of talks(); track talk.id)`, retirer `NgIf`/`NgFor` des imports.

### MINOR · `@Input`/`@Output` décorateurs et `any`
`src/app/speakers/speaker-spotlight.ts:17`

**Problème** — Décorateurs `@Input()`/`@Output()` au lieu de `input()`/`output()`, et `speaker: any`, `talks: any[]` alors que les modèles `Speaker` et `Talk` existent. `photoUrl`, utilisé par le template, n'existe pas dans `Speaker` : le typage l'aurait signalé. `speakerId` n'est jamais renseigné non plus (la route fournit `id`).

**Correction** — `readonly id = input.required<string>()` (lié à la route via `withComponentInputBinding`), types `Speaker`/`Talk`, et ajouter `photoUrl?` au modèle si la photo est voulue.

### MINOR · Image sans `alt` ni `NgOptimizedImage`
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — `<img [src]="speaker.photoUrl">` n'a pas d'`alt` : un lecteur d'écran lira l'URL. La convention impose `NgOptimizedImage`.

**Correction** — `<img [ngSrc]="photoUrl" width="80" height="80" alt="" …>` (`alt=""` car le nom suit dans le `h1`), et importer `NgOptimizedImage`.

### MINOR · `effect` qui recopie un signal dans un autre
`src/app/proposals/proposal-form.ts:37`

**Problème** — `charCount` est alimenté par un `effect` qui fait `set(...)`. C'est un état dérivé : l'`effect` ajoute un cycle inutile et un état intermédiaire incohérent.

**Correction** — `protected readonly charCount = computed(() => this.abstract().length);` et supprimer l'`effect`.

### MINOR · `valueChanges` jamais libéré et `draft` redondant
`src/app/proposals/proposal-form.ts:47`

**Problème** — L'abonnement à `form.valueChanges` n'a pas de `takeUntilDestroyed`, contrairement à celui juste en dessous. Il ne sert qu'à recopier la valeur du formulaire dans `draft`, que le formulaire connaît déjà.

**Correction** — Supprimer `draft` et l'abonnement. Dans `submit()`, utiliser `{ ...this.form.getRawValue(), abstract: this.abstract() }`. Pour `selectedTrack`, `toSignal(this.form.controls.track.valueChanges, { initialValue: 'Frontend' })`.

### MINOR · Résumé hors du formulaire : limite de 600 caractères non appliquée
`src/app/proposals/proposal-form.html:28`

**Problème** — Le résumé est géré à part (`[value]` + `(input)`) : il n'est ni requis ni limité. Le compteur affiche « 650 / 600 » sans rien bloquer, et un résumé vide est accepté. Le compteur n'est pas relié au champ pour les lecteurs d'écran.

**Correction** — En faire un contrôle du formulaire (`Validators.required`, `Validators.maxLength(600)`, `maxlength="600"`), relier l'aide avec `aria-describedby`, et garder la sauvegarde du brouillon à partir de sa valeur.

### MINOR · Guard en classe `CanActivate`
`src/app/proposals/proposal.guard.ts:7`

**Problème** — Les guards en classe sont dépréciés depuis Angular 15.2 au profit des guards fonctionnels, plus cohérents avec `inject()`.

**Correction** —
```ts
export const proposalGuard: CanActivateFn = () =>
  Date.now() > CFP_CLOSES_AT.getTime() ? inject(Router).parseUrl('/') : true;
```

### MINOR · Page speaker chargée en eager
`src/app/app.routes.ts:22`

**Problème** — `component: SpeakerSpotlight` embarque la page dans le bundle initial, alors que toutes les autres routes sont en `loadComponent`.

**Correction** — `loadComponent: () => import('./speakers/speaker-spotlight')` avec un `export default class`, comme les autres pages.

### MINOR · `getInitials` duplique `initialsOf`
`src/app/speakers/speaker-spotlight.ts:42`

**Problème** — Réimplémentation de `talks/initials.ts`, appelée comme méthode depuis le template (réévaluée à chaque détection), et qui donne des résultats différents pour un même nom (pas de limite à deux lettres, plante sur un double espace).

**Correction** — `protected readonly initials = computed(() => initialsOf(this.speaker()?.name ?? ''));`

### MINOR · `it.only` commité et test qui ne vérifie rien
`src/app/speakers/speaker-spotlight.spec.ts:20`

**Problème** — `it.only` est un focus de débogage : Vitest échoue en CI (`allowOnly` désactivé quand `CI` est défini). Le seul test vérifie `toBeTruthy()` sans rendre le composant, donc il passe malgré le plantage de `ngOnInit`.

**Correction** — Remplacer par `it`, et tester le comportement : rendu du nom et des talks d'un speaker, bio affichée en texte (`<b>` non interprété), « Tout ajouter » qui incrémente les favoris, état speaker introuvable.

### MINOR · Nouveau code sans test
`src/app/proposals/proposal-form.ts:15`

**Problème** — `ProposalForm`, `ProposalGuard`, `FavoritesStore.add` et le message de retour de `TalkCard` n'ont aucun test. Deux des MAJOR ci-dessus (`add`, `isFavorite`) auraient été attrapés par un test d'une ligne.

**Correction** — Specs comportementales sur le modèle des existantes : soumission invalide puis valide, compteur de caractères, guard avant/après la date (avec `vi.setSystemTime`), `add` sans doublon, messages « Ajouté » / « Retiré ».

### MINOR · `SpeakerService` : injection par constructeur, `any`, `console.log`
`src/app/speakers/speaker.service.ts:9`

**Problème** — Injection par constructeur au lieu d'`inject()`, retours `Observable<any>`, et un `console.log` de débogage laissé à la ligne 12.

**Correction** — Si le service est conservé malgré le finding sur l'URL en dur : `private readonly http = inject(HttpClient)`, `http.get<Speaker>(…)`, retirer le `console.log`.

### INFO · Formulaire non typé
`src/app/proposals/proposal-form.ts:3`

**Problème** — `UntypedFormBuilder`/`UntypedFormGroup` perdent le typage des valeurs (le `subscribe((track: Track) => …)` est un cast déguisé).

**Correction** — `inject(NonNullableFormBuilder).group({ title: ['', Validators.required], track: ['Frontend' as Track], … })`.

### INFO · Brouillon du résumé conservé après l'envoi
`src/app/proposals/proposal-form.ts:65`

**Problème** — Après l'envoi, le brouillon `conf-planner:proposal-abstract` reste en `localStorage` et pré-remplit la proposition suivante. Le formulaire n'est pas réinitialisé.

**Correction** — Après l'enregistrement, `this.form.reset()` et `this.abstract.set('')` (l'`effect` videra le brouillon).

### INFO · Une live region par carte, message jamais effacé
`src/app/talks/talk-card.html:3`

**Problème** — Chaque carte du programme porte son propre `role="status"`, et le message reste affiché indéfiniment à côté du badge, même après plusieurs clics sur d'autres cartes.

**Correction** — Envisager une seule région `role="status"` au niveau de la liste (alimentée par un service ou par `talk-list`), ou effacer le message après quelques secondes.
