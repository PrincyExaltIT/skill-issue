# La chaîne complète, en vrai

Branche `solution/review-fix` de [skill-issue-playground](https://github.com/PrincyExaltIT/skill-issue-playground), 8 octobre 2026.

| Étape | Harness | Résultat | Durée | Coût |
|---|---|---|---|---|
| 1. `angular-review` | Codex (gpt-5.6-sol) | REQUEST_CHANGES — 8 BLOCKER, 13 MAJOR, 16 MINOR | 11 min 22 | quota ChatGPT |
| 2. `review-fix` sur BLOCKER + MAJOR | Claude Code (Opus 5.5) | 21 commits, un par finding ; 17 ajoutent ou modifient un test de régression, les 4 autres (accessibilité, abonnement, performance, Eager) corrigent sans test ([1-FIXES.md](1-FIXES.md)) | 20 min 43 | 6,08 $ |
| 3. `angular-review` (re-review) | Claude Code | REQUEST_CHANGES — 1 BLOCKER, 2 MAJOR, 15 MINOR, 5 INFO ([2-REVIEW-apres-fix.md](2-REVIEW-apres-fix.md)) | 5 min 59 | 5,69 $ |
| 4. `pr-handoff` | Claude Code | Description de PR « à ne pas merger en l'état » ([3-PR_BODY.md](3-PR_BODY.md)) et note de passation ([4-HANDOFF.md](4-HANDOFF.md)) | 1 min 41 | 0,71 $ |

Ce que ça montre :

- **Le contrat suffit au relais** : la review a été faite par Codex, les corrections par Claude Code, à partir du même `.review/findings.json`.
- **La chaîne ne merge pas à ta place** : l'URL d'API en dur, classée MINOR au premier tour, n'était pas dans le périmètre des corrections ; à la re-review, elle devient le BLOCKER qui empêche la page de charger. Un des deux MAJOR vient des corrections : le bouton sans effet. La correction d'accessibilité a remplacé le `<div>` cliquable par un bouton branché sur l'output `talkSelected` (renommé par une autre correction), qu'aucun parent n'écoute ; l'output était déjà inutilisé avant, sous le nom `select`. L'autre MAJOR, le formulaire sans retour d'erreur (`markAllAsTouched` sans message affiché), existait déjà sur la branche du lab.
- **La passation dit la vérité** : `pr-handoff` écrit noir sur blanc qu'il ne faut pas merger, et liste les décisions qui reviennent à un humain.
