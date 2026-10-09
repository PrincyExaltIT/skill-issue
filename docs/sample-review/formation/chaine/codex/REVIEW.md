# Revue — `run/chaine-codex` → `depart`

**Verdict : à corriger**

La branche ajoute une page speaker, un formulaire de proposition et des retours utilisateur sur les favoris. La page speaker est toutefois bloquée à l'exécution, une bio issue d'une API contourne le sanitizer, et plusieurs parcours sont cassés ou inaccessibles.

| BLOCKER | MAJOR | MINOR | INFO |
|:---:|:---:|:---:|:---:|
| 5 | 14 | 14 | 2 |

## Findings

### BLOCKER · SIG-04 · La page speaker lève NG0203 à son initialisation
`src/app/speakers/speaker-spotlight.ts:30`

**Problème** — `takeUntilDestroyed()` est appelé sans argument dans `ngOnInit`, hors contexte d'injection. L'ouverture d'une URL `/speakers/:id` lève NG0203 avant même que le speaker soit chargé.

**Correction** — Injecter `DestroyRef` dans un champ puis appeler `takeUntilDestroyed(this.destroyRef)`, ou construire le flux dans un initialiseur de champ.

### BLOCKER · SEC-01 · La bio contourne explicitement la protection XSS
`src/app/speakers/speaker-spotlight.ts:34`

**Problème** — `bypassSecurityTrustHtml(speaker.bio)` marque comme sûr le contenu reçu de l'API. Le formulaire annonce justement que la bio accepte du HTML, alors que le modèle existant documente une bio en texte brut : un contenu hostile peut donc être exécuté dans la page speaker.

**Correction** — Afficher la bio par interpolation (`{{ speaker.bio }}`). Si du formatage est réellement requis, définir un sous-ensemble autorisé et le nettoyer côté serveur sans `bypassSecurityTrustHtml`.

### BLOCKER · SIG-01 · Le message de favori annonce toujours un retrait
`src/app/talks/talk-card.ts:28`

**Problème** — `this.isFavorite` est la fonction signal, donc `!this.isFavorite` vaut toujours `false`. Quand l'utilisateur ajoute un talk, le composant affiche « Retiré de vos favoris ».

**Correction** — Tester `if (!this.isFavorite())` avant d'émettre `favoriteToggled`.

### BLOCKER · A11Y-03 · Le titre de proposition n'a pas de nom accessible
`src/app/proposals/proposal-form.html:15`

**Problème** — Le champ titre n'a qu'un placeholder, sans `<label>` ni `aria-label`. Son intitulé disparaît pendant la saisie et le champ n'est pas correctement identifié au lecteur d'écran.

**Correction** — Ajouter un `<label for="title">Titre du talk</label>` et `id="title"` sur l'input.

### BLOCKER · A11Y-02 · Les talks du speaker ne sont ni navigables ni utilisables au clavier
`src/app/speakers/speaker-spotlight.html:22`

**Problème** — Un `div` porte le `(click)` : il ne reçoit pas le focus et ne répond pas au clavier. De plus, la page étant créée par le routeur, aucun parent n'écoute l'output `select` ; même à la souris, le clic ne navigue nulle part.

**Correction** — Remplacer l'action par un vrai lien, par exemple `[routerLink]="['/talks', talk.id]"`, avec une zone cliquable et un style de focus visible.

### MAJOR · NG-11 · La page speaker entre dans le bundle initial
`src/app/app.routes.ts:22`

**Problème** — La nouvelle route utilise `component: SpeakerSpotlight` et son import statique, alors que toutes les pages du projet sont chargées à la demande. Tous les visiteurs téléchargent donc cette page et ses dépendances.

**Correction** — Utiliser `loadComponent: () => import('./speakers/speaker-spotlight').then((m) => m.SpeakerSpotlight)` et supprimer l'import statique.

### MAJOR · SIG-02 · « Tout ajouter » ne notifie ni la vue ni la persistance
`src/app/favorites/favorites.store.ts:28`

**Problème** — `this.ids().push(id)` modifie le tableau du signal sans changer sa référence. Les `computed`, le compteur, la liste des favoris et l'effet `localStorage` ne sont pas réévalués après « Tout ajouter à mes favoris ».

**Correction** — Faire une mise à jour immuable et éviter les doublons, par exemple `this.ids.update(ids => ids.includes(id) ? ids : [...ids, id])`.

### MAJOR · SIG-03 · Un effect dérive inutilement un second signal
`src/app/proposals/proposal-form.ts:38`

**Problème** — L'effect recopie `abstract().length` dans `charCount`, avec une mise à jour différée et deux sources d'état à maintenir.

**Correction** — Remplacer `charCount` et le premier effect par `readonly charCount = computed(() => this.abstract().length)`.

### MAJOR · RX-01 · L'abonnement du formulaire survit au composant
`src/app/proposals/proposal-form.ts:47`

**Problème** — `form.valueChanges` ne se termine pas et l'abonnement n'est jamais libéré. Chaque recréation du formulaire laisse un observateur actif.

**Correction** — Ajouter `.pipe(takeUntilDestroyed(this.destroyRef))` ou supprimer l'état miroir et lire `this.form.getRawValue()` dans `submit()`.

### MAJOR · ZL-01 · La confirmation d'envoi ne s'affiche pas en zoneless
`src/app/proposals/proposal-form.ts:67`

**Problème** — `submitted` est un champ ordinaire modifié dans un `setTimeout`. Ce callback ne notifie pas la détection de changement zoneless ; l'utilisateur peut ne jamais voir la confirmation.

**Correction** — Utiliser `readonly submitted = signal(false)` puis `this.submitted.set(true)`, et lire `submitted()` dans le template.

### MAJOR · hors règles · Un formulaire invalide échoue sans explication
`src/app/proposals/proposal-form.ts:60`

**Problème** — `markAllAsTouched()` est appelé, mais le template n'affiche aucun message d'erreur et l'input n'a pas d'attribut `required`. En envoyant un titre vide, l'utilisateur ne voit aucune raison au refus.

**Correction** — Afficher un message lié au champ lorsque `title.touched && title.hasError('required')`, avec `aria-describedby`, et déplacer le focus sur le premier champ invalide.

### MAJOR · A11Y-01 · Le portrait du speaker n'a pas de texte alternatif
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — L'image n'a aucun attribut `alt`; son contenu n'est pas annoncé correctement par un lecteur d'écran.

**Correction** — Ajouter `[alt]="'Portrait de ' + speaker.name"`, ou `alt=""` si le portrait est strictement décoratif.

### MAJOR · NG-07 · La page force la détection Eager
`src/app/speakers/speaker-spotlight.ts:14`

**Problème** — `ChangeDetectionStrategy.Eager` désactive le défaut OnPush du projet sans justification et fait vérifier le composant à chaque cycle. Cela ne corrige pas les mutations asynchrones non signalées en mode zoneless.

**Correction** — Supprimer `changeDetection` et exposer l'état asynchrone via des signals, `httpResource` ou `toSignal`.

### MAJOR · ZL-01 · Les réponses HTTP modifient des champs non réactifs
`src/app/speakers/speaker-spotlight.ts:33`

**Problème** — `speaker`, `bioHtml` et `talks` sont des champs ordinaires assignés dans des callbacks HTTP. En zoneless, ces mutations ne notifient pas la vue : elle peut rester sur « Chargement du speaker… » malgré une réponse réussie.

**Correction** — Utiliser des signals/resources lus par le template, ou marquer explicitement la vue après la réponse.

### MAJOR · RX-02 · Les chargements speaker/talks sont imbriqués et non annulés
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — Deux `subscribe()` HTTP sont imbriqués sous `paramMap`. Lors d'une navigation rapide entre deux IDs, les anciennes requêtes restent actives et une réponse tardive peut remplacer le speaker courant.

**Correction** — Composer `paramMap`, `getSpeaker` et `getTalks` avec `switchMap` (ou utiliser des resources) et n'avoir qu'un seul consommateur réactif.

### MAJOR · RX-03 · Un échec HTTP laisse la page en chargement permanent
`src/app/speakers/speaker-spotlight.ts:32`

**Problème** — Aucun des deux appels HTTP ne gère ni n'affiche son erreur. En cas d'échec, l'utilisateur reste sans explication ni possibilité de réessayer.

**Correction** — Exposer un état d'erreur visible avec `role="alert"` et une action « Réessayer ».

### MAJOR · NG-06 · L'output porte le nom d'un événement DOM
`src/app/speakers/speaker-spotlight.ts:18`

**Problème** — `select` se confond avec l'événement DOM natif du même nom. Un consommateur peut écouter le mauvais événement ; ici l'output n'est de toute façon pas raccordé par la route.

**Correction** — Supprimer cet output au profit de `routerLink`, ou le renommer en `talkSelected` si un parent doit réellement le consommer.

### MAJOR · SEC-02 · La page speaker appelle un backend local inexistant
`src/app/speakers/speaker.service.ts:7`

**Problème** — L'URL `http://localhost:3000/api/speakers` ne correspond ni au serveur Angular documenté (`:4200`) ni au token `API_BASE_URL` existant (`/data`). En production, le navigateur appelle le localhost du visiteur et la page speaker échoue.

**Correction** — Réutiliser `API_BASE_URL` et les données/stores existants, ou fournir une URL d'environnement explicitement configurée.

### MAJOR · TEST-01 · Un test focalisé masque toute la suite
`src/app/speakers/speaker-spotlight.spec.ts:20`

**Problème** — `it.only` empêche les autres tests de s'exécuter localement et fait échouer Vitest lorsque `allowOnly` est désactivé en CI.

**Correction** — Remplacer `it.only` par `it`.

### MINOR · NG-09 · Le nouveau formulaire abandonne le typage strict
`src/app/proposals/proposal-form.ts:3`

**Problème** — `UntypedFormBuilder` et `UntypedFormGroup` font circuler des `any`, notamment pour `track` et le brouillon soumis.

**Correction** — Utiliser `inject(FormBuilder).nonNullable.group(...)` avec des contrôles typés.

### MINOR · hors règles · La limite annoncée de 600 caractères n'est pas appliquée
`src/app/proposals/proposal-form.html:29`

**Problème** — Le compteur affiche « / 600 caractères », mais le textarea n'a ni `maxlength` ni validation correspondante. Une proposition plus longue est acceptée et confirmée.

**Correction** — Ajouter `maxlength="600"` et valider la même limite dans le modèle de formulaire.

### MINOR · TEST-02 · Le formulaire de proposition n'a aucun test
`src/app/proposals/proposal-form.ts:1`

**Problème** — Le nouveau formulaire n'a pas de `.spec.ts`, alors qu'il contient validation, persistance, effets et état asynchrone.

**Correction** — Tester au minimum le refus d'un titre vide, le compteur/maximum, la sauvegarde et la confirmation.

### MINOR · NG-10 · Le nouveau guard utilise la forme classe
`src/app/proposals/proposal.guard.ts:7`

**Problème** — Le guard neuf est une classe injectable alors que le projet Angular 22 privilégie les guards fonctionnels.

**Correction** — Exporter un `CanActivateFn` qui injecte `Router` directement.

### MINOR · TEST-02 · La date de fermeture n'est pas testée
`src/app/proposals/proposal.guard.ts:1`

**Problème** — Aucun test ne couvre les deux côtés de la date de clôture ni la redirection.

**Correction** — Tester une date avant et après `CFP_CLOSES_AT` avec une horloge contrôlée.

### MINOR · NG-01 · La page speaker réintroduit les directives structurelles dépréciées
`src/app/speakers/speaker-spotlight.html:3`

**Problème** — Le nouveau template utilise `*ngIf` et `*ngFor` aux lignes 3, 5, 6 et 22, contrairement au control flow natif demandé par le dépôt.

**Correction** — Remplacer ces directives par `@if` et `@for (...; track talk.id)` puis retirer `NgIf`/`NgFor` des imports.

### MINOR · NG-02 · Le composant utilise les anciens décorateurs d'entrée/sortie
`src/app/speakers/speaker-spotlight.ts:17`

**Problème** — `@Input` et `@Output` ne suivent pas la convention `input()` / `output()` du dépôt.

**Correction** — Employer des entrées/sorties signal typées, si elles restent nécessaires après le passage aux liens de routeur.

### MINOR · NG-04 · L'état du speaker perd tous ses contrats de type
`src/app/speakers/speaker-spotlight.ts:20`

**Problème** — `speaker: any` et `talks: any[]` masquent les incohérences avec les interfaces `Speaker` et `Talk` existantes.

**Correction** — Réutiliser `Speaker` et `Talk` et typer les réponses du service.

### MINOR · NG-12 · Le calcul d'initiales duplique l'utilitaire existant
`src/app/speakers/speaker-spotlight.ts:42`

**Problème** — `getInitials` réimplémente `initialsOf` et est rappelé avec un argument depuis le template. Les deux implémentations divergent déjà sur les espaces et le nombre maximal de lettres.

**Correction** — Réutiliser `initialsOf` dans un `computed` ou préparer la valeur à la réception du speaker.

### MINOR · NG-03 · Le service utilise l'injection par constructeur
`src/app/speakers/speaker.service.ts:9`

**Problème** — Le nouveau service ne suit pas la convention `inject()` du dépôt.

**Correction** — Déclarer `private readonly http = inject(HttpClient)`.

### MINOR · NG-04 · Les réponses HTTP du service sont non typées
`src/app/speakers/speaker.service.ts:11`

**Problème** — `Observable<any>` est utilisé pour le speaker et les talks, ce qui empêche TypeScript de détecter un schéma incompatible.

**Correction** — Retourner `Observable<Speaker>` et `Observable<Talk[]>`.

### MINOR · NG-05 · Une trace de débogage reste dans le service
`src/app/speakers/speaker.service.ts:12`

**Problème** — Chaque chargement d'un speaker écrit son identifiant dans la console de production.

**Correction** — Supprimer le `console.log`.

### MINOR · TEST-02 · Le service HTTP n'a aucun test
`src/app/speakers/speaker.service.ts:1`

**Problème** — Aucun test ne vérifie les URLs, les types ou les erreurs du nouveau service.

**Correction** — Ajouter un test avec `provideHttpClientTesting()` et `HttpTestingController`, ou supprimer le service au profit du store existant.

### MINOR · TEST-03 · Le seul test ne vérifie aucun comportement
`src/app/speakers/speaker-spotlight.spec.ts:20`

**Problème** — L'unique assertion vérifie seulement que l'instance existe ; `fixture.detectChanges()` n'est jamais appelé, donc ni le template ni `ngOnInit` ni les requêtes ne sont exercés.

**Correction** — Tester le chargement, l'erreur, la navigation clavier et l'ajout des favoris avec des dépendances contrôlées.

### INFO · NG-14 · Le portrait n'utilise pas `NgOptimizedImage`
`src/app/speakers/speaker-spotlight.html:5`

**Problème** — Le nouveau portrait utilise `[src]` sans dimensions déclarées ni `NgOptimizedImage`.

**Correction** — Utiliser `[ngSrc]` avec `width` et `height` et importer `NgOptimizedImage`.

### INFO · NG-13 · Le nouveau service conserve l'ancien décorateur racine
`src/app/speakers/speaker.service.ts:5`

**Problème** — Le nouveau fichier déclare `@Injectable({ providedIn: 'root' })` au lieu de la forme Angular 22 prévue par les règles de l'équipe.

**Correction** — Utiliser le décorateur de service racine retenu par le projet.

## Écartés à la vérification

- `src/app/proposals/proposal-form.ts:52` · RX-01 — `takeUntilDestroyed(this.destroyRef)` reçoit un `DestroyRef` injecté et libère correctement cet abonnement.
- `src/app/speakers/speaker-spotlight.ts:30` · RX-01 — La tentative de libération existe ; la piste RX-01 est remplacée par le BLOCKER SIG-04 car l'appel sans argument est invalide dans `ngOnInit`.
- `src/app/speakers/speaker-spotlight.ts:32` · RX-01 — `HttpClient` termine cet abonnement après sa réponse ; le risque conservé est l'imbrication/non-annulation (RX-02), pas une fuite autonome.
- `src/app/speakers/speaker-spotlight.ts:35` · RX-01 — Même raison : la requête HTTP se termine ; elle est couverte par le finding RX-02 sur la chaîne imbriquée.
