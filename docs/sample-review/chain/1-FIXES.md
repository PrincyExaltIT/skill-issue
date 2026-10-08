# Corrections appliquées

Review source : `.review/findings.json` (2026-10-08T07:28:28.037Z) · verdict initial : REQUEST_CHANGES

| Finding | Sévérité | Règle | Fichier | Statut | Note |
|---|---|---|---|---|---|
| F-001 | BLOCKER | R-A11Y-013 | `src/app/proposals/proposal-form.html:15` | ✅ corrigé | Label visuellement masqué (sr-only) relié à l'input par id=proposal-title. |
| F-002 | BLOCKER | R-ARCH-017 | `src/app/proposals/proposal-form.ts:47` | ✅ corrigé | valueChanges passe par takeUntilDestroyed(this.destroyRef), comme l'abonnement au track. |
| F-003 | BLOCKER | R-A11Y-005 | `src/app/speakers/speaker-spotlight.html:22` | ✅ corrigé | Le (click) du div passe sur un <button type=button> dans le h3 ; un ::after étend la zone cliquable à toute la carte. Test qui sélectionne via ce bouton. |
| F-004 | BLOCKER | R-SIG-005 | `src/app/speakers/speaker-spotlight.ts:30` | ✅ corrigé | DestroyRef injecté en champ et passé à takeUntilDestroyed ; spec qui ouvre /speakers/:id via RouterTestingHarness (reproduisait NG0203). |
| F-005 | BLOCKER | R-ERR-005 | `src/app/speakers/speaker-spotlight.ts:32` | ✅ corrigé | catchError sur getSpeaker : signal loadError et message role=alert à la place de « Chargement… » ; test avec une réponse HTTP 500. |
| F-006 | BLOCKER | R-SEC-003 | `src/app/speakers/speaker-spotlight.ts:34` | ✅ corrigé | bypassSecurityTrustHtml et DomSanitizer supprimés ; [innerHTML] lie speaker.bio, assaini par Angular. Test avec un payload onerror. |
| F-007 | BLOCKER | R-ERR-005 | `src/app/speakers/speaker-spotlight.ts:35` | ✅ corrigé | catchError sur getTalks : signal talksError et message role=alert sous « Ses talks », le speaker reste affiché ; test avec une réponse HTTP 503. |
| F-008 | BLOCKER | R-SIG-010 | `src/app/talks/talk-card.ts:28` | ✅ corrigé | Lecture du signal isFavorite() ; test de régression sur le message d'ajout/retrait. |
| F-009 | MAJOR | R-PERF-001 | `src/app/app.routes.ts:22` | ✅ corrigé | Route speakers/:id en loadComponent ; SpeakerSpotlight sort du bundle initial (chunk speaker-spotlight de 5,75 kB, initial 325,9 → 320,6 kB). |
| F-010 | MAJOR | R-SIG-004 | `src/app/favorites/favorites.store.ts:28` | ✅ corrigé | add() passe par ids.update() avec une nouvelle référence et sans doublon ; test sur count, référence et persistance. |
| F-012 | MAJOR | R-TEST-001 | `src/app/proposals/proposal-form.ts:15` | ✅ corrigé | proposal-form.spec.ts couvre labels, validation sans titre, brouillon persistant, compteur, changement de track (liste + état vide), contenu enregistré à l'envoi et confirmation en fake timers (7 tests). |
| F-013 | MAJOR | R-SIG-003 | `src/app/proposals/proposal-form.ts:38` | ✅ corrigé | charCount = computed(() => abstract().length) remplace le signal recopié par effect() ; premier test de proposal-form.spec.ts sur un brouillon restauré. |
| F-014 | MAJOR | R-PERF-035 | `src/app/proposals/proposal-form.ts:67` | ✅ corrigé | submitted = signal(false), set(true) dans le setTimeout, submitted() dans le template ; test en fake timers Vitest sans interaction après l'envoi. |
| F-015 | MAJOR | R-TEST-001 | `src/app/proposals/proposal.guard.ts:7` | ✅ corrigé | proposal.guard.spec.ts : date système contrôlée (vi.useFakeTimers Date + setSystemTime), juste avant, à l'instant et après la clôture, UrlTree « / ». |
| F-016 | MAJOR | R-A11Y-014 | `src/app/speakers/speaker-spotlight.html:5` | ✅ corrigé | [alt]="'Portrait de ' + speaker.name" sur la photo ; test de l'alternative textuelle. |
| F-017 | MAJOR | R-TEST-002 | `src/app/speakers/speaker-spotlight.spec.ts:20` | ✅ corrigé | it.only remplacé par it. |
| F-018 | MAJOR | R-PERF-020 | `src/app/speakers/speaker-spotlight.ts:14` | ✅ corrigé | Option changeDetection Eager supprimée (OnPush par défaut) ; l'état affiché est déjà en signals (F-021, F-024, F-005, F-007), les specs de rendu asynchrone passent. |
| F-019 | MAJOR | R-ARCH-027 | `src/app/speakers/speaker-spotlight.ts:18` | ✅ corrigé | Output renommé talkSelected et déclaré avec output<string>() (aucun binding parent à adapter) ; test de l'émission au clic. |
| F-020 | MAJOR | R-RX-001 | `src/app/speakers/speaker-spotlight.ts:32` | ✅ corrigé | Une seule chaîne paramMap → map → distinctUntilChanged → switchMap(getSpeaker) → switchMap(getTalks) ; état remis à zéro à chaque nouvel id. Tests de réponse tardive et de talks périmés. |
| F-021 | MAJOR | R-PERF-035 | `src/app/speakers/speaker-spotlight.ts:33` | ✅ corrigé | speaker devient un signal (set dans l'abonnement, lu via speaker() dans le template) ; test d'une réponse arrivant après le premier rendu. Typage any conservé (F-040, MINOR). |
| F-024 | MAJOR | R-PERF-035 | `src/app/speakers/speaker-spotlight.ts:36` | ✅ corrigé | talks devient un signal (set à la réception, talks() dans le template et addAllToFavorites) ; test de talks arrivant après le speaker. |

Restent ouverts : 16 MINOR (F-027, F-031, F-032, F-035, F-036, F-037, F-038, F-040, … +8).
