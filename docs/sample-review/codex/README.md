# Review réelle — OpenAI Codex

| | |
|---|---|
| Date | 8 octobre 2026 |
| Harness | Codex CLI 0.149.1, headless (`codex exec -s workspace-write`) |
| Modèle | gpt-5.6-sol, effort de raisonnement medium (passé avec `-m` : le modèle par défaut du poste, gpt-6.1-sol, est refusé avec un compte ChatGPT) |
| Prompt | « Fais une review de cette branche avant que je la merge sur main. » |
| Déclenchement | automatique (skill lu dans `.agents/skills`) |
| Durée | ≈ 12 min |
| Tokens | 4,77 M en entrée (4,49 M en cache), 18 k en sortie |
| Commandes | 31 commandes shell, 5 appels de sous-agents en parallèle |
| Remarque | Codex a prévenu que les descriptions de skills avaient été raccourcies pour tenir dans son budget de contexte (beaucoup de skills installés sur ce poste) : la description d'`angular-review` a quand même suffi à le déclencher. |

Fichiers : [REVIEW.md](REVIEW.md) · [findings.json](findings.json) · [score.txt](score.txt) (contre evals/angular-review/playground-key.json).
