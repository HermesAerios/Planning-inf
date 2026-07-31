# Guide de Déploiement Production (HTTPS)

## 0. Choisir un Hébergement (Serveur)
Cette application utilise **Docker**. La solution la plus simple et économique est un **VPS (Virtual Private Server)**.

### Recommandations Minimales
*   **OS** : Ubuntu 22.04 LTS or Debian 11/12
*   **CPU** : 2 vCPUs (recommandé pour l'optimisation)
*   **RAM** : 4 GB recommandés (2 GB minimum, Docker + DB + App consomment ~1.5GB)
*   **Disque** : 20 GB SSD

### Fournisseurs Conseillés
*   **Hetzner** (Cloud CPX11 ou CPX21) : Très performant et pas cher (~5-8€/mois).
*   **OVH** (VPS Starter ou Value) : Hébergé en France/Europe (~5-10€/mois).
*   **DigitalOcean / AWS Lightsail** : Simples d'usage (~10-15$/mois).

Une fois le serveur loué, vous recevrez une **IP Publique** (ex: `1.2.3.4`) et un accès **SSH** (`root@1.2.3.4`).

## Prérequis Techniques
1.  Un nom de domaine (ex: `mon-app-tournees.com`) acheté chez un registrar (OVH, Namecheap...).
2.  Accès SSH au serveur (`ssh root@ip-du-serveur`).
3.  **Docker** & **Docker Compose** installés sur le serveur.

### Installation de Docker (Ubuntu)
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

## Installation de l'Application

### 1- Configuration du Domaine
Connectez-vous à votre registrar (là où vous avez acheté le domaine) et configurez la Zone DNS :
*   **Type** : A
*   **Nom** : @ (ou sous-domaine `app`)
*   **Valeur** : L'IP de votre serveur (ex: `1.2.3.4`)

Sur le serveur :
Créez un fichier `.env` ou exportez la variable :
```bash
export DOMAIN_NAME=mon-app-tournees.com
```

### 2- Premier Lancement (Certificats)
Pour la première fois, il faut générer les certificats. Nginx ne pourra pas démarrer sans eux.
Nous utilisons un script temporaire ou une commande docker pour demander le certificat initial.

Exécutez cette commande (remplacez l'email et le domaine) :
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email admin@mon-app-tournees.com \
    -d mon-app-tournees.com \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal" certbot
```

### 3- Lancer les services
Une fois le certificat acquis :

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Nginx chargera automatiquement la configuration sécurisée utilisant les certificats dans `./nginx/data/certbot/conf`.

## Renouvellement
Le service `certbot` tourne en fond et vérifie le renouvellement toutes les 12h.
Le rafraîchissement est automatique.

## Maintenance et Sauvegardes

### Sauvegarde Automatique de la Base de Données
Le script `scripts/backup_db.sh` est fourni pour effectuer un dump de la base de données.

1.  Rendre le script exécutable :
    ```bash
    chmod +x scripts/backup_db.sh
    ```
2.  Tester le script manuellement :
    ```bash
    ./scripts/backup_db.sh
    ```
    *(Vérifiez que le nom du conteneur dans le script correspond bien à celui de `docker ps`, ex: `antigravity-postgres-1`)*

3.  Configurer une tâche planifiée (CRON) pour une sauvegarde toutes les nuits à 3h du matin :
    ```bash
    crontab -e
    ```
    Ajoutez la ligne suivante (adaptez le chemin) :
    ```bash
    0 3 * * * /root/Antigravity/scripts/backup_db.sh >> /var/log/db_backup.log 2>&1
    ```

Les sauvegardes seront stockées dans `./backups` et les fichiers de plus de 7 jours seront supprimés automatiquement.
