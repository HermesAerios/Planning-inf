# Database Backup Script for Antigravity
# Usage: ./backup_db.ps1

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$container = "antigravity-postgres-1"
$db_user = "user"
$db_name = "antigravity"
$backup_dir = "./backups"

# Ensure backup directory exists
if (!(Test-Path -Path $backup_dir)) {
    New-Item -ItemType Directory -Force -Path $backup_dir
}

$filename = "$backup_dir/backup_$timestamp.sql.gz"

Write-Host "Starting backup for $db_name from container $container..."

# Execute dump inside container and pipe to gzip
docker exec -t $container pg_dump -U $db_user $db_name | gzip > $filename

if ($?) {
    Write-Host "Backup successful: $filename"
} else {
    Write-Host "Backup failed!"
}

# Optional: Cleanup old backups (keep last 7 days)
# Get-ChildItem $backup_dir -Filter "*.sql.gz" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item
