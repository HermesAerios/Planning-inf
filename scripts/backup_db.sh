#!/bin/bash
# Database Backup Script for Antigravity (Linux)

# Configuration
BACKUP_DIR="./backups"
CONTAINER_NAME="antigravity-postgres-1"
DB_USER="admin"  # As defined in your docker-compose
DB_NAME="labo_tournees" # As defined in your docker-compose
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Ensure directory exists
mkdir -p "$BACKUP_DIR"

echo "Using container name: $CONTAINER_NAME" # Ensure this matches your docker ps name

# Dump and gzip
echo "Starting backup to $FILENAME..."
docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME | gzip > "$FILENAME"

if [ $? -eq 0 ]; then
    echo "Backup successful: $FILENAME"
    # Rotate: Keep only last 7 days
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete
    echo "Old backups cleaned."
else
    echo "Backup failed!"
    exit 1
fi
