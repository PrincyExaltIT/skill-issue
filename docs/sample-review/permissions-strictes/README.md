# La revue IA avec des permissions au plus juste

Run du 10 octobre 2026, sur la branche `lab/speaker-spotlight` du dépôt de démo (base `depart`), avec le skill de l'étape 5 (`course/revue-angular/etape-5`, identique au dossier lu par le run), Claude Code 2.1.289 et Opus 5.5. Ce sont les permissions des gabarits de CI du cours et du kit, lancées en local avec la même commande que le job :

```
CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1 claude -p "/revue-angular Relis cette branche avant qu'elle soit mergée sur depart." \
  --allowedTools "Read" "Grep" "Glob" "Edit(.review/**)" \
    "Bash(node .claude/skills/revue-angular/scripts/perimetre.mjs:*)" "Bash(node .claude/skills/revue-angular/scripts/verifs.mjs:*)" \
    "Bash(git diff:*)" "Bash(git log:*)" "Bash(git show:*)" "Bash(git status:*)" "Bash(git rev-parse:*)" "Bash(git merge-base:*)"
```

- **Ce que l'agent peut faire** : lire, lancer les deux scripts du skill, lire l'historique git, écrire sous `.review/` (une règle `Edit` vaut pour tous les outils qui modifient des fichiers). Rien d'autre : pas de `--permission-mode acceptEdits`, pas de `Bash(node:*)`.
- **Ce qui a été refusé** : deux commandes `cat` et `for … cat` (`resultat.json`, champ `refus`). L'agent a lu les mêmes fichiers avec l'outil Read et a fini la revue.
- **Le score** (`score.txt`, `evals/angular-review/score.mjs`) : rappel 96 % (26/27), précision 100 %, 0 leurre sur 7. Les permissions larges ne servaient donc pas la revue.
- **Le coût** : 1,08 $, 245 s, 36 tours (`resultat.json`, lu dans la ligne `result` du journal).

`CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1` retire la clé d'API de l'environnement des commandes que lance l'agent. Sur GitLab, le gabarit lance en plus `claude` avec `env -u GITLAB_REVIEW_TOKEN` : le jeton qui publie la note n'existe que pour `curl`, après la revue.
