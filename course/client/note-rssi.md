# Note pour la RSSI, le DPO et la DSI : skill de review de code

Une page. Elle répond aux questions qu'on te posera de toute façon. Garde-la factuelle : ce que fait l'outil, ce qu'il ne fait pas, comment on le vérifie.

## 1. Ce qu'on installe

Un **skill** : un dossier de fichiers texte (`SKILL.md`, des règles en Markdown, des scripts Node sans dépendance) commité dans le dépôt `…`. Il est lu par **[outil déjà validé]**. Il n'ajoute ni compte, ni service, ni connexion réseau : c'est l'outil qui parle au modèle, depuis le poste, ou depuis la CI si la revue IA y est activée (section 2).

## 2. Ce qui sort du poste

| Donnée | Va où | Sous quel contrat | Conservation |
|---|---|---|---|
| Le diff et les fichiers lus pendant la revue | Le modèle de [outil validé] | [référence du contrat signé par la DSI] | [selon l'offre : à vérifier dans les conditions de l'éditeur] |
| Les règles du skill | Idem | Idem | Idem |
| Les sorties des scripts | Restent sur le poste ou le runner, sauf si l'agent les lit | | |

Les scripts du skill ne font **aucun appel réseau**. On peut le vérifier en les relisant : ils sont courts et n'importent que des modules standard de Node.

## 3. Ce qui ne doit jamais partir

- Données personnelles réelles (fixtures de test, exports, logs) : [mesure prise, par exemple exclusion de dossiers, données de test synthétiques].
- Secrets et clés : [scanner de secrets en place, fichiers exclus].

## 4. Permissions

- Ce que l'agent peut faire pendant la revue : lire les fichiers, lancer les deux scripts du skill. [Préciser le mode de permission de l'outil.]
- La porte sans IA en CI tourne **sans aucune variable secrète du projet**, y compris sur les MR venant de forks.

## 5. Chaîne d'approvisionnement

- Le skill vit dans le dépôt ; toute modification passe en MR avec relecture.
- S'il vient d'un registre (par exemple avec forgent), la version est épinglée et chaque fichier est vérifié par son empreinte (`forgent verify`).

## 6. Réversibilité

Supprimer le dossier du skill suffit à revenir en arrière. Rien n'est installé sur les postes en dehors du dépôt.

## 7. Contacts et suivi

- Responsable du pilote :
- Point de revue sécurité prévu le :
