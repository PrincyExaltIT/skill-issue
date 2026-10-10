<!-- Notes de recherche : modèles, sous-agents et harnais (octobre 2026). Collecte du 9 octobre 2026 par un sous-agent (Haiku 5.5), à partir des pages éditeur lues avec WebFetch. WebSearch ne sert qu'à trouver des pistes : aucun fait ne s'appuie sur la presse ou un blog tiers. Chaque fait porte son statut (VERIFIED, UNVERIFIED). Relire les chiffres avant de les citer. -->

# Modèles, sous-agents et harnais : faits sourcés

Date de vérification : 9 octobre 2026. Périmètre : sections A à E de la demande, puis « À retenir pour la formation ».

**Méthode.** Pistes trouvées par WebSearch, puis lecture des pages officielles avec WebFetch : platform.claude.com, code.claude.com, anthropic.com, learn.chatgpt.com (ex-developers.openai.com, redirigé), docs.github.com, github.blog, kilo.ai, opencode.ai, cursor.com, geminicli.com, developers.googleblog.com, ai.google.dev, api-docs.deepseek.com, mistral.ai et docs.mistral.ai. Les pages longues sont résumées par un modèle d'extraction : les chiffres lus deux fois sont signalés comme tels, les autres sont à relire.

**Statuts.** VERIFIED : vu aujourd'hui sur une page éditeur. UNVERIFIED : non trouvé sur une page éditeur ; la recherche faite est indiquée. Aucun fait FROM-NOTES n'a été retenu : ce fichier ne reprend pas les notes locales. **Bilan** : 111 VERIFIED, 8 UNVERIFIED, 0 FROM-NOTES.

**Lecture des tableaux.** « Niveau » (frontier, mi-gamme, petit et rapide) est le classement de cette étude, déduit de la description éditeur. Les prix sont en dollars américains par million de tokens (MTok).

## A. Modèles Anthropic disponibles aujourd'hui

| # | Fait | Source | Statut |
|---|---|---|---|
| a1 | La page d'aperçu compare quatre modèles actuels : Claude Fable 5.1, Claude Opus 5.5, Claude Sonnet 5.5 et Claude Haiku 5.5. | https://platform.claude.com/docs/en/models/overview | VERIFIED |
| a2 | La page recommande Claude Opus 5.5 pour la plupart des charges : « start with Claude Opus 5.5 for most workloads ». | https://platform.claude.com/docs/en/models/overview | VERIFIED |
| a3 | Fable 5.1 est décrit pour « demanding reasoning and long-horizon agentic work » ; sortie le 1er septembre 2026. | https://platform.claude.com/docs/en/models/fable-5-1/overview | VERIFIED |
| a4 | Opus 5.5 est décrit pour « long-running agentic coding and knowledge work » ; sortie le 22 septembre 2026. | https://platform.claude.com/docs/en/models/opus-5-5/overview | VERIFIED |
| a5 | Sonnet 5.5 est décrit comme « The best combination of speed and intelligence » ; sortie le 28 septembre 2026. | https://platform.claude.com/docs/en/models/sonnet-5-5/overview | VERIFIED |
| a6 | Haiku 5.5 est décrit pour « high-volume, latency-sensitive tasks » ; sortie le 7 octobre 2026. | https://platform.claude.com/docs/en/models/haiku-5-5/overview | VERIFIED |
| a7 | Les quatre modèles ont une fenêtre de contexte de 1 M tokens et une sortie maximale de 128 K tokens (API Messages synchrone). | https://platform.claude.com/docs/en/models/overview | VERIFIED |
| a8 | Identifiants API : `claude-fable-5-1`, `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5` ; Bedrock ajoute le préfixe `anthropic.`. | https://platform.claude.com/docs/en/models/overview | VERIFIED |
| a9 | Prix de Claude Fable 5.1 : 10 $ par MTok en entrée et 50 $ en sortie. | https://platform.claude.com/docs/en/about-claude/pricing | VERIFIED |
| a10 | Prix de Claude Opus 5.5 : 4 $ par MTok en entrée et 20 $ en sortie. | https://platform.claude.com/docs/en/about-claude/pricing | VERIFIED |
| a11 | Prix de Claude Sonnet 5.5 : 2 $ par MTok en entrée et 10 $ en sortie. | https://platform.claude.com/docs/en/about-claude/pricing | VERIFIED |
| a12 | Prix de Claude Haiku 5.5 : 0,10 $ en entrée et 0,50 $ en sortie pour un prompt jusqu'à 100 000 tokens ; 0,50 $ et 2,50 $ au-delà. | https://platform.claude.com/docs/en/about-claude/pricing | VERIFIED |
| a13 | L'API Batch applique 50 % de remise sur l'entrée et la sortie. | https://platform.claude.com/docs/en/models/overview | VERIFIED |
| a14 | Lecture de cache : 0,25 $ (Fable 5.1), 0,20 $ (Opus 5.5), 0,10 $ (Sonnet 5.5) et 0,01 $ (Haiku 5.5 jusqu'à 100 000 tokens) par MTok. | https://platform.claude.com/docs/en/about-claude/pricing | VERIFIED |
| a15 | La page de Haiku 5.5 cite « classification, routing, extraction, and subagent tasks » parmi ses usages. | https://platform.claude.com/docs/en/models/haiku-5-5/overview | VERIFIED |
| a16 | La réflexion adaptative d'Opus 5.5 est toujours active : « can't be turned off ». | https://platform.claude.com/docs/en/models/opus-5-5/overview | VERIFIED |
| a17 | Effort par défaut : `high` pour Fable 5.1 et Sonnet 5.5, `medium` pour Opus 5.5 et Haiku 5.5. | https://platform.claude.com/docs/en/models/overview | VERIFIED |
| a18 | Claude Mythos 5.1 partage les specs et les prix de Fable 5.1, mais son accès est réservé aux organisations vérifiées. | https://platform.claude.com/docs/en/models/fable-5-1/overview | VERIFIED |

## B. Claude Code : sous-agents et choix du modèle

| # | Fait | Source | Statut |
|---|---|---|---|
| b1 | Un sous-agent projet se place dans `.claude/agents/` ; la priorité va aux réglages managés, puis à l'option `--agents`, puis à ce dossier, puis à `~/.claude/agents/`. | https://code.claude.com/docs/en/sub-agents | VERIFIED |
| b2 | Le champ `model` du frontmatter accepte `sonnet`, `opus`, `haiku`, `fable`, un identifiant complet, ou `inherit`. | https://code.claude.com/docs/en/sub-agents | VERIFIED |
| b3 | Ordre de résolution du modèle d'un sous-agent : paramètre d'invocation, puis frontmatter, puis `CLAUDE_CODE_SUBAGENT_MODEL`, puis modèle de la conversation principale. | https://code.claude.com/docs/en/sub-agents | VERIFIED |
| b4 | Le sous-agent intégré Explore a pour modèle « the main conversation's model » ; la page signale une exception quand la session principale tourne sur Fable. | https://code.claude.com/docs/en/sub-agents | VERIFIED |
| b5 | Pour mettre l'exploration sur un modèle moins cher, un sous-agent projet ou utilisateur nommé `Explore` avec `model: haiku` remplace l'intégré : « define one with model: haiku to run exploration on a lower-cost model ». | https://code.claude.com/docs/en/sub-agents | VERIFIED |
| b6 | Le sous-agent intégré Plan hérite du modèle de la conversation principale, sauf si `CLAUDE_CODE_SUBAGENT_MODEL` force un modèle sur tous les sous-agents. | https://code.claude.com/docs/en/sub-agents | VERIFIED |
| b7 | Conseil officiel de coût : « Control costs by routing tasks to faster, lower-cost models like Haiku » (liste « Subagents help you »). | https://code.claude.com/docs/en/sub-agents | VERIFIED |
| b8 | Les requêtes d'un sous-agent « count toward the same usage limits as your main conversation ». | https://code.claude.com/docs/en/sub-agents | VERIFIED |
| b9 | Modèle de la session principale, par priorité : `/model` (sans argument, ouvre le sélecteur), `claude --model`, `ANTHROPIC_MODEL`, champ `model` des réglages, puis `ANTHROPIC_DEFAULT_MODEL` pour les nouvelles sessions. | https://code.claude.com/docs/en/model-config | VERIFIED |
| b10 | Un changement de modèle avec `/model` atteint aussi les sous-agents qui héritent du modèle principal. | https://code.claude.com/docs/en/model-config | VERIFIED |
| b11 | Aliases acceptés : `default`, `best`, `fable`, `sonnet`, `opus`, `haiku`, `sonnet[1m]`, `opus[1m]`, `opusplan`. | https://code.claude.com/docs/en/model-config | VERIFIED |
| b12 | L'alias `haiku` « Uses the fast and efficient Haiku model for simple tasks » ; `opus`, `sonnet` et `haiku` visent la version la plus récente sur l'API Anthropic. | https://code.claude.com/docs/en/model-config | VERIFIED |
| b13 | `opusplan` utilise Opus en mode plan, puis passe à Sonnet pour l'exécution. | https://code.claude.com/docs/en/model-config | VERIFIED |
| b14 | `CLAUDE_CODE_SUBAGENT_MODEL` est le modèle par défaut des sous-agents, des coéquipiers et des agents de workflow qui n'ont pas de modèle assigné ; il accepte un alias ou un nom complet. | https://code.claude.com/docs/en/model-config | VERIFIED |

## C. Guide Anthropic : orchestrateur et workers

Source unique pour cette section : l'article d'ingénierie sur le système de recherche multi-agents. Les chiffres portent sur des modèles Claude 4 (Opus 4, Sonnet 4) et une évaluation interne : ce sont des ordres de grandeur, pas des tarifs.

| # | Fait | Source | Statut |
|---|---|---|---|
| c1 | Un agent utilise en moyenne environ 4 fois plus de tokens qu'une interaction de chat : « agents typically use about 4× more tokens than chat interactions ». | https://www.anthropic.com/engineering/multi-agent-research-system | VERIFIED |
| c2 | Un système multi-agent utilise environ 15 fois plus de tokens qu'un chat : « multi-agent systems use about 15× more tokens than chats ». | https://www.anthropic.com/engineering/multi-agent-research-system | VERIFIED |
| c3 | Dans l'évaluation, la seule quantité de tokens explique 80 % de la variance de performance : « token usage by itself explains 80% of the variance ». | https://www.anthropic.com/engineering/multi-agent-research-system | VERIFIED |
| c4 | Le multi-agent exige des tâches dont la valeur paie le surcroît de performance. | https://www.anthropic.com/engineering/multi-agent-research-system | VERIFIED |
| c5 | Les systèmes multi-agents « excel at valuable tasks that involve heavy parallelization ». | https://www.anthropic.com/engineering/multi-agent-research-system | VERIFIED |
| c6 | Les domaines où tous les agents doivent partager le même contexte ne conviennent pas au multi-agent aujourd'hui. | https://www.anthropic.com/engineering/multi-agent-research-system | VERIFIED |
| c7 | Un lead Claude Opus 4 avec des sous-agents Claude Sonnet 4 a dépassé Claude Opus 4 seul de 90,2 % sur l'évaluation interne de recherche. | https://www.anthropic.com/engineering/multi-agent-research-system | VERIFIED |
| c8 | L'architecture décrite est un modèle orchestrateur-workers (« orchestrator-worker pattern »). | https://www.anthropic.com/engineering/multi-agent-research-system | VERIFIED |

## D. Harnais : choisir un modèle plus petit pour les sous-agents

### D.1 OpenAI Codex CLI

| # | Fait | Source | Statut |
|---|---|---|---|
| cx1 | Rôles intégrés de sous-agents : `default` (usage général), `worker` (exécution et corrections) et `explorer` (exploration en lecture). | https://learn.chatgpt.com/docs/agent-configuration/subagents | VERIFIED |
| cx2 | Un agent personnalisé est un fichier TOML isolé, dans `~/.codex/agents/` (personnel) ou `.codex/agents/` (projet). | https://learn.chatgpt.com/docs/agent-configuration/subagents | VERIFIED |
| cx3 | Champs obligatoires : `name`, `description`, `developer_instructions` ; champs facultatifs : `model` et `model_reasoning_effort`. | https://learn.chatgpt.com/docs/agent-configuration/subagents | VERIFIED |
| cx4 | Sans `model` ni `model_reasoning_effort`, « the subagent inherits the parent agent's model and reasoning effort ». | https://learn.chatgpt.com/docs/agent-configuration/subagents | VERIFIED |
| cx5 | Exemple officiel : le sous-agent `reviewer` est fixé à `model = "gpt-6.1-sol"` avec `model_reasoning_effort = "medium"`. | https://learn.chatgpt.com/docs/agent-configuration/subagents | VERIFIED |
| cx6 | Exemple officiel : l'explorateur `pr_explorer` est fixé à `model = "gpt-6-luna"` avec `model_reasoning_effort = "high"`. | https://learn.chatgpt.com/docs/agent-configuration/subagents | VERIFIED |
| cx7 | La page conseille « Use gpt-6-luna when you want a faster, lower-cost option for lighter subagent work ». | https://learn.chatgpt.com/docs/agent-configuration/subagents | VERIFIED |
| cx8 | La page prévient que « subagent workflows consume more tokens than comparable single-agent runs ». | https://learn.chatgpt.com/docs/agent-configuration/subagents | VERIFIED |
| cx9 | Choix du modèle : `codex --model gpt-6.1-sol` (alias `-m`), `codex exec -m gpt-6.1-sol` et la commande `/model` en session. | https://learn.chatgpt.com/docs/models | VERIFIED |
| cx10 | Modèles recommandés sur la page : `gpt-6-astra` (le plus capable, code, apps et recherche), `gpt-6.1-sol` (proche d'Astra, à moindre coût), `gpt-6-luna` (le plus efficace pour les tâches ciblées à fort volume). | https://learn.chatgpt.com/docs/models | VERIFIED |
| cx11 | La page Codex nomme `gpt-5.6` Sol, Terra et Luna comme disponibles pendant le déploiement, sans description séparée. | https://learn.chatgpt.com/docs/models | VERIFIED |
| cx12 | Les identifiants `gpt-5.6-sol` et `gpt-5.6-terra` figurent sur la page de prix API, à respectivement 4 $/20 $ et 2 $/12 $ par MTok. | https://developers.openai.com/api/docs/pricing | VERIFIED |
| cx13 | `gpt-5.5` « retires from ChatGPT, ChatGPT Work, and Codex on October 14, 2026 » ; il reste disponible sur l'API. | https://learn.chatgpt.com/docs/models | VERIFIED |
| cx14 | Profils : depuis Codex 0.134.0, `--profile` ne lit plus `[profiles.<nom>]` dans `config.toml` ; chaque profil est un fichier `~/.codex/<nom>.config.toml` chargé par-dessus la base. | https://learn.chatgpt.com/docs/config-file/config-advanced | VERIFIED |
| cx15 | Aucune clé globale de modèle pour les sous-agents n'a été trouvée sur la page des sous-agents ni dans la section profils lues. | https://learn.chatgpt.com/docs/agent-configuration/subagents | UNVERIFIED |

### D.2 GitHub Copilot

| # | Fait | Source | Statut |
|---|---|---|---|
| gh1 | Un profil d'agent personnalisé se place dans `.github/agents/` ; son nom de fichier finit par `.agent.md` et `description` est obligatoire. | https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/create-custom-agents | VERIFIED |
| gh2 | La propriété `model` sert à « control which AI model the agent should use » dans VS Code, JetBrains, Eclipse et Xcode. | https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/create-custom-agents | VERIFIED |
| gh3 | Dans la référence des propriétés, `model` est le « Model to use when this custom agent executes » ; s'il est absent, l'agent prend le modèle par défaut. | https://docs.github.com/en/copilot/reference/custom-agents-configuration | VERIFIED |
| gh4 | La liste des valeurs acceptées par `model` n'a pas été trouvée sur la page de référence, qui ne donne que le type `string`. | https://docs.github.com/en/copilot/reference/custom-agents-configuration | UNVERIFIED |
| gh5 | La sélection automatique de modèle donne « a 10% discount on model costs while using auto model selection ». | https://docs.github.com/en/copilot/concepts/auto-model-selection | VERIFIED |
| gh6 | La sélection automatique est disponible dans Copilot Chat sur GitHub, dans VS Code et dans Copilot CLI. | https://docs.github.com/en/copilot/concepts/auto-model-selection | VERIFIED |
| gh7 | La page de sélection automatique ne dit pas si elle s'applique au choix du modèle d'un agent personnalisé ou d'un sous-agent. | https://docs.github.com/en/copilot/concepts/auto-model-selection | UNVERIFIED |
| gh8 | Depuis le 1er juin 2026, « all Copilot plans bill based on GitHub AI Credits consumed ». | https://github.blog/changelog/2026-06-01-updates-to-github-copilot-billing-and-plans/ | VERIFIED |
| gh9 | Un GitHub AI Credit vaut 1 centime de dollar (1 AI credit = $0.01 USD). | https://docs.github.com/en/billing/concepts/product-billing/github-copilot-billing | VERIFIED |
| gh10 | Chaque modèle a un multiplicateur de requêtes premium (« Each model has a premium request multiplier »), mais cette notion relève de l'ancienne facturation, encore appliquée aux plans annuels Pro et Pro+. | https://docs.github.com/en/enterprise-cloud@latest/copilot/managing-copilot/monitoring-usage-and-entitlements/about-premium-requests | VERIFIED |
| gh11 | Table « legacy » des multiplicateurs (plans annuels) : Claude Haiku 4.5 à 0,33, GPT-5 mini à 0,33, GPT-5.5 à 57 (lu deux fois). | https://docs.github.com/en/copilot/reference/copilot-billing/request-based-billing-legacy/model-multipliers-for-annual-plans | VERIFIED |
| gh12 | Les revues de code consomment des minutes GitHub Actions en plus des AI Credits : « in addition to GitHub AI Credits ». | https://github.blog/changelog/2026-06-01-updates-to-github-copilot-billing-and-plans/ | VERIFIED |
| gh13 | Liste officielle des multiplicateurs ou du coût par modèle sous la facturation actuelle (AI Credits), et sélecteur de modèle de Copilot Chat : non trouvés sur les pages lues. | https://docs.github.com/en/billing/concepts/product-billing/github-copilot-billing | UNVERIFIED |

### D.3 Kilo Code

| # | Fait | Source | Statut |
|---|---|---|---|
| kl1 | Le mode Orchestrator est déprécié : « Orchestrator mode is deprecated and will be removed in a future release ». | https://kilo.ai/docs/code-with-ai/agents/orchestrator-mode | VERIFIED |
| kl2 | Les agents Code, Plan et Debug délèguent désormais eux-mêmes à des sous-agents. | https://kilo.ai/docs/code-with-ai/agents/orchestrator-mode | VERIFIED |
| kl3 | La clé `subagent_model` de `kilo.jsonc` (ou le champ « Subagent Model » de Settings > Models) fixe le modèle des sous-agents lancés par l'outil `task`. | https://kilo.ai/docs/code-with-ai/agents/model-selection | VERIFIED |
| kl4 | Si `subagent_model` n'est pas défini, le sous-agent « inherits whichever model the parent agent session is currently using ». | https://kilo.ai/docs/code-with-ai/agents/model-selection | VERIFIED |
| kl5 | Ordre de priorité du modèle : choix de la session pour l'agent, puis config par agent, puis config globale, puis recommandation d'organisation. | https://kilo.ai/docs/code-with-ai/agents/model-selection | VERIFIED |
| kl6 | Un modèle par défaut se règle par agent et globalement dans Settings (onglet Models). | https://kilo.ai/docs/code-with-ai/agents/model-selection | VERIFIED |
| kl7 | Une tâche de sous-agent peut recevoir un autre modèle, sur demande explicite ; le modèle n'est pas choisi par l'agent lui-même. | https://kilo.ai/docs/code-with-ai/agents/model-selection | VERIFIED |
| kl8 | Agents personnalisés : définis dans la section `agent` de `kilo.jsonc`, ou en fichier Markdown dans `~/.config/kilo/agents/` ou `.kilo/agents/`. | https://kilo.ai/docs/customize/custom-subagents | VERIFIED |
| kl9 | Le champ `model` d'un agent personnalisé suit le format `provider/model-id` ; s'il est absent, le sous-agent prend le modèle de l'agent principal qui l'invoque. | https://kilo.ai/docs/customize/custom-subagents | VERIFIED |
| kl10 | Valeurs de `mode` : `subagent` (invocable seulement via l'outil Task ou les @mentions), `primary` et `all`. | https://kilo.ai/docs/customize/custom-subagents | VERIFIED |

### D.4 OpenCode

| # | Fait | Source | Statut |
|---|---|---|---|
| oc1 | Le champ `mode` accepte `primary`, `subagent` ou `all` ; sans valeur, il vaut `all`. | https://opencode.ai/docs/agents/ | VERIFIED |
| oc2 | Le champ `model` se règle par agent, au format `provider/model-id` : « Use the model config to override the model for this agent ». | https://opencode.ai/docs/agents/ | VERIFIED |
| oc3 | Un sous-agent prend le modèle de l'agent principal qui l'a invoqué : « subagents will use the model of the primary agent that invoked the subagent ». | https://opencode.ai/docs/agents/ | VERIFIED |
| oc4 | Agents intégrés : `build` et `plan` (primaires), `general` et `explore` (sous-agents) ; la page ne donne pas leur modèle par défaut. | https://opencode.ai/docs/agents/ | VERIFIED |
| oc5 | La page n'a pas d'exemple de sous-agent placé sur un modèle moins cher ; son seul exemple place l'agent primaire `plan` sur un modèle Haiku, sans parler de coût. | https://opencode.ai/docs/agents/ | VERIFIED |

### D.5 Cursor

| # | Fait | Source | Statut |
|---|---|---|---|
| cu1 | Un sous-agent est un fichier Markdown à frontmatter YAML, dans `.cursor/agents/` (projet) ou `~/.cursor/agents/` (utilisateur). | https://cursor.com/docs/subagents | VERIFIED |
| cu2 | Champs du frontmatter : `name`, `description`, `model`, `readonly`, `is_background`. | https://cursor.com/docs/subagents | VERIFIED |
| cu3 | Valeurs de `model` : `inherit` (défaut : « Uses the same model as the parent agent. This is the default. ») ou un identifiant, par exemple `composer-2` ou `gpt-5.6-sol`. | https://cursor.com/docs/subagents | VERIFIED |
| cu4 | « The explore subagent uses a faster model by default » : le sous-agent Explore tourne sur un modèle plus rapide par défaut. | https://cursor.com/docs/subagents | VERIFIED |
| cu5 | La page dit « Faster models cost less » et que confier le travail lourd en tokens à des sous-agents, avec un bon choix de modèle, réduit le coût global. | https://cursor.com/docs/subagents | VERIFIED |
| cu6 | Choisir le modèle depuis le sélecteur de l'interface Cursor : non vérifié sur une page officielle lue. | https://cursor.com/docs/subagents | UNVERIFIED |

### D.6 Gemini CLI

| # | Fait | Source | Statut |
|---|---|---|---|
| gm1 | Les sous-agents se définissent dans `.gemini/agents/*.md` (projet) ou `~/.gemini/agents/*.md` (utilisateur), avec un frontmatter YAML. | https://geminicli.com/docs/core/subagents/ | VERIFIED |
| gm2 | Le champ `model` : « Specific model to use (for example, gemini-3-preview). Defaults to inherit (uses the main session model). » | https://geminicli.com/docs/core/subagents/ | VERIFIED |
| gm3 | Champs du frontmatter : `name` et `description` (obligatoires), puis `kind`, `tools`, `mcpServers`, `model`, `temperature`, `max_turns` (30 par défaut) et `timeout_mins` (10 par défaut). | https://geminicli.com/docs/core/subagents/ | VERIFIED |
| gm4 | Sous-agents intégrés : `codebase_investigator`, `cli_help` et `generalist` activés par défaut, `browser_agent` désactivé ; la page ne donne pas leur modèle. | https://geminicli.com/docs/core/subagents/ | VERIFIED |
| gm5 | « The /model command (and the --model flag) does not override the model used by sub-agents. » | https://geminicli.com/docs/cli/model/ | VERIFIED |
| gm6 | Choix du modèle : commande `/model` (dialogue) et option `--model` au démarrage ; la page ne cite ni `-m` ni clé de `settings.json`. | https://geminicli.com/docs/cli/model/ | VERIFIED |
| gm7 | Le 19 mai 2026, Google annonce qu'il unifie Gemini CLI avec Antigravity ; Gemini CLI et les extensions Gemini Code Assist cessent de répondre le 18 juin 2026 pour les abonnés Google AI Pro et Ultra, et pour les utilisateurs gratuits de Gemini Code Assist for individuals (précision du 10 octobre 2026). | https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/ | VERIFIED |
| gm8 | Gemini CLI reste accessible avec des clés API Gemini payantes ou Gemini Enterprise Agent Platform : « will remain accessible via paid Gemini and Gemini Enterprise Agent Platform API keys ». | https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/ | VERIFIED |
| gm9 | La page des sous-agents ne dit rien sur le coût ni sur l'usage d'un modèle plus petit pour les sous-agents. | https://geminicli.com/docs/core/subagents/ | VERIFIED |

Note : la page geminicli.com décrit une bannière de transition différente (offres gratuites et Google One). La publication Google de gm7 fait foi.

## E. Panel de modèles : frontier, mi-gamme, petit et rapide

Prix en dollars par MTok, entrée puis sortie. Le niveau est le classement de l'étude, déduit de la description de l'éditeur.

| # | Fait | Source | Statut |
|---|---|---|---|
| e1 | Anthropic, `claude-fable-5-1` : niveau frontier, 10 $ / 50 $. | https://platform.claude.com/docs/en/about-claude/pricing | VERIFIED |
| e2 | Anthropic, `claude-opus-5-5` : niveau frontier-intermédiaire, 4 $ / 20 $. | https://platform.claude.com/docs/en/about-claude/pricing | VERIFIED |
| e3 | Anthropic, `claude-sonnet-5-5` : niveau mi-gamme, 2 $ / 10 $. | https://platform.claude.com/docs/en/about-claude/pricing | VERIFIED |
| e4 | Anthropic, `claude-haiku-5-5` : niveau petit et rapide, 0,10 $ / 0,50 $ jusqu'à 100 000 tokens de prompt. | https://platform.claude.com/docs/en/about-claude/pricing | VERIFIED |
| e5 | OpenAI, `gpt-6-astra` : niveau frontier, 10 $ / 50 $ ; décrit comme « Our most capable model for complex work ». | https://developers.openai.com/api/docs/pricing | VERIFIED |
| e6 | OpenAI, `gpt-6.1-sol` : niveau mi-gamme, 2 $ / 10 $ ; décrit comme « Near-Astra performance ». | https://developers.openai.com/api/docs/pricing | VERIFIED |
| e7 | OpenAI, `gpt-5.6-terra` : niveau mi-gamme, 2 $ / 12 $ ; pas de description séparée. | https://developers.openai.com/api/docs/pricing | VERIFIED |
| e8 | OpenAI, `gpt-6-luna` : niveau petit et rapide, 0,10 $ / 0,50 $ ; décrit comme « Our most efficient model for focused, high-volume tasks ». | https://developers.openai.com/api/docs/pricing | VERIFIED |
| e9 | OpenAI, `gpt-5.6-luna` : niveau petit et rapide, 0,20 $ / 1,20 $. | https://developers.openai.com/api/docs/pricing | VERIFIED |
| e10 | Google, `gemini-3.1-pro-preview` (étiqueté preview) : 2 $ / 12 $ jusqu'à 200 000 tokens, 4 $ / 18 $ au-delà. | https://ai.google.dev/gemini-api/docs/pricing | VERIFIED |
| e11 | Google, `gemini-3.8-flash` : 0,75 $ / 3,75 $ jusqu'au 31 décembre 2026, puis 1,50 $ / 7,50 $ à partir du 1er janvier 2027. Corrigé le 10 octobre 2026 : la ligne `gemini-3.5-flash` à 1,50 $ / 9 $ n'existe pas sur la page. | https://ai.google.dev/gemini-api/docs/pricing | VERIFIED (10/10/2026) |
| e12 | Google, `gemini-3.5-flash-lite` : niveau petit et rapide, 0,30 $ / 2,50 $. | https://ai.google.dev/gemini-api/docs/pricing | VERIFIED |
| e13 | Google, `gemini-3.8-flash` : 0,75 $ / 3,75 $ jusqu'au 31 décembre 2026, puis 1,50 $ / 7,50 $ dès le 1er janvier 2027 (lu deux fois). | https://ai.google.dev/gemini-api/docs/pricing | VERIFIED |
| e14 | Google, `gemini-2.5-flash-lite` : niveau petit et rapide, 0,10 $ / 0,40 $ pour le texte, l'image et la vidéo. | https://ai.google.dev/gemini-api/docs/pricing | VERIFIED |
| e15 | Mistral Large : la FAQ de la page de tarifs indique 0,5 $ en entrée et 1,5 $ en sortie par million, sans version précisée. | https://mistral.ai/pricing | UNVERIFIED |
| e16 | Mistral : la page des modèles liste Mistral Large 3 (licence Apache 2.0), Mistral Small 4 (Apache 2.0), Mistral Medium 3.5 et Mistral Large 4 ; aucun prix n'y figure. | https://docs.mistral.ai/getting-started/models/models_overview | VERIFIED |
| e17 | DeepSeek, `deepseek-v4-pro` : 0,044 $ en cache hit, 1,32 $ en cache miss et 3,96 $ en sortie aux heures de pointe ; moitié prix hors pointe. | https://api-docs.deepseek.com/quick_start/pricing/ | VERIFIED |
| e18 | DeepSeek : heures de pointe « 01:00 - 04:00 and 06:00 - 10:00 UTC, Monday through Friday ». | https://api-docs.deepseek.com/quick_start/pricing/ | VERIFIED |
| e19 | DeepSeek, `deepseek-flash` : 0,3 $ en cache miss et 1,2 $ en sortie aux heures de pointe (une seule lecture, colonnes à relire à la main). | https://api-docs.deepseek.com/quick_start/pricing/ | VERIFIED |
| e20 | Caractère open-weight de DeepSeek : non affirmé par la page de prix lue. | https://api-docs.deepseek.com/quick_start/pricing/ | UNVERIFIED |
| e21 | Qwen, Llama et Kimi : non recherchés dans cette passe ; aucun prix ni niveau relevé. | (aucune source lue) | UNVERIFIED |

## F. Non trouvé ou à confirmer

- Multiplicateurs Copilot sous la facturation par AI Credits (gh13) : la table lue est celle de l'ancien système.
- Liste des valeurs acceptées par `model` dans un agent Copilot (gh4).
- Sélection automatique et agents personnalisés (gh7).
- Clé globale de modèle pour les sous-agents Codex (cx15).
- Modèle de chaque sous-agent intégré Gemini CLI (gm4) et sélecteur Cursor (cu6).
- Prix de Mistral Large pour une version précise (e15).

## À retenir pour la formation

- Anthropic recommande Claude Opus 5.5 pour la plupart des charges, et Fable 5.1 pour le raisonnement exigeant (a2, a3).
- Dans Claude Code, le champ `model` d'un sous-agent accepte `haiku`, `sonnet`, `opus`, `fable`, un identifiant complet ou `inherit` ; Explore suit la session sauf redéfinition par un agent nommé `Explore` (b2, b4, b5).
- Anthropic chiffre le surcoût : un agent consomme environ 4 fois les tokens d'un chat, un système multi-agent environ 15 fois ; le multi-agent vaut la peine pour des tâches à forte valeur et parallélisables (c1, c2, c5).
- Chaque harnais a sa clé : `model` dans un fichier TOML pour Codex (cx3), `subagent_model` pour Kilo (kl3), `model` au format `provider/model-id` pour OpenCode (oc2), `model` pour Cursor (cu2).
- Dates à surveiller avant de publier : facturation Copilot en AI Credits depuis le 1er juin 2026 (gh8) ; accès à Gemini CLI arrêté le 18 juin 2026 pour les abonnés AI Pro et Ultra (gm7).
