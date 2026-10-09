# Revue — lab/speaker-spotlight → depart

**Verdict : à corriger**

La branche ajoute une page speaker, un formulaire de proposition et des retours visuels sur les favoris. La page speaker est actuellement inutilisable au démarrage et dépend d'une API absente du dépôt ; elle introduit aussi un contournement du sanitizer, tandis que plusieurs parcours restent inaccessibles ou non réactifs en mode zoneless.

| BLOCKER | MAJOR | MINOR | INFO |
|:---:|:---:|:---:|:---:|
| 6 | 12 | 14 | 2 |

## Findings

### BLOCKER · SIG-04 · La page speaker lève NG0203 à l'initialisation
`src/app/speakers/speaker-spotlight.ts:30`

**Problème** — `takeUntilDestroyed()` est appelé sans argument dans `ngOnInit()`, hors contexte d'injection. L'ouverture de `/speakers/:id` lève `NG0203` avant même de charger le speaker.

**Correction** — Injecter `DestroyRef` dans un champ puis appeler `takeUntilDestroyed(this.destroyRef)`, ou construire la chaîne réactive dans un initialiseur de champ.

### BLOCKER · SEC-01 · La bio contourne explicitement la protection XSS
`src/app/speakers/speaker-spotlight.ts:34`

**Problème** — `bypassSecurityTrustHtml(speaker.bio)` marque comme sûr du contenu reçu d'une API. Une bio contenant du HTML hostile est injectée telle quelle via `[innerHTML]`.

**Correction** — Respecter le contrat texte brut de `Speaker.bio` et afficher `{{ speaker.bio }}`. Si du contenu riche devient nécessaire, définir un format limité et le nettoyer côté serveur sans `bypassSecurityTrustHtml`.

### BLOCKER · SEC-02 · La page appelle une API qui n'existe pas dans l'application
`src/app/speakers/speaker.service.ts:7`

**Problème** — Le service appelle `http://localhost:3000/api/speakers/:id`, alors que l'application fournit uniquement `/data/speakers.json` et `/data/talks.json` via `API_BASE_URL`. En production, l'URL pointe vers le poste du visiteur ; même en développement, aucun serveur correspondant n'est fourni. La gravité SEC-02 est élevée de MAJOR à BLOCKER car tout le nouveau parcours speaker échoue.

**Correction** — Réutiliser `TalksStore` pour sélectionner le speaker et ses talks, ou injecter `API_BASE_URL` et consommer les fichiers réellement servis. Ajouter un test HTTP avec `provideHttpClientTesting()`.

### BLOCKER · A11Y-02 / NG-06 · Les talks du speaker ne naviguent pas et sont inaccessibles au clavier
`src/app/speakers/speaker-spotlight.html:22`

**Problème** — Chaque talk est un `div` cliquable, sans focus ni activation clavier. Le clic ne navigue pas non plus : il émet l'output `select`, non écouté puisque le composant est une page routée ; ce nom se confond en outre avec l'événement DOM `select`.

**Correction** — Remplacer le `div` par un lien, par exemple `<a class="talk" [routerLink]="['/talks', talk.id]">…</a>`, puis supprimer l'output `select`.

### BLOCKER · A11Y-03 · Le titre du talk n'a pas de label
`src/app/proposals/proposal-form.html:15`

**Problème** — Le champ utilise uniquement un placeholder. Celui-ci disparaît pendant la saisie et ne donne pas un nom accessible fiable au contrôle.

**Correction** — Ajouter un `<label for="proposal-title">Titre du talk</label>` et `id="proposal-title"` sur l'input ; le label peut être visuellement masqué si le design l'exige.

### BLOCKER · SIG-01 · Le retour favori lit la fonction signal au lieu de sa valeur
`src/app/talks/talk-card.ts:28`

**Problème** — `if (!this.isFavorite)` teste la fonction signal, toujours truthy. Après chaque clic, y compris un ajout, l'interface annonce toujours « Retiré de vos favoris ».

**Correction** — Lire le signal avec `if (!this.isFavorite())`.

### MAJOR · SIG-02 · « Tout ajouter » mute les favoris sans notifier l'application
`src/app/favorites/favorites.store.ts:28`

**Problème** — `this.ids().push(id)` modifie le tableau en place. Le signal ne change pas de référence : le compteur, les `computed` et l'effet de persistance ne sont pas rejoués. Le bouton peut donc sembler n'avoir aucun effet et les favoris ne sont pas sauvegardés.

**Correction** — Utiliser `this.ids.update(ids => ids.includes(id) ? ids : [...ids, id])` et couvrir `add()` dans le test du store.

### MAJOR · SIG-03 · Un effect dérive inutilement le compteur de caractères
`src/app/proposals/proposal-form.ts:36`

**Problème** — L'effet écrit dans `charCount` à partir de `abstract`, ce qui crée un état dérivé mis à jour en différé et susceptible de diverger.

**Correction** — Remplacer `charCount` et le premier `effect()` par `readonly charCount = computed(() => this.abstract().length)`.

### MAJOR · RX-01 · L'abonnement au formulaire survit au composant
`src/app/proposals/proposal-form.ts:47`

**Problème** — `form.valueChanges` ne se termine pas seul. Chaque recréation de la page laisse un abonnement actif et continue de modifier l'ancienne instance.

**Correction** — Ajouter `.pipe(takeUntilDestroyed(this.destroyRef))` avant `subscribe()`, ou supprimer `draft` et lire `this.form.getRawValue()` lors du submit.

### MAJOR · ZL-01 · La confirmation de proposition reste invisible
`src/app/proposals/proposal-form.ts:66`

**Problème** — En mode zoneless, le `setTimeout` modifie un booléen ordinaire. Aucun signal ne planifie le rendu ; après l'enregistrement local, le message « Merci » peut ne jamais apparaître.

**Correction** — Déclarer `readonly submitted = signal(false)`, appeler `this.submitted.set(true)` et lire `submitted()` dans le template. Le délai n'apporte ici aucune valeur et peut aussi être supprimé.

### MAJOR · hors règles · Un formulaire invalide échoue sans explication
`src/app/proposals/proposal-form.html:15`

**Problème** — `submit()` marque les contrôles comme touched puis retourne, mais le template n'affiche aucun message d'erreur. Avec un titre vide, le bouton « Envoyer » semble simplement ne rien faire.

**Correction** — Afficher une erreur liée au champ quand `title.invalid && title.touched`, l'associer via `aria-describedby` et déplacer le focus sur le premier contrôle invalide.

### MAJOR · NG-11 · La page speaker alourdit le bundle initial
`src/app/app.routes.ts:22`

**Problème** — `component: SpeakerSpotlight` importe la page d'emblée, contrairement aux autres pages chargées à la demande. Son code, son service et ses dépendances entrent dans le bundle initial.

**Correction** — Utiliser `loadComponent: () => import('./speakers/speaker-spotlight').then(m => m.SpeakerSpotlight)` et supprimer l'import statique.

### MAJOR · NG-07 · La page speaker force la détection Eager
`src/app/speakers/speaker-spotlight.ts:14`

**Problème** — `ChangeDetectionStrategy.Eager` désactive le comportement OnPush par défaut du projet et fait vérifier le composant à chaque cycle, sans justification.

**Correction** — Supprimer la propriété `changeDetection` et porter les données asynchrones dans des signals/resources.

### MAJOR · RX-02 · Les chargements speaker et talks sont imbriqués
`src/app/speakers/speaker-spotlight.ts:30`

**Problème** — Un changement rapide de paramètre laisse les requêtes précédentes actives. Une réponse tardive peut remplacer le speaker courant puis charger les talks du mauvais speaker.

**Correction** — Composer `paramMap`, le speaker et ses talks avec `switchMap` et un seul abonnement, ou exposer des `httpResource()` dépendant de l'id.

### MAJOR · RX-03 · Une erreur HTTP laisse l'écran bloqué sur « Chargement »
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — Aucun appel HTTP ne gère l'erreur. Une réponse 404, un backend absent ou une coupure réseau laisse `speaker` vide et aucun message ni action de reprise n'est présenté.

**Correction** — Exposer un état d'erreur visible avec une action Réessayer, via `catchError` ou les états d'un `httpResource()`.

### MAJOR · ZL-01 · Les réponses HTTP modifient des champs non réactifs
`src/app/speakers/speaker-spotlight.ts:33`

**Problème** — `speaker`, `bioHtml` et `talks` sont des champs ordinaires modifiés dans des callbacks asynchrones. En zoneless, cela ne planifie pas de rendu ; forcer `Eager` ne crée pas le cycle manquant.

**Correction** — Utiliser des signals/resources lus par le template, ou appeler explicitement `markForCheck()` après chaque mise à jour.

### MAJOR · A11Y-01 · Le portrait du speaker n'a pas de texte alternatif
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — L'image n'a aucun `alt`; un lecteur d'écran peut annoncer l'URL ou ne donner aucune information utile.

**Correction** — Ajouter `[alt]="'Portrait de ' + speaker.name"`, ou `alt=""` si l'avatar est purement décoratif.

### MAJOR · TEST-01 · Le test focalisé masque le reste de la suite
`src/app/speakers/speaker-spotlight.spec.ts:20`

**Problème** — `it.only` empêche les autres tests de s'exécuter et fait échouer Vitest en CI stricte.

**Correction** — Remplacer par `it` et lancer toute la suite avec `CI=true`.

### MINOR · TEST-02 · Le formulaire de proposition n'a aucun test
`src/app/proposals/proposal-form.ts:1`

**Problème** — La persistance du brouillon, la validation, le filtrage par track et la confirmation zoneless n'ont aucun filet de régression.

**Correction** — Ajouter `proposal-form.spec.ts` avec au moins les parcours valide/invalide et la restauration du brouillon.

### MINOR · TEST-02 · Le guard de fermeture n'a aucun test
`src/app/proposals/proposal.guard.ts:1`

**Problème** — La date limite et la redirection ne sont pas vérifiées.

**Correction** — Ajouter un test avant et après l'échéance en contrôlant le temps et le `UrlTree` retourné.

### MINOR · TEST-02 · Le service speaker n'a aucun test
`src/app/speakers/speaker.service.ts:1`

**Problème** — Les URL et les contrats des réponses HTTP ne sont pas testés, ce qui laisse passer l'endpoint inexistant.

**Correction** — Ajouter `speaker.service.spec.ts` avec `provideHttpClientTesting()` et `HttpTestingController`.

### MINOR · NG-01 · Le template speaker utilise les directives structurelles dépréciées
`src/app/speakers/speaker-spotlight.html:3`

**Problème** — Les lignes 3, 5, 6 et 22 utilisent `*ngIf`/`*ngFor`, en contradiction avec le control flow natif exigé par le dépôt.

**Correction** — Migrer vers `@if` et `@for (talk of talks(); track talk.id)` puis retirer `NgIf`/`NgFor` des imports.

### MINOR · NG-02 · Le composant utilise les anciens décorateurs d'entrée/sortie
`src/app/speakers/speaker-spotlight.ts:17`

**Problème** — `@Input`, `@Output` et `EventEmitter` contournent la convention `input()`/`output()` du projet.

**Correction** — Utiliser `input()`/`output()` ; si la page lit uniquement l'id de route et navigue avec des liens, supprimer ces deux propriétés.

### MINOR · NG-04 · Les données du composant speaker sont non typées
`src/app/speakers/speaker-spotlight.ts:20`

**Problème** — `speaker: any` et `talks: any[]` masquent les incompatibilités, notamment l'accès à `photoUrl`, absent de l'interface et des données actuelles.

**Correction** — Employer `Speaker` et `Talk[]`, puis décider explicitement si `photoUrl` fait partie du modèle.

### MINOR · NG-03 · Le service utilise l'injection par constructeur
`src/app/speakers/speaker.service.ts:9`

**Problème** — Le style ne suit pas la convention `inject()` du dépôt.

**Correction** — Déclarer `private readonly http = inject(HttpClient)`.

### MINOR · NG-04 · Le service supprime les contrats HTTP
`src/app/speakers/speaker.service.ts:11`

**Problème** — `Observable<any>` sur les deux méthodes laisse toutes les formes de réponse passer à la compilation.

**Correction** — Retourner `Observable<Speaker>` et `Observable<Talk[]>`.

### MINOR · NG-05 · Une trace de débogage reste dans le service
`src/app/speakers/speaker.service.ts:12`

**Problème** — Chaque consultation écrit l'identifiant du speaker dans la console du navigateur.

**Correction** — Supprimer `console.log`.

### MINOR · NG-09 · Le formulaire est non typé
`src/app/proposals/proposal-form.ts:3`

**Problème** — `UntypedFormBuilder` et `UntypedFormGroup` transforment les valeurs en `any`, ce qui explique notamment le cast manuel du track.

**Correction** — Utiliser `inject(FormBuilder).nonNullable.group(...)` avec des contrôles typés, ou les Signal Forms Angular 22.

### MINOR · NG-10 · Le guard est écrit sous forme de classe dépréciée
`src/app/proposals/proposal.guard.ts:7`

**Problème** — `CanActivate` en classe ne suit pas la forme fonctionnelle attendue par Angular 22 et le dépôt.

**Correction** — Exporter un `CanActivateFn` qui injecte `Router`, puis référencer cette fonction dans la route.

### MINOR · NG-08 / NG-12 · Les initiales sont recalculées et dupliquées dans le template
`src/app/speakers/speaker-spotlight.html:6`

**Problème** — `getInitials(speaker.name)` est rappelé à chaque détection et réimplémente `initialsOf()` déjà présent dans `src/app/talks/initials.ts`; son comportement diffère aussi pour les noms de plus de deux mots.

**Correction** — Réutiliser `initialsOf` dans un `computed()` dérivé du speaker.

### MINOR · TEST-03 · Le seul test speaker ne vérifie que la création
`src/app/speakers/speaker-spotlight.spec.ts:20`

**Problème** — Le test n'appelle pas la détection de changements et ne couvre ni la route, ni HTTP, ni le rendu, ni les interactions ; il ne détecte donc pas le `NG0203` de `ngOnInit()`.

**Correction** — Tester le chargement d'un speaker, l'erreur HTTP, les liens vers les talks et l'ajout des favoris avec des doubles contrôlés.

### MINOR · hors règles · La limite de 600 caractères n'est pas appliquée
`src/app/proposals/proposal-form.html:27`

**Problème** — L'interface affiche « / 600 caractères », mais le textarea n'a ni `maxlength` ni validation correspondante ; une proposition plus longue est tout de même enregistrée.

**Correction** — Ajouter `maxlength="600"` et une validation cohérente, avec un message visible si la limite est dépassée.

### INFO · NG-13 · Le nouveau service utilise l'ancien décorateur racine
`src/app/speakers/speaker.service.ts:5`

**Problème** — Le dépôt Angular 22 peut déclarer ce service racine avec `@Service()`.

**Correction** — Remplacer `@Injectable({ providedIn: 'root' })` par `@Service()` si cette API est bien celle retenue par l'équipe.

### INFO · NG-14 · Le portrait n'utilise pas NgOptimizedImage
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — `[src]` ne bénéficie pas des contrôles de dimensions et des optimisations d'image Angular.

**Correction** — Utiliser `NgOptimizedImage`, `[ngSrc]` et des dimensions explicites.

## Écartés à la vérification

- `src/app/proposals/proposal-form.ts:52` · RX-01 — `takeUntilDestroyed(this.destroyRef)` reçoit un `DestroyRef` injecté : l'abonnement est libéré et l'appel est valide dans `ngOnInit`.
- `src/app/speakers/speaker-spotlight.ts:30` · RX-01 — la piste de fuite est remplacée par SIG-04 : `takeUntilDestroyed()` est présent, mais utilisé hors contexte d'injection et lève avant l'abonnement.
- `src/app/speakers/speaker-spotlight.ts:32` · RX-01 — l'appel `HttpClient` se termine seul ; les problèmes conservés sont l'imbrication RX-02, l'absence d'erreur RX-03 et la mise à jour zoneless ZL-01.
- `src/app/speakers/speaker-spotlight.ts:35` · RX-01 — même raison : la requête HTTP se termine, mais l'imbrication et les mises à jour asynchrones restent problématiques.

## Vérifications exécutées

- `node .agents/skills/revue-angular/scripts/perimetre.mjs --base depart` : 15 fichiers dans le périmètre.
- `node .agents/skills/revue-angular/scripts/verifs.mjs` : 27 pistes examinées, fusionnées, reclassées ou écartées ci-dessus.
- Compilation Angular directe avec `ngc -p tsconfig.app.json` : réussie.
- `ng test` et `ng build` via Angular CLI : résultat non exploitable dans ce sandbox. Le Node actif 24.12 est sous le minimum 24.15 ; avec Node 25.2, le bundler est bloqué par les restrictions d'accès aux chemins du sandbox avant l'exécution des tests ou la génération du bundle.
