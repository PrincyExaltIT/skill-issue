# AGENTS.md — skill-issue

This repo is a training course (learners build their own code-review skill) plus a ready-made package of Agent Skills (the final bonus). Text for humans is French; the package's skill instructions are English; the course's reference skill (`course/revue-angular/`) is French, like the skill learners write.

## Commands
- `npm test` — validate the package's four skills and the six course steps, replay the scan snapshots, check that course steps stay consistent (`course/check-steps.mjs`). Run it after any change under `skills/`, `course/` or `evals/`.
- `npm run test:update` — rewrite scan snapshots, only after a deliberate rule change (explain it in the commit).
- `npm run build:site` — rebuild `site/dist/index.html` from `site/src/` and the kit's own files.
- `python studio/render.py <video> --at 5,12` — preview video frames before a full render.

## Rules of the house
- A skill folder holds only what the agent uses. Human docs go to README/site.
- Scripts are Node >= 18 with zero dependencies.
- One meaning in one place: the finding format lives in `skills/angular-review/references/REVIEWER_PROMPT.md` and `assets/findings.schema.json`.
- Harness paths live in `kit/harnesses.json` only; the site and the installer read it.
- Course numbers come from `course/resultats.json` (review runs per step) `course/resultats-chaine.json` (the module 3 chain, one run per harness) and `course/resultats-declenchement.json` (trigger eval per harness), produced from real runs; the site reads them at build time. Token sizes and module durations are computed by the build too. Never type a measured number into the site by hand.
- `course/revue-angular/etape-N` are snapshots: rules written at step 2 and scripts written at step 3 are copied unchanged to later steps (`check-steps.mjs` enforces it).
