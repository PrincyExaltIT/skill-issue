<!-- Notes de recherche pour le module « Chez le client » (installation). Collecte : sous-agent Haiku 5.5, le 10 octobre 2026 ; chaque fait porte son statut (VERIFIED, UNVERIFIED). -->

# Installer et partager skills et configurations d'agent en entreprise (octobre 2026)

## Méthode

Collecte du 10 octobre 2026. Les pages ont été trouvées par recherche web (WebSearch), puis lues (WebFetch). Chaque fait tient sur une ligne, avec sa source et son statut :

- **VERIFIED** : fait lu aujourd'hui sur une page officielle, URL citée.
- **UNVERIFIED** : non trouvé sur une page officielle aujourd'hui. Cela couvre les faits absents des pages lues, ceux qui ne viennent que d'un extrait de moteur de recherche ou d'une documentation tierce, et les conflits entre sources.

Bilan : 99 faits, dont 87 VERIFIED et 12 UNVERIFIED.

Précautions de lecture :

- Les pages lues sont résumées lors de la lecture. Les noms de paramètres, variables et chemins ont été recoupés avec le texte renvoyé, mais leur orthographe exacte doit être relue avant publication du module.
- Redirections suivies : `developers.openai.com/codex/*` renvoie vers `learn.chatgpt.com/docs/*`.
- La documentation Node lue est la version « latest » (v26.x). Les versions d'apparition indiquées sont celles des sections lues.
- La page de réglages Claude Code est trop longue pour être lue entièrement ; les définitions viennent de la page d'administration des plugins et de l'index des réglages.
- Aucun nom de variable, de clé ou de chemin n'a été inventé. Ce qui n'a pas été trouvé est marqué UNVERIFIED.

Contradictions relevées :

- La note de décembre 2025 cite `~/.codex/skills` pour Codex. La page officielle lue aujourd'hui ne cite que `~/.agents/skills` (faits 7 et 8).
- Le paquet `forgent` existe sur le registre npm, mais ses sous-commandes et son lockfile sha256 ne sont pas vérifiés (faits 46 et 47).

---

## 1. Où chaque harnais lit skills et instructions

Claude Code

- **d1** Claude Code lit les skills (`SKILL.md`) à quatre niveaux : entreprise (dossier de réglages managés, par exemple `/etc/claude-code/.claude/skills/<nom>/` sous Linux), personnel `~/.claude/skills/`, projet `.claude/skills/`, et plugin `<plugin>/skills/`. Sous Windows, le dossier managé est `C:\Program Files\ClaudeCode\` (fait 5), mais le chemin des skills n'est pas écrit en toutes lettres. Source : https://code.claude.com/docs/en/skills . **VERIFIED**
- **d2** En cas de nom identique, l'entreprise l'emporte sur le personnel, qui lui-même l'emporte sur le projet. Source : https://code.claude.com/docs/en/skills . **VERIFIED**
- **d3** `--add-dir` charge les skills du `.claude/skills/` du dossier passé, alors que `permissions.additionalDirectories` n'accorde que l'accès aux fichiers. Source : https://code.claude.com/docs/en/skills . **VERIFIED**
- **d4** Ordre de priorité des réglages : managé, ligne de commande (`--settings`), `.claude/settings.local.json`, `.claude/settings.json`, `~/.claude/settings.json`. Source : https://code.claude.com/docs/en/settings . **VERIFIED**
- **d5** Fichiers managés : macOS `/Library/Application Support/ClaudeCode/managed-settings.json` ; Linux et WSL `/etc/claude-code/managed-settings.json` ; Windows `C:\Program Files\ClaudeCode\managed-settings.json`. Source : https://code.claude.com/docs/en/managed-settings . **VERIFIED**
- **d6** Sous Windows, la politique peut aussi être une valeur `Settings` (JSON) sous `HKLM\SOFTWARE\Policies\ClaudeCode` ; `HKCU` ne sert qu'en l'absence de document administrateur. Claude Code ne lit pas l'ancien chemin `C:\ProgramData\ClaudeCode\managed-settings.json`. Source : https://code.claude.com/docs/en/managed-settings . **VERIFIED**

Codex (OpenAI)

- **d7** Skills lus dans `.agents/skills/` du dossier courant, de ses parents jusqu'à la racine du dépôt, puis `$HOME/.agents/skills` (utilisateur), `/etc/codex/skills` (admin) et les skills système fournis par OpenAI. Source : https://learn.chatgpt.com/docs/build-skills (redirection depuis developers.openai.com/codex/skills). **VERIFIED**
- **d8** Le chemin `~/.codex/skills` (note de décembre 2025) n'apparaît pas sur la page officielle lue aujourd'hui : ne pas l'utiliser sans test. Source : https://learn.chatgpt.com/docs/build-skills . **UNVERIFIED**
- **d9** Désactiver un skill : bloc `[[skills.config]]` dans `~/.codex/config.toml` avec `path` (chemin du SKILL.md) et `enabled = false`, puis redémarrer Codex. Source : https://learn.chatgpt.com/docs/build-skills . **VERIFIED**
- **d10** AGENTS.md global : `~/.codex` (ou la valeur de `CODEX_HOME`), un seul fichier retenu : `AGENTS.override.md` s'il existe, sinon `AGENTS.md`. Source : https://learn.chatgpt.com/docs/agent-configuration/agents-md . **VERIFIED**
- **d11** AGENTS.md projet : de la racine (git) jusqu'au dossier courant, un fichier par dossier (`AGENTS.override.md`, puis `AGENTS.md`, puis les noms de `project_doc_fallback_filenames`), concaténés de la racine vers le bas. Limite `project_doc_max_bytes` : 32 KiB par défaut, au-delà le contenu n'est plus ajouté. Source : https://learn.chatgpt.com/docs/agent-configuration/agents-md . **VERIFIED**

GitHub Copilot

- **d12** Instructions de dépôt : `.github/copilot-instructions.md`, `.github/instructions/NOM.instructions.md`, `AGENTS.md` (le plus proche prime), `CLAUDE.md` ou `GEMINI.md` à la racine. Source : https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions . **VERIFIED**
- **d13** Skills projet : `.github/skills/`, `.claude/skills/` ou `.agents/skills/` ; skills personnels : `~/.copilot/skills/` ou `~/.agents/skills/`. Source : https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/create-skills . **VERIFIED**
- **d14** Les skills sont lus par l'agent cloud, la revue de code, Copilot CLI, l'app Copilot et le mode agent de VS Code. Source : https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/create-skills . **VERIFIED**
- **d15** Les instructions d'organisation ne sont listées que pour GitHub.com (Copilot Chat, agent cloud, revue de code), jamais pour GHES. Source : https://docs.github.com/en/copilot/reference/custom-instructions-support . **VERIFIED**
- **d16** Copilot ne tourne pas sur GitHub Enterprise Server : il est proposé sur GitHub.com et GHE.com, et les licences s'attribuent depuis un compte entreprise cloud. Source : https://docs.github.com/en/enterprise-server@3.22/copilot/copilot-on-ghes/about-copilot-on-ghes . **VERIFIED**
- **d17** Copilot CLI sur GHES : mode « air-gapped » (sans connexion cloud ni licence Copilot), en préversion technique, avec les identifiants GHES. Source : https://docs.github.com/en/enterprise-server@3.22/copilot/copilot-on-ghes/about-copilot-on-ghes . **VERIFIED**
- **d18** Le comportement de l'agent cloud et de la revue de code sur GHES n'a pas été trouvé ; la matrice officielle ne les couvre pas. Source : https://docs.github.com/en/copilot/reference/custom-instructions-support . **UNVERIFIED**
- **d19** Différence de prise en charge des instructions et des skills entre Copilot Business et Enterprise : non trouvée sur les pages lues. Source : https://docs.github.com/en/copilot/reference/custom-instructions-support . **UNVERIFIED**

Cursor

- **d20** Règles projet : `.cursor/rules/`, fichiers `.mdc` obligatoires (un `.md` est ignoré), frontmatter `description`, `globs`, `alwaysApply`. Cursor lit aussi `AGENTS.md`. Source : https://cursor.com/docs/context/rules . **VERIFIED**
- **d21** Règles utilisateur : dans Customize → Rules (pas de fichier) ; règles d'équipe : tableau de bord (plans Team et Enterprise), avec l'option « enforced ». Source : https://cursor.com/docs/context/rules . **VERIFIED**
- **d22** Skills projet : `.agents/skills/`, `.cursor/skills/` (compatibilité `.claude/skills/`, `.codex/skills/`) ; utilisateur : `~/.agents/skills/`, `~/.cursor/skills/` (compatibilité `~/.claude/skills/`, `~/.codex/skills/`). Source : https://cursor.com/docs/context/skills . **VERIFIED**

Gemini CLI

- **d23** Skills projet : `.gemini/skills/` (alias `.agents/skills/`) ; utilisateur : `~/.gemini/skills/` (alias `~/.agents/skills/`). Priorité du plus faible au plus fort : intégré, extension, utilisateur, espace de travail. Source : https://geminicli.com/docs/cli/creating-skills/ . **VERIFIED**
- **d24** Commandes : `gemini skills install <url>` (dépôt Git), `gemini skills link .` (développement), `/skills` en session ; aucune commande terminal de liste n'est documentée. Source : https://geminicli.com/docs/cli/creating-skills/ . **VERIFIED**
- **d25** Bannière de la page : Gemini CLI a été remplacé par Antigravity CLI pour les comptes gratuits et Google One (18 juin 2026) ; vérifier si ces instructions s'appliquent encore. Source : https://geminicli.com/docs/cli/creating-skills/ . **VERIFIED**

OpenCode

- **d26** Skills : projet `.opencode/skills/<nom>/SKILL.md`, global `~/.config/opencode/skills/` ; aussi `.claude/skills/`, `~/.claude/skills/`, `.agents/skills/` et `~/.agents/skills/`. Recherche projet depuis le dossier courant jusqu'à la racine du worktree git. Source : https://opencode.ai/docs/skills . **VERIFIED**

GitLab Duo

- **d27** Skills projet : `skills/<nom>/SKILL.md` ou `.agents/skills/<nom>/SKILL.md` à la racine du projet ; en cas de doublon, `.agents/skills` prime. Source : https://docs.gitlab.com/user/duo_agent_platform/customize/agent_skills . **VERIFIED**
- **d28** AGENTS.md à trois niveaux : `~/.gitlab/duo/AGENTS.md` (utilisateur), racine du projet, sous-dossiers (par exemple `/frontend/AGENTS.md`). Seules les nouvelles conversations prennent en compte les modifications. Source : https://docs.gitlab.com/user/duo_agent_platform/customize/agents_md/ . **VERIFIED**

Autres harnais demandés

- **d29** Continue : aucun chemin de skills confirmé par sa documentation officielle ; une page « skills » existe en brouillon sur une branche miroir (lecture de `.continue/skills` et de `.claude/skills` non confirmée). Source : https://gitea.varghacsongor.hu/GithubMirror/continue/compare/@continuedev/config-yaml@1.40.0...docs-agent-skills . **UNVERIFIED**
- **d30** Kilo Code : chemin projet non confirmé. `.kilocode/skills/` et `~/.kilocode/skills/` sont cités par un outil tiers, et `.kilo/skills` n'est pas confirmé. Source : https://kilo.ai/docs/features/skills . **UNVERIFIED**

---

## 2. Distribuer un skill ou une configuration à une équipe sans internet

- **d31** Claude Code : pour une équipe d'un même dépôt, committer `.claude/skills/` dans le contrôle de version ; pour plusieurs dépôts, passer par un plugin ou un réglage managé. Source : https://code.claude.com/docs/en/skills . **VERIFIED**
- **d32** Synthèse : un skill committé dans `.agents/skills/` est lu au niveau projet par Codex (fait 7), Copilot (fait 13), Cursor (fait 22), Gemini CLI (fait 23) et OpenCode (fait 26). Un seul dossier suffit donc pour ces outils. Source : URL citées dans les faits 7, 13, 22, 23 et 26. **VERIFIED**
- **d33** Marketplace Claude Code : un dépôt git contenant `.claude-plugin/marketplace.json`, privé possible. Ajout : `claude plugin marketplace add <owner>/<repo>` ; installation : `claude plugin install <plugin>@<marketplace>`. Source : https://code.claude.com/docs/en/plugin-marketplaces . **VERIFIED**
- **d34** Avant partage : `claude plugin validate ./my-marketplace` (la dernière ligne affiche « Validation passed ») puis `claude plugin marketplace add ./my-marketplace` pour tester en local. Source : https://code.claude.com/docs/en/plugin-marketplaces . **VERIFIED**
- **d35** Sur GitLab ou un hôte git interne : source `git` avec une `url` ; le clone utilise les identifiants git de la machine, sans invite ; un dépôt privé exige un accès en lecture pour chaque utilisateur. Source : https://code.claude.com/docs/en/plugins/org . **VERIFIED**
- **d36** Partage sans marketplace : envoyer le dossier du plugin ou un `.zip` ; `--plugin-dir <dossier>` le charge pour une seule session. Source : https://code.claude.com/docs/en/plugin-marketplaces et https://code.claude.com/docs/en/plugins/org . **VERIFIED**
- **d37** Sans accès git sortant : marketplaces de type `directory` ou `file` sur un montage partagé, et `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` (ce réglage coupe aussi la mise à jour automatique des plugins). Source : https://code.claude.com/docs/en/plugins/org . **VERIFIED**
- **d38** Seed pour image ou runner : au build, `CLAUDE_CODE_PLUGIN_CACHE_DIR=/opt/claude-seed claude plugin marketplace add <dépôt>` puis `claude plugin install` ; à l'exécution, `CLAUDE_CODE_PLUGIN_SEED_DIR=/opt/claude-seed` (séparateur `:` sous Unix, `;` sous Windows). Le seed est en lecture seule et ses plugins doivent être activés par `enabledPlugins`. Source : https://code.claude.com/docs/en/plugins/org . **VERIFIED**
- **d39** Entreprise : `extraKnownMarketplaces` (réglage managé) enregistre la marketplace sur chaque machine ; `enabledPlugins` (par exemple `"nom@marketplace": true`) installe et force l'activation ; `false` bloque. Source : https://code.claude.com/docs/en/plugins/org . **VERIFIED**
- **d40** Mises à jour : `DISABLE_AUTOUPDATER` dans le bloc `env` managé coupe les mises à jour de Claude Code et des plugins ; `FORCE_AUTOUPDATE_PLUGINS=1` garde les mises à jour des plugins. Source : https://code.claude.com/docs/en/plugins/org . **VERIFIED**
- **d41** Pipeline `-p` ou CI : `CLAUDE_CODE_SYNC_PLUGIN_INSTALL=1` attend l'installation avant la première requête ; `claude -p --output-format stream-json --verbose` liste les plugins chargés dans l'événement `init`. Source : https://code.claude.com/docs/en/plugins/org . **VERIFIED**
- **d42** CI avec marketplace privée : exporter `GH_TOKEN` (lecture seule sur le dépôt de marketplace) puis lancer `gh auth setup-git` ; le token par défaut d'un workflow ne couvre que son propre dépôt. Source : https://code.claude.com/docs/en/plugins/org . **VERIFIED**
- **d43** npm : `npm install ./dossier` (dépendances installées si le dossier est dans la racine du projet), `npm install ./paquet.tgz` (extensions `.tar`, `.tar.gz`, `.tgz`), `npm install git+https://<hôte>/<dépôt>.git#<ref>`. La page ne dit pas si les dépendances d'un tarball viennent du registre. Source : https://docs.npmjs.com/cli/v11/commands/npm-install . **VERIFIED**
- **d44** Sous-modules Git : le dépôt parent ne stocke qu'un pointeur (gitlink, mode `160000`) vers un commit fixe, déclaré dans `.gitmodules` ; clone avec `git clone --recurse-submodules`, initialisation par `git submodule update --init --recursive`. Source : https://git-scm.com/book/en/v2/Git-Tools-Submodules . **VERIFIED**
- **d45** Subtree Git : `git subtree add --prefix=<dossier> --squash <dépôt> <ref>` puis `git subtree pull` ; pas de `.gitmodules`, le contenu est copié dans le dépôt. Source : https://github.com/git/git/blob/master/contrib/subtree/git-subtree.adoc . **VERIFIED**
- **d46** Paquet `forgent` : version 1.2.1 publiée le 9 octobre 2026 sur npm, binaire `forgent`, `engines` `node >= 18`, `dist.integrity` au format sha512. Source : https://registry.npmjs.org/forgent . **VERIFIED**
- **d47** forgent 1.2.1, testé le 10 octobre 2026 sur un clone du lab : `add --provider agents,claude --project …` installe dans `.agents/skills` et `.claude/skills` et écrit `forgent.lock.json` ; `verify` sans argument contrôle les copies ; sans `--provider`, `add` refuse (« --provider is required ») ; `--registry` attend le dossier du registre (avec un chemin vers `registry.json`, il cherche `registry.json/registry.json` et échoue). Le registre npm ne publie qu'un sha512 pour le paquet lui-même. **VERIFIED (test local)**

---

## 3. Node, proxy, inspection TLS et miroir npm

Claude Code

- **d48** Proxy : `HTTPS_PROXY` (recommandé), `HTTP_PROXY`, `NO_PROXY` (liste séparée par des espaces ou des virgules, ou `*`). Les variantes en minuscules sont acceptées ; l'ordre de lecture est `https_proxy`, `HTTPS_PROXY`, `http_proxy`, `HTTP_PROXY`. Les SOCKS ne sont pas pris en charge. Source : https://code.claude.com/docs/en/network-config . **VERIFIED**
- **d49** Authentification proxy basique possible dans l'URL (`http://user:pass@hôte:port`), mais la doc demande d'éviter les mots de passe en dur. NTLM et Kerberos ne sont pas couverts : la doc recommande une passerelle LLM compatible. Source : https://code.claude.com/docs/en/network-config . **VERIFIED**
- **d50** CA d'entreprise hors du magasin système : `NODE_EXTRA_CA_CERTS=/chemin/ca.pem`. Par défaut, Claude Code fait confiance aux CA Mozilla embarquées et au magasin du système (`CLAUDE_CODE_CERT_STORE=bundled,system`) ; les valeurs `bundled` ou `system` restreignent cette liste. Source : https://code.claude.com/docs/en/network-config . **VERIFIED**
- **d51** Le magasin système n'est lu que si le runtime expose `tls.getCACertificates` : le binaire natif le fait toujours ; une installation npm exige Node 22.15 ou plus. Source : https://code.claude.com/docs/en/network-config . **VERIFIED**
- **d52** En session cloud, `NODE_EXTRA_CA_CERTS`, `CLAUDE_CODE_CLIENT_CERT`, `CLAUDE_CODE_CLIENT_KEY`, `CLAUDE_CODE_CLIENT_KEY_PASSPHRASE` et `NODE_TLS_REJECT_UNAUTHORIZED`, posés dans un bloc `env` de fichier de réglages, sont ignorés. Source : https://code.claude.com/docs/en/network-config . **VERIFIED**
- **d53** Pour les agents en arrière-plan, mettre les variables réseau dans le bloc `env` de `~/.claude/settings.json` ou des réglages managés, pas seulement dans le shell. Source : https://code.claude.com/docs/en/network-config . **VERIFIED**
- **d54** Vérification : `claude --debug` écrit dans `~/.claude/debug/<session>.txt` (la ligne « CA certs: Appended extra certificates from NODE_EXTRA_CA_CERTS » confirme la prise en compte) ; `/status` affiche les lignes Proxy et CA. Source : https://code.claude.com/docs/en/network-config . **VERIFIED**
- **d55** Hôtes à autoriser (extrait) : `api.anthropic.com`, `claude.ai`, `platform.claude.com`, `github.com` (marketplaces), `registry.npmjs.org` (plugins npm et installation npm), `downloads.claude.ai` (exécutables de plugins, installeur natif), `raw.githubusercontent.com` (changelog). Source : https://code.claude.com/docs/en/network-config . **VERIFIED**

Node.js

- **d56** `NODE_EXTRA_CA_CERTS=file` ajoute des certificats aux racines par défaut ; la variable n'est lue qu'au lancement du processus (ajoutée en v7.3.0). Source : https://nodejs.org/api/cli.html . **VERIFIED**
- **d57** `NODE_USE_SYSTEM_CA=1` (v22.19.0 et v24.6.0) ou `--use-system-ca` (v23.8.0) ajoute le magasin système aux CA embarquées et à `NODE_EXTRA_CA_CERTS` ; le flag prime s'il est présent avec la variable. `tls.getCACertificates()` (v22.15.0, v23.10.0) renvoie les CA par type `default`, `system`, `bundled` ou `extra`. Source : https://nodejs.org/api/cli.html et https://nodejs.org/api/tls.html . **VERIFIED**
- **d58** `NODE_USE_ENV_PROXY=1` (v22.21.0 et v24.0.0) ou `--use-env-proxy` (v22.21.0 et v24.5.0) : Node lit `HTTP_PROXY`, `HTTPS_PROXY` et `NO_PROXY` au démarrage. Source : https://nodejs.org/api/cli.html . **VERIFIED**
- **d59** `NODE_TLS_REJECT_UNAUTHORIZED=0` désactive toute vérification TLS ; la doc le déconseille fortement. Source : https://nodejs.org/api/cli.html . **VERIFIED**

npm

- **d60** Clés npm : `registry` (défaut `https://registry.npmjs.org/`), `strict-ssl` (défaut `true`), `cafile` (chemin d'un fichier PEM), `ca` (certificat PEM, répétable). Source : https://docs.npmjs.com/cli/v11/using-npm/config . **VERIFIED**
- **d61** Clés proxy npm : `proxy` (lit `HTTP_PROXY`), `https-proxy` (lit `HTTPS_PROXY`, `https_proxy`, `HTTP_PROXY`, `http_proxy`), `noproxy` (défaut : valeur de `NO_PROXY`). Chaque clé peut aussi s'écrire `npm_config_<nom>` en variable d'environnement, par exemple `npm_config_strict_ssl`. Source : https://docs.npmjs.com/cli/v11/using-npm/config . **VERIFIED**
- **d62** Fichiers `.npmrc` : projet, `$HOME/.npmrc` (sous Windows `%userprofile%\.npmrc`), et global `$PREFIX/etc/npmrc`. Source : https://docs.npmjs.com/cli/v11/using-npm/config et https://docs.jfrog.com/artifactory/docs/npm-repositories . **VERIFIED**

Miroirs

- **d63** JFrog Artifactory : un dépôt « remote » npm joue le rôle de proxy et de cache de `registry.npmjs.org`. Côté client : `registry=https://<hôte>/artifactory/api/npm/<dépôt>/` et `//<hôte>/artifactory/api/npm/<dépôt>/:_authToken=<TOKEN>` ; la clé `_auth` n'est plus gérée depuis npm 9. Source : https://docs.jfrog.com/artifactory/docs/npm-repositories . **VERIFIED**
- **d64** JFrog : connexion interactive recommandée par `npm login --registry=<URL> --auth-type=web` (ajouter `--scope=@<SCOPE>` pour un scope). Source : https://docs.jfrog.com/artifactory/docs/npm-repositories . **VERIFIED**
- **d65** Sonatype Nexus : pointer npm vers un dépôt « group » par `npm config set registry http://<hôte>/repository/<groupe>/`, ce qui écrit la ligne dans `.npmrc`. Ne pas changer l'URL distante d'un proxy existant (risque de 404) : en créer un nouveau. Source : https://help.sonatype.com/repomanager3/nexus-repository-administration/formats/npm-registry/configuring-npm . **VERIFIED**
- **d66** Nexus : la création du proxy npm vers `registry.npmjs.org` et l'authentification ne sont pas détaillées sur la page lue. Source : https://help.sonatype.com/repomanager3/nexus-repository-administration/formats/npm-registry/configuring-npm . **UNVERIFIED**

Codex et Copilot

- **d67** Codex : `CODEX_CA_CERTIFICATE` (bundle PEM, prioritaire) puis `SSL_CERT_FILE` en repli, pour les clients HTTPS, de connexion et WebSocket. Source : https://learn.chatgpt.com/docs/config-file/environment-variables . **VERIFIED**
- **d68** Codex : `HTTP_PROXY`, `HTTPS_PROXY` et `NO_PROXY` ne figurent pas sur la page de variables d'environnement lue ; leur prise en charge n'est pas vérifiée. Source : https://learn.chatgpt.com/docs/config-file/environment-variables . **UNVERIFIED**
- **d69** Copilot CLI : CA via `NODE_EXTRA_CA_CERTS` selon un guide tiers (Coder), non selon la documentation GitHub ; à tester. Source : https://coder.com/docs/ai-coder/ai-gateway/clients/copilot . **UNVERIFIED**

Conflits

- **d70** Un rapport utilisateur signale une erreur de certificat sous inspection TLS sur une version Windows de Claude Code, malgré `NODE_EXTRA_CA_CERTS` ; un guide tiers décrit Claude Code comme tournant sous Bun, un autre comme Node. Le lien vient des résultats de recherche et son contenu n'a pas été ouvert. Source : https://github.com/anthropics/claude-code/issues/41157 . **UNVERIFIED**

---

## 4. Hygiène supply chain des skills

- **d71** Dans la spec Agent Skills, `allowed-tools` est marqué « Experimental » ; son support varie selon l'agent. Source : https://agentskills.io/specification . **VERIFIED**
- **d72** La spec n'a pas de champ `version` de premier niveau : `metadata` est une table clé-valeur de chaînes, avec l'exemple `version: "1.0"`. Pour épingler, mettre la version dans `metadata`. Source : https://agentskills.io/specification . **VERIFIED**
- **d73** Claude Code : `allowed-tools` pré-approuve des outils pendant le tour, il ne restreint pas la liste ; il est ignoré dans les skills projet et personnels si `allowManagedPermissionRulesOnly` est actif. Source : https://code.claude.com/docs/en/skills . **VERIFIED**
- **d74** Copilot : la doc avertit de ne pas pré-approuver `shell` ou `bash` sans avoir relu le skill et vérifié sa source. Source : https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/create-skills . **VERIFIED**
- **d75** Un plugin Claude Code exécute du code avec les droits de l'utilisateur : hooks, monitors, serveurs MCP et LSP, et le dossier `bin/` ajouté au PATH du shell Bash. Source : https://code.claude.com/docs/en/plugins/security . **VERIFIED**
- **d76** Le sandbox Claude Code couvre les commandes Bash, PowerShell et Monitor, sur macOS, Linux et WSL2 ; hooks, serveurs MCP et outils de fichiers restent hors sandbox ; sous Windows natif, les commandes ne sont pas sandboxées. Source : https://code.claude.com/docs/en/sandboxing . **VERIFIED**
- **d77** Réglages du sandbox : `network.allowedDomains`, `network.deniedDomains`, `allowManagedDomainsOnly` (verrouille la liste) et `allowUnsandboxedCommands: false` (désactive l'échappatoire `dangerouslyDisableSandbox`). Source : https://code.claude.com/docs/en/sandboxing . **VERIFIED**
- **d78** Plugin de type `archive` : une empreinte `sha256` épinglée est vérifiée, et l'installation est refusée en cas d'écart. Une source git peut être épinglée par `ref` ou `sha`. Source : https://code.claude.com/docs/en/plugins/security et https://code.claude.com/docs/en/plugin-marketplaces . **VERIFIED**
- **d79** Listes managées : `strictKnownMarketplaces` (allowlist ; `[]` bloque toutes les sources, y compris l'officielle), `blockedMarketplaces` (vérifiée en premier), `hostPattern` (utile pour GHES), `disableSideloadFlags` (refuse `--plugin-dir` et équivalents), `strictPluginOnlyCustomization`, `allowManagedHooksOnly`. Source : https://code.claude.com/docs/en/plugins/org . **VERIFIED**
- **d80** Node : le modèle de permissions s'active par `node --permission` ; les accès fichiers (`--allow-fs-read`, `--allow-fs-write`), processus enfants (`--allow-child-process`) et réseau (`--allow-net`) sont alors refusés par défaut. Ajouté en v20.0.0, stable en v22.13.0 et v23.5.0. C'est une ceinture de sécurité, pas une frontière. Source : https://nodejs.org/api/permissions.html . **VERIFIED**
- **d81** `npm ci` exige `package-lock.json`, échoue si le lockfile et `package.json` divergent, supprime `node_modules` et n'écrit jamais dans `package.json` ni dans les lockfiles. Source : https://docs.npmjs.com/cli/v11/commands/npm-ci . **VERIFIED**
- **d82** `npm audit signatures` vérifie les signatures du registre et les attestations de provenance. `ignore-scripts` : npm ne lance pas les scripts déclarés dans les `package.json`. Source : https://docs.npmjs.com/cli/v11/commands/npm-audit . **VERIFIED**
- **d83** `npm publish --provenance` exige GitHub Actions ou GitLab CI, sur un runner hébergé dans le cloud (`id-token` sur GitHub ; `id_tokens` avec `aud: sigstore` sur GitLab). La doc ne couvre pas un runner auto-hébergé. Source : https://docs.npmjs.com/generating-provenance-statements . **VERIFIED**
- **d84** Signature cryptographique propre aux skills, au-delà des paquets npm : aucun mécanisme officiel trouvé. Source : https://agentskills.io/specification . **UNVERIFIED**
- **d85** Analyse automatique des scripts d'un skill : aucun outil ni recommandation officiel trouvé ; l'index agentskills.io ne liste pas de page sécurité. Source : https://agentskills.io/llms.txt . **UNVERIFIED**

---

## 5. CI sur GitLab self-managed et GitHub Enterprise

GitLab

- **d86** Une pipeline de merge request se déclenche avec `if: $CI_PIPELINE_SOURCE == "merge_request_event"`, dans `rules:` ou `workflow: rules` de `.gitlab-ci.yml`. Source : https://docs.gitlab.com/ci/pipelines/merge_request_pipelines/ . **VERIFIED**
- **d87** Une MR issue d'un fork tourne par défaut dans le fork, avec les variables CI/CD du fork ; si un membre du projet parent la lance, ce sont les réglages du parent. Source : https://docs.gitlab.com/ci/pipelines/merge_request_pipelines/ . **VERIFIED**
- **d88** Un runner GitLab ne prend un job que s'il possède tous les tags de ce job ; l'option « Run untagged jobs » contrôle les jobs sans tag. Source : https://docs.gitlab.com/ci/runners/configure_runners/ . **VERIFIED**
- **d89** Mot-clé `tags` : « List of tags that are used to select a runner ». Cache : `cache:key` est partagé entre pipelines qui utilisent la même clé, et `cache:paths` est relatif à `$CI_PROJECT_DIR`. Source : https://docs.gitlab.com/ci/yaml/ . **VERIFIED**
- **d90** Runner Docker : `pull_policy` vaut `always` par défaut, ou `if-not-present`, ou `never` ; une liste de politiques en repli est possible. `never` exige des images déjà présentes sur l'hôte, recommandé pour un runner privé dédié et déconseillé en auto-scaling. Source : https://docs.gitlab.com/runner/executors/docker/ . **VERIFIED**
- **d91** Runner derrière un proxy : override systemd `/etc/systemd/system/gitlab-runner.service.d/http-proxy.conf` puis `systemctl daemon-reload` et redémarrage ; dans `config.toml`, `environment = [...]` sous `[[runners]]` transmet les proxys aux conteneurs de job, et `pre_get_sources_script` configure git. Source : https://docs.gitlab.com/runner/configuration/proxy/ . **VERIFIED**
- **d92** Avec dind, `NO_PROXY` doit inclure `docker:2375,docker:2376`, sinon `docker push` est bloqué. Source : https://docs.gitlab.com/runner/configuration/proxy/ . **VERIFIED**

GitHub et GitHub Enterprise

- **d93** Un `pull_request` venu d'un fork ne reçoit pas les secrets (seul `GITHUB_TOKEN`, en lecture seule) et les workflows de fork ne tournent pas par défaut. Source : https://docs.github.com/en/actions/reference/events-that-trigger-workflows . **VERIFIED**
- **d94** `pull_request_target` s'exécute dans le contexte de la branche par défaut du dépôt de base ; la doc déconseille d'y compiler ou exécuter le code de la PR. Source : https://docs.github.com/en/actions/reference/events-that-trigger-workflows . **VERIFIED**
- **d95** `runs-on` accepte un tableau de labels, et le runner doit posséder tous ces labels. Labels par défaut : `self-hosted`, l'OS (`linux`, `windows`, `macOS`) et le matériel (`x64`, `ARM`, `ARM64`) ; `--no-default-labels` à la création du runner. Source : https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/use-in-a-workflow . **VERIFIED**
- **d96** Claude Code sur GHES est réservé aux plans Team et Enterprise ; le serveur MCP GitHub n'est pas supporté sur GHES ; pour l'accès CLI, `gh auth login --hostname <hôte>`. Source : https://code.claude.com/docs/en/github-enterprise-server . **VERIFIED**
- **d97** Sur GHES, une marketplace s'ajoute par URL git complète (par exemple `https://github.example.com/<org>/<dépôt>.git`, HTTPS recommandé) ; `owner/repo` résout toujours vers github.com. Source : https://code.claude.com/docs/en/github-enterprise-server . **VERIFIED**
- **d98** Sur GHES, `strictKnownMarketplaces` accepte `{"source": "hostPattern", "hostPattern": "^github\\.example\\.com$"}` ; `extraKnownMarketplaces` de type `git` installe la marketplace avec les identifiants git de la machine. Source : https://code.claude.com/docs/en/github-enterprise-server . **VERIFIED**
- **d99** Sur GHES, les sessions cloud n'installent pas de façon fiable une marketplace hébergée sur un autre hôte que le dépôt de la session ; préférer la CLI, les réglages managés ou claude.ai. Source : https://code.claude.com/docs/en/github-enterprise-server . **VERIFIED**

---

## Recettes d'installation par contexte

Chaque étape renvoie aux numéros de faits. Les étapes marquées « à tester » reposent sur des faits UNVERIFIED.

### A. Sans internet

1. Placer le skill dans le dépôt Git interne : `.agents/skills/` pour Codex, Copilot, Cursor, Gemini CLI et OpenCode (faits 7, 13, 22, 23, 26, 32), ou `.claude/skills/` pour Claude Code (faits 1, 31).
2. Pour Claude Code, ne pas compter sur une marketplace réseau : utiliser une marketplace `directory` ou `file` sur un montage partagé (fait 37), ou un seed construit au build et posé dans l'image (fait 38). Couper les appels non essentiels et les mises à jour (faits 37, 40).
3. Si le skill embarque un paquet npm, l'installer depuis un fichier local (`npm install ./paquet.tgz`, fait 43). Vérifier l'intégrité du lockfile par `npm ci` (fait 81).
4. Pour forgent, le registre ne suffit pas à valider le lockfile sha256 : tester avant de diffuser (faits 46 et 47, à tester).
5. Claude Code doit joindre l'API du modèle (hôtes requis listés au fait 55) : sans sortie réseau, il faut une passerelle ou un fournisseur joignable en interne, ce que cette collecte n'a pas détaillé. Copilot hors ligne n'existe que par le mode air-gapped de Copilot CLI, en préversion pour GHES (faits 16 et 17).

### B. Proxy avec inspection TLS et miroir npm

1. Faire confiance à la racine d'inspection : l'installer dans le magasin système (Claude Code le lit par défaut, fait 50 ; Node 22.15 ou plus pour une installation npm, fait 51). Sinon `NODE_EXTRA_CA_CERTS=<PEM>` (faits 50 et 56), ou `cafile` dans `.npmrc` (fait 60). Pour Codex, `CODEX_CA_CERTIFICATE` (fait 67).
2. Renseigner le proxy avec `HTTPS_PROXY`, `HTTP_PROXY` et `NO_PROXY` (fait 48), dans le bloc `env` de `~/.claude/settings.json` (fait 53) et pas seulement dans le shell. Côté npm, `proxy`, `https-proxy` et `noproxy` (fait 61).
3. Pour un script Node du skill qui doit joindre le réseau derrière un proxy, `NODE_USE_ENV_PROXY=1` (fait 58). Ne jamais baisser la sécurité pour contourner une erreur : pas de `strict-ssl=false` (fait 60), pas de `NODE_TLS_REJECT_UNAUTHORIZED=0` (fait 59).
4. Miroir npm : `registry=https://<hôte>/artifactory/api/npm/<dépôt>/` et le token `_authToken` dans `~/.npmrc` (faits 62 et 63) ; connexion par `npm login --auth-type=web` (fait 64). Pour Nexus, l'URL du groupe (fait 65 ; l'authentification est à tester, fait 66).
5. Ouvrir au proxy les hôtes listés au fait 55. Pour l'authentification NTLM ou Kerberos, passer par une passerelle (fait 49).
6. Vérifier la configuration avec `claude --debug` et `/status` (fait 54).
7. Cas à tester : Codex derrière proxy (fait 68), Copilot CLI avec CA (fait 69), erreur Windows signalée (fait 70).

### C. GitHub Enterprise (Server ou Cloud)

1. Placer les skills et instructions dans le dépôt GHES : `.github/skills/` ou `.agents/skills/` (fait 13), `.github/copilot-instructions.md` et `AGENTS.md` (fait 12).
2. Copilot : sur GHES, la fonction passe par un compte entreprise cloud pour les licences (fait 16). Les instructions d'organisation ne concernent que GitHub.com (fait 15). Le comportement de l'agent cloud sur GHES reste à tester (fait 18). Le plan Business ou Enterprise n'a pas été comparé (fait 19, à tester).
3. Claude Code : plan Team ou Enterprise requis (fait 96). Ajouter la marketplace par URL git complète, en HTTPS (fait 97), la pré-enregistrer par `extraKnownMarketplaces` (fait 98), et restreindre les hôtes autorisés par `hostPattern` (fait 98).
4. Pour un accès CLI à GHES : `gh auth login --hostname <hôte>` (fait 96).
5. Ne pas compter sur les sessions cloud pour installer une marketplace GHES (fait 99).
6. CI sur runners GHES auto-hébergés : cibler les labels (fait 95), ne pas exposer les secrets aux PR de fork (fait 93), éviter `pull_request_target` pour exécuter le code d'une PR (fait 94).

### D. GitLab self-managed

1. Placer les skills à la racine du projet : `skills/` ou `.agents/skills/` pour GitLab Duo (fait 27), `.claude/skills/` pour Claude Code (fait 1), `AGENTS.md` à la racine et dans les sous-dossiers (faits 10, 11, 28).
2. Marketplace Claude Code sur GitLab : source `git` avec `url`, identifiants git de la machine (fait 35) ; ou montage `directory` (fait 37) ; ou seed dans l'image (fait 38).
3. Pipeline de contrôle déterministe sur merge request : `rules: if: $CI_PIPELINE_SOURCE == "merge_request_event"` (fait 86). Une MR de fork utilise les variables du fork, donc pas les secrets du parent par défaut (fait 87). Le job cible un runner qui possède tous ses tags (faits 88, 89).
4. Images hors ligne : sur un runner privé dédié, `pull_policy = "never"` avec les images préchargées (fait 90).
5. Runner derrière proxy : override systemd et `environment` dans `config.toml` (fait 91) ; pour dind, `NO_PROXY` avec `docker:2375,docker:2376` (fait 92).
6. Cache : `cache:key` et `cache:paths` (fait 89).
7. Sécurité d'installation : `npm ci` avec lockfile (fait 81), `npm audit signatures` (fait 82). Un runner auto-hébergé n'est pas couvert par la provenance npm (fait 83, à tester si besoin).
8. Si le runner inspecte le TLS, `NODE_EXTRA_CA_CERTS` ou `NODE_USE_SYSTEM_CA=1` côté Node (faits 56 et 57).
