# Diagnostic chez le client

Une page à remplir pendant la première semaine, avant de proposer le moindre outil. Chaque réponse oriente un choix du module 4 : la colonne de droite dit lequel.

| Question | Réponse du client | Ce que ça décide |
|---|---|---|
| Quel problème coûte le plus à l'équipe aujourd'hui ? Comment le mesurerait-on ? | | Le périmètre du skill et le score de départ (module 2) |
| Quels outils d'IA sont validés, pour qui, sur quel poste ? Sous quelle offre (individuelle, entreprise) ? | | Le dossier où le skill doit vivre (`.agents/skills`, `.claude/skills`…) |
| Le code et la CI : GitHub, GitLab, auto-hébergé ? Les runners ont-ils accès à internet ? | | La recette d'installation et le gabarit de CI |
| Le réseau : proxy, inspection TLS, miroir npm (Artifactory, Nexus) ? | | La configuration de Node et de npm sur les postes et les runners |
| Les données : données personnelles, secrets, code sous licence dans le dépôt ou les tests ? | | Ce qui ne doit jamais partir vers un modèle, les exclusions à configurer |
| Qui valide un nouvel outil : DSI, RSSI, DPO, achats, juridique ? Qui a un droit de veto ? | | Les destinataires de la note (`note-rssi.md`) et l'ordre des rendez-vous |
| Existe-t-il déjà une charte ou une politique d'usage de l'IA ? | | Reprendre l'existant plutôt qu'écrire `charte-ia.md` de zéro |
| Quel délai et quel critère de succès pour un premier résultat ? | | La durée du pilote et sa mesure (`plan-pilote.md`) |

## Ce que je n'ai pas encore

Liste ici les réponses manquantes et la personne à qui les demander.

- 
