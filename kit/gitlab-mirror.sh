#!/usr/bin/env bash
# Mirror a local repository (all branches and tags) to a new private GitLab project.
#
#   glab auth login                                   # once, interactive (your account, your token)
#   bash kit/gitlab-mirror.sh <groupe-ou-utilisateur> [nom-du-projet]
#
# Run it from the root of the repository to mirror (skill-issue, or skill-issue-playground).
# The GitLab CI job is ready in kit/ci/gitlab/ (the playground already ships it as .gitlab-ci.yml).
set -euo pipefail

namespace="${1:?usage: bash kit/gitlab-mirror.sh <groupe-ou-utilisateur> [nom-du-projet]}"
name="${2:-$(basename "$(git rev-parse --show-toplevel)")}"

glab auth status >/dev/null 2>&1 || { echo "glab n'est pas connecté : lancer d'abord 'glab auth login'." >&2; exit 1; }

if glab repo view "$namespace/$name" >/dev/null 2>&1; then
  echo "Le projet $namespace/$name existe déjà sur GitLab."
else
  glab repo create "$namespace/$name" --private --defaultBranch main \
    --description "Miroir de github.com/PrincyExaltIT/$name"
fi

git remote get-url gitlab >/dev/null 2>&1 || git remote add gitlab "https://gitlab.com/$namespace/$name.git"
git push gitlab --all
git push gitlab --tags
echo "Miroir prêt : https://gitlab.com/$namespace/$name"
