# AGENTS.md — skill-issue

This repo is a training course plus a kit of Agent Skills. Text for humans is French; skill instructions are English.

## Commands
- `npm test` — validate the four skills against the spec and replay the scan snapshots. Run it after any change under `skills/` or `evals/`.
- `npm run test:update` — rewrite scan snapshots, only after a deliberate rule change (explain it in the commit).
- `npm run build:site` — rebuild `site/dist/index.html` from `site/src/` and the kit's own files.
- `python studio/render.py <video> --at 5,12` — preview video frames before a full render.

## Rules of the house
- A skill folder holds only what the agent uses. Human docs go to README/site.
- Scripts are Node >= 18 with zero dependencies.
- One meaning in one place: the finding format lives in `skills/angular-review/references/REVIEWER_PROMPT.md` and `assets/findings.schema.json`.
- Harness paths live in `kit/harnesses.json` only; the site and the installer read it.
