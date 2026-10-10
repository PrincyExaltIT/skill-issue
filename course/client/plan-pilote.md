# Plan de pilote : skill de review

Un pilote répond à une question : est-ce que ce skill fait gagner du temps à cette équipe sans ajouter de bruit ? Tout ce qui suit sert à pouvoir répondre oui ou non avec des chiffres.

## Périmètre

- **Équipe** : (une seule équipe, volontaire)
- **Dépôt(s)** :
- **Durée** : (deux à quatre sprints)
- **Outil d'IA utilisé** : (celui que la DSI a déjà validé)
- **Ce qui est hors périmètre** : (autres équipes, autres dépôts, données de production)

## Le point de départ

Avant le premier sprint, lance le skill sur une MR de référence dont tu connais les vrais problèmes, et note le score avec `evals/angular-review/score.mjs` (ou ton propre corrigé si la stack n'est pas Angular).

| Mesure | Départ | Sprint 1 | Sprint 2 | Fin |
|---|---|---|---|---|
| Vrais problèmes trouvés sur la MR de référence (rappel) | | | | |
| Fausses alertes (leurres signalés) | | | | |
| Délai moyen avant le premier commentaire de revue | | | | |
| Findings acceptés par l'équipe / findings proposés | | | | |

## Ce qui tourne pendant le pilote

- [ ] Le skill est commité dans le dépôt et modifié par MR, comme le reste du code.
- [ ] La porte sans IA (scripts du skill) tourne en CI sur chaque MR, sans secret.
- [ ] La revue par IA reste un avis : un humain relit et décide.
- [ ] Un point toutes les deux semaines avec l'équipe : ce qui aide, ce qui gêne, les règles à ajouter ou retirer.

## Critères de décision

- **On étend** si : (exemple : le rappel dépasse le seuil fixé ensemble, les fausses alertes restent rares, l'équipe veut continuer)
- **On ajuste** si :
- **On arrête** si :

## Qui valide la fin du pilote

- 
