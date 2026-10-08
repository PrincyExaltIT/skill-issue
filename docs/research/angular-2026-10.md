# Angular — état de l'art pour la review (8 octobre 2026)

Brief de recherche qui a nourri `angular-review` v2. Vérifié contre les changelogs Angular et angular-eslint, les sources d'angular.dev, la CLI, npm et les typings livrés avec `@angular/core@22.2.1`. « NON VÉRIFIÉ » signale ce qui n'a pas pu être confirmé dans une source primaire.

## Versions

- Dernière stable : **22.2** (`@angular/core` 22.2.1, `@angular/cli` 22.2.2, 30/09/2026). `next` : 22.3.0-next.x.
- Sorties : v22.0 le 03/06/2026, v22.1 le 29/07/2026, v22.2 le 23/09/2026. Majeures désormais annuelles (v23 vers juin 2027).
- Support : v22 active jusqu'en 06/2027 puis LTS jusqu'en 06/2028 ; v21 LTS jusqu'en 06/2027 ; v20 LTS jusqu'au 28/11/2026 ; ≤ 19 en fin de vie.
- v22 exige TypeScript ≥ 6.0 et Node 22.22+ / 24.13.1+ (la CLI 22.2 demande 24.15+ en pratique).
- angular-eslint 22.5.0, flat config uniquement.

## Ce qui change la review

| Sujet | État en 22.2 |
|---|---|
| Standalone | défaut depuis v19 ; `standalone: true` est redondant |
| `@if` / `@for` / `@switch` | stables ; `track` obligatoire ; `*ngIf/*ngFor/*ngSwitch` dépréciés depuis 20.0, toujours livrés |
| Signals (`signal`, `computed`, `effect`, `linkedSignal`, `toSignal`) | stables (`effect`, `linkedSignal`, `toSignal` depuis v20) ; `allowSignalWrites` no-op déprécié |
| `input()` / `output()` / `model()`, requêtes signal | stables depuis v19 |
| `resource`, `rxResource`, `httpResource` | **stables en v22** (`@publicApi 22.0` dans les typings) |
| `debounced()`, `resourceFromSnapshots()` | expérimentaux |
| Signal Forms (`@angular/forms/signals`) | **stables en v22** : `form()`, directive `[formField]`, `submit()`, `required()`… |
| Zoneless | stable depuis 20.2 ; **défaut des nouvelles apps en v21** (TestBed compris) |
| OnPush | **défaut en v22** ; `ChangeDetectionStrategy.Default` déprécié au profit de `Eager` ; `ng update` ajoute `Eager` aux composants existants |
| `@Service()` | stable en v22 (équivalent `@Injectable({providedIn:'root'})` + `inject()`) ; `ng g service` le génère |
| `injectAsync()` | stable en v22 |
| `host: {}` | recommandé ; `@HostBinding`/`@HostListener` **non dépréciés** |
| Style guide 2025 | v20 : plus de suffixes `.component` / `.service` |
| Vitest | runner par défaut depuis v21 |
| HttpClient | injectable sans `provideHttpClient()` depuis v21 ; backend Fetch par défaut en v22 (`withFetch()` déprécié) ; JSONP déprécié en 22.1 |
| `strictTemplates` | actif par défaut en v22 ; `?.` dans les templates renvoie `undefined` |
| `@angular/animations` | déprécié depuis 20.2, retrait prévu en v23 |
| Guards en classe | **non dépréciés** (fonctions idiomatiques) ; `canLoad` déprécié → `canMatch` |

Pièges de la montée en v22 : composants sans `changeDetection` devenus OnPush (UI figée là où le code mutait des objets), `paramsInheritanceStrategy: 'always'` par défaut, `provideRoutes()` retiré, NG8023 pour un élément matché par deux composants, upload progress via `withXhr()`.

## Ce qui est mécanique, ce qui demande du jugement

- **angular-eslint** couvre déjà : `prefer-standalone`, `prefer-inject`, `prefer-on-push-component-change-detection`, `no-output-native`, `no-input-rename`, `template/prefer-control-flow`, `template/alt-text`, `template/click-events-have-key-events`, `template/label-has-associated-control`, `prefer-signals`, `prefer-host-metadata-property`, `prefer-service-decorator` (22.1), `no-uncalled-signals`, `computed-must-return`, `no-implicit-take-until-destroyed`, `template/prefer-ngsrc`, `template/prefer-class-binding`…
- **Diagnostics compilateur** (`ng build`) : NG8101–NG8117 (banana-in-box, signal non appelé dans une interpolation NG8109, `track` non appelé NG8115…).
- **rxjs-x** : `no-nested-subscribe`, `no-ignored-subscription`, `no-sharereplay`…
- **Jugement** : un `effect` légitime ou une synchro d'état ; `computed` vs `linkedSignal` vs `resource` ; coût réel d'un appel dans un template ; abonnement fini ou non ; bon opérateur de flattening ; fiabilité d'une source `[innerHTML]` ; sécurité SSR en contexte ; passage de `Eager` à OnPush ; qualité des tests ; sémantique a11y.

Faux positifs à éviter : lectures de signals dans les templates ; suffixes absents en v20+ ; OnPush absent en v22+ ; `@Injectable` nécessaire (DI par constructeur, providers avancés) ; guards en classe et `@HostListener` ; reactive forms existants ; `provideHttpClient()` absent en v21+.

## Guidance IA officielle d'Angular

- `angular.dev/ai` : develop-with-ai, agent-skills, mcp, ai-tutor, webmcp (expérimental).
- **Fichier de bonnes pratiques** livré dans `@angular/core` (`resources/best-practices.md`, déclaré dans `package.json` → `angular.bestPractices`) ; servi par l'outil MCP `get_best_practices`.
- `ng new --ai-config=<outil>` / `ng generate ai-config` (claude-code, cursor, gemini-cli, open-ai-codex, vscode…).
- **Serveur MCP** : `npx -y @angular/cli mcp` ; outils `list_projects`, `get_best_practices`, `search_documentation`, `ai_tutor`, `onpush_zoneless_migration`, `run_target`, `devserver.*`.
- **Agent Skills officiels** (v22) : `npx skills add https://github.com/angular/skills` → `angular-developer` (~44 références) et `angular-new-app`. **Aucun skill de review.**

## Sources principales

angular.dev/reference/releases · CHANGELOG angular/angular et angular/angular-cli · blog.angular.dev (annonces v20, v21, v22) · typings `@angular/*@22.2.1` · angular.dev/style-guide · angular.dev/guide/signals · angular.dev/guide/zoneless · angular.dev/guide/templates/control-flow · angular.dev/ecosystem/rxjs-interop · angular.dev/guide/forms/signals/overview · angular.dev/best-practices/security · angular.dev/best-practices/a11y · angular.dev/extended-diagnostics · angular.dev/ai · github.com/angular/skills · github.com/angular-eslint/angular-eslint · github.com/JasonWeinzierl/eslint-plugin-rxjs-x · blog.ninja-squad.com (notes 22.0 et 22.1, source secondaire).
