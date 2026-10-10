# Review réelle — OpenAI Codex

| | |
|---|---|
| Date | 8 octobre 2026 |
| Harness | Codex CLI 0.149.1, headless (`codex exec -s workspace-write`) |
| Modèle | gpt-5.6-sol, effort de raisonnement medium (passé avec `-m`) |
| Prompt | « Fais une review de cette branche avant que je la merge sur main. » |
| Déclenchement | automatique (skill lu dans `.agents/skills`) |
| Durée | 11 min 22 (682 s) |
| Tokens | 4,77 M en entrée (4,49 M en cache), 18 k en sortie |
| Commandes | 31 commandes shell ; 6 sous-agents relecteurs lancés, un par domaine. Deux d'entre eux (accessibilité et erreurs, tests) n'ont pas pu lire le dépôt (erreur Windows 1920 dans leur bac à sable) : Codex les a interrompus et a fait ces deux domaines lui-même. |
| Remarque | Codex a prévenu que les descriptions de skills avaient été raccourcies pour tenir dans son budget de contexte (beaucoup de skills installés sur ce poste) : la description d'`angular-review` a quand même suffi à le déclencher. |

Fichiers : [REVIEW.md](REVIEW.md) · [findings.json](findings.json) · [score.txt](score.txt) (contre evals/angular-review/playground-key.json).
