# Plan de Fiabilisation & Robustesse

Pour rendre le logiciel "solide aux situations extrêmes", voici les actions prioritaires identifiées :

## 1. Moteur d'Optimisation : Mode "Dégradé" (Critique)
**Problème** : Actuellement, si les contraintes (horaires, charge) sont impossibles à satisfaire, l'algorithme échoue et ne renvoie **rien**.
**Solution** : Implémenter une stratégie de **repli (fallback)**.
1.  **Tentative 1 (Stricte)** : Respect total des horaires et capacités.
2.  **Tentative 2 (Souple)** : Si échec, on relance en autorisant le dépassement des horaires (avec pénalité) et en augmentant la capacité véhicules.
3.  **Tentative 3 (Sauvetage)** : Si encore échec, on autorise le rejet de certains patients (Unassigned) pour sauver le reste de la tournée.

## 2. Géocodage & Adresses
**Problème** : Si l'API de géocodage (OpenRouteService) est en panne, impossible de valider une adresse.
**Solution** :
*   **Mode Manuel** : Permettre à l'utilisateur de placer un point sur la carte manuellement si le géocodage échoue.
*   **Cache Agressif** : Le cache Redis est déjà en place, c'est bien. Augmenter sa durée de vie.

## 3. Santé Système (Health Checks)
**Problème** : L'endpoint `/health` renvoie "ok" même si la base de données est morte.
**Solution** : Créer un vrai Health Check qui teste la connexion DB et Redis. Indispensable pour que Docker (ou Kubernetes) redémarre le service en cas de plantage silencieux.

## 4. Gestion des Données (Doublons & Concurrence)
**Problème** : Si deux administrateurs modifient une tournée en même temps, le dernier écrase l'autre.
**Solution** : Optimistic Locking (versioning des lignes) ou verrouillage explicite. Pour l'instant, le plus simple est d'ajouter un hash de modification.

## 5. Monitoring
**Action** : Installer **Sentry** (déjà préparé dans le code) pour recevoir une alerte par mail à chaque crash (Erreur 500).

---

## 🚀 Proposition d'Action Immédiate

Je peux implémenter **le point n°1 (Optimisation avec Fallback)** tout de suite.
C'est le plus important : cela garantit que vous aurez *toujours* une proposition de tournée, même si la journée est surchargée (l'outil vous dira "J'ai dû dépasser de 30min pour tout faire rentrer" au lieu de planter).

Voulez-vous que je procède ?
