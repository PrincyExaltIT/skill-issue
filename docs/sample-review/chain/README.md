# La chaîne complète, en vrai

Branche `solution/review-fix` de [skill-issue-playground](https://github.com/PrincyExaltIT/skill-issue-playground), 8 octobre 2026.

| Étape | Harness | Résultat | Durée | Coût |
|---|---|---|---|---|
| 1. `angular-review` | Codex (gpt-5.6-sol) | REQUEST_CHANGES — 8 BLOCKER, 13 MAJOR, 16 MINOR | ≈ 12 min | quota ChatGPT |
| 2. `review-fix` sur BLOCKER + MAJOR | Claude Code (Opus 5.5) | 21 commits, un par finding, chacun avec un test de régression ([1-FIXES.md](1-FIXES.md)) | 20,8 min | 6,08 $ |
| 3. `angular-review` (re-review) | Claude Code | REQUEST_CHANGES — 1 BLOCKER, 2 MAJOR, 15 MINOR, 5 INFO ([2-REVIEW-apres-fix.md](2-REVIEW-apres-fix.md)) | 2,7 min | 5,69 $ |
| 4. `pr-handoff` | Claude Code | Description de PR « à ne pas merger en l'état » ([3-PR_BODY.md](3-PR_BODY.md)) et note de passation ([4-HANDOFF.md](4-HANDOFF.md)) | 1,7 min | 0,71 $ |

Ce que ça montre :

- **Le contrat suffit au relais** : la review a été faite par Codex, les corrections par Claude Code, à partir du même `.review/findings.json`.
- **La chaîne ne merge pas à ta place** : l'URL d'API en dur, classée MINOR au premier tour, n'était pas dans le périmètre des corrections ; à la re-review, elle devient le BLOCKER qui empêche la page de charger. Deux MAJOR sont nés des corrections elles-mêmes (un bouton sans effet, un formulaire sans retour d'erreur).
- **La passation dit la vérité** : `pr-handoff` écrit noir sur blanc qu'il ne faut pas merger, et liste les décisions qui reviennent à un humain.
