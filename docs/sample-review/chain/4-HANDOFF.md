# Handoff — solution/review-fix

> Pour l'agent (ou l'humain) qui reprend ce travail. Lire en entier avant d'agir.

## Objectif
Livrer la page speaker (`/speakers/:id`) et le formulaire de proposition (`/proposals`), avec une review Angular sans BLOCKER ni MAJOR avant le merge sur `main`.

## État
- **Fait.** La fonctionnalité est dans `be0bdd0`. La review initiale (Codex selon l'auteur, verdict REQUEST_CHANGES) a été corrigée par review-fix : 21 findings (8 BLOCKER, 13 MAJOR) en 21 commits, de `cdd40ce` à `28badd8`. Le journal est dans `.review/FIXES.md`.
- **Fait.** Re-review : `.review/REVIEW.md` et `.review/findings.json` (2026-10-08T07:59Z). **Verdict : REQUEST_CHANGES**, 23 findings ouverts : 1 BLOCKER, 2 MAJOR, 15 MINOR, 5 INFO.
- **Pas fait.** `npm test` et `npm run build` n'ont été exécutés ni pendant la re-review, ni pendant le handoff (pas d'autorisation pour les lancer).
- **Pas fait.** Aucun remote git n'est configuré (`gather.mjs` : `remote.kind = other`). On ne peut ni pousser ni ouvrir de PR/MR tant qu'il n'y en a pas.
- Le working tree est propre. `.review/` est généré et ne doit pas être commité.

⚠️ **Collision d'identifiants.** Les `F-xxx` des messages de commit et de FIXES.md renvoient à la review initiale (findings.json du 07:28Z, qui a été écrasé depuis). Ceux de `findings.json` et REVIEW.md actuels renvoient à la re-review. Exemple : F-001 désignait le label du titre ; c'est maintenant l'URL codée en dur.

## Décisions prises
Ces décisions viennent des notes de FIXES.md.
- Bio du speaker : `bypassSecurityTrustHtml` a été retiré et `[innerHTML]` est conservé, assaini par Angular. Le HTML reste autorisé. La re-review le remet en question (F-003).
- Label du titre : il est masqué visuellement (`sr-only`) au lieu d'être visible. La re-review le remet en question (F-008).
- Sélection d'un talk : le `div (click)` est devenu un `<button>` dans le `h3`, avec `::after` pour rendre toute la carte cliquable. L'output a été renommé `talkSelected` et n'a pas été supprimé. Constat de la re-review (F-004) : personne n'écoute cet output.
- Chargement speaker/talks : une seule chaîne `paramMap → switchMap → switchMap`, et l'état est stocké dans des signals (le projet est zoneless). La migration vers `rxResource` n'a pas été faite (F-029, INFO).
- Le typage `any` du speaker a été conservé volontairement au premier tour (MINOR hors périmètre). Il est repris par F-026 et F-034.
- `ChangeDetectionStrategy.Eager` a été retiré : `SpeakerSpotlight` est maintenant OnPush par défaut.

## Reste à faire
Les identifiants ci-dessous sont ceux de la **re-review**.
1. **F-001 BLOCKER** (`speaker.service.ts:7`) : URL `http://localhost:3000` codée en dur. **Faire trancher l'humain d'abord** : brancher sur `public/data` via `API_BASE_URL`, ou attendre une vraie API. Le traiter avec F-033 (`inject()`), F-034 (`any`), F-035 (`console.log`) et F-032 (spec du service), qui portent sur le même fichier.
2. **F-004 MAJOR** (`speaker-spotlight.html:33`) : l'output `talkSelected` n'est pas consommé. Proposition : un lien `routerLink` vers `/talks/:id`, et supprimer l'output.
3. **F-002 MAJOR** (`proposal-form.ts:59`) : aucun retour d'erreur à l'envoi sans titre.
4. Lancer `npm test -- --watch=false` et `npm run build`, puis consigner le résultat.
5. MINOR et INFO de `speaker-spotlight` : F-017 (control flow natif), F-024 (`input()`), F-026 (`any`), F-019 (`NgOptimizedImage`), F-030 (`initialsOf`), F-040, F-041, F-042, F-005 (test du bouton « Tout ajouter »), F-029.
6. MINOR et INFO de `proposals` : F-008 (label visible, décision UX), F-012 (formulaire typé), F-014 (`localStorage.setItem` sans try/catch), F-016 (guard fonctionnel).
7. Décisions produit à obtenir : F-003 (HTML dans la bio) et F-006 (live region par carte).

## Comment reprendre
```bash
git checkout solution/review-fix
npm ci
npm test -- --watch=false
npm run build
npm start   # puis /speakers/camille-laurent → aujourd'hui : « Impossible de charger ce speaker »
```
Avant de relancer review-fix, archiver `.review/FIXES.md` (par exemple en `FIXES-tour1.md`). C'est le seul journal du premier tour, et le prochain passage pourrait l'écraser *(supposition : non vérifié)*.

## Skills suggérés
1. `review-fix` : BLOCKER F-001 (après décision humaine), puis MAJOR F-004 et F-002, puis les MINOR par fichier.
2. `angular-review` : re-review, cette fois avec la validation empirique (tests et build).
3. `pr-handoff` : régénérer `PR_BODY.md` et `HANDOFF.md`, puis ouvrir la PR/MR une fois un remote configuré et sur demande explicite.
