# Diagnostic chez le client

Une page à remplir pendant la première semaine, avant de proposer le moindre outil. Ce sont les six questions de la mission ; chaque réponse oriente un choix du module 4, et la colonne de droite dit lequel.

| # | Question | Réponse du client | Ce que ça décide |
|---|---|---|---|
| 1 | **Le problème.** Lequel coûte le plus à l'équipe aujourd'hui ? Comment le mesurerait-on ? | | Le périmètre du skill et le score de départ (module 2) |
| 2 | **Les outils.** Quels outils d'IA sont validés, pour qui, sur quel poste, sous quelle offre (individuelle, entreprise) ? | | Le dossier où le skill doit vivre (`.agents/skills`, `.claude/skills`…) |
| 3 | **Le réseau.** Où vivent le code et la CI (GitHub, GitLab, auto-hébergé) ? Les runners sortent-ils sur internet ? Proxy, inspection TLS, miroir npm (Artifactory, Nexus) ? | | La recette d'installation, le gabarit de CI, la configuration de Node et de npm |
| 4 | **Les données.** Données personnelles, secrets, code sous licence dans le dépôt ou les tests ? | | Ce qui ne doit jamais partir vers un modèle, les exclusions à configurer |
| 5 | **Qui valide.** DSI, RSSI, DPO, achats, juridique : qui valide un nouvel outil, qui a un veto ? Une charte d'usage de l'IA existe-t-elle déjà ? | | Les destinataires de `note-rssi.md`, l'ordre des rendez-vous, la charte à reprendre ou à écrire (`charte-ia.md`) |
| 6 | **Le délai.** Quel délai et quel critère de succès pour un premier résultat ? | | La durée du pilote et sa mesure (`plan-pilote.md`) |

## Ce que je n'ai pas encore

Liste ici les réponses manquantes et la personne à qui les demander.

- 
