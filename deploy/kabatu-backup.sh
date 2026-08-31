##!/usr/bin/env bash
#
# Kabatu Farm — daily PocketBase backup to Google Drive
#
# One-time setup on the VPS:
#   1. sudo apt install sqlite3 rclone           # (or dnf, depending on distro)
#   2. rclone config
#        - name the remote:      gdrive
#        - type:                 drive
#        - follow the OAuth flow (opens a browser link you complete locally,
#          then paste the verification code back into the VPS terminal)
#   3. chmod +x kabatu-backup.sh
#   4. Install kabatu-backup.service + kabatu-backup.timer (see deploy/),
#      or add a cron line — either works, timer is just more observable.
#
# What it does:
#   - Takes a consistent snapshot of PocketBase's SQLite files (safe to run
#     live — sqlite3 .backup handles WAL correctly, no need to stop the service)
#   - Bundles that snapshot with pb_data/storage (uploaded files/photos)
#   - Uploads the dated archive to Google Drive
#   - Prunes local backups older than 7 days and Drive backups older than 90 days
#
# PATH FIX (this update): PB_DATA_DIR/LOCAL_BACKUP_DIR previously pointed at
# /home/pocketbase/kabatu-farm/pb_data — a non-Docker, systemd-era layout that
# predates the Docker Compose deployment model. docker-compose.yml bind-mounts
# ./pb_data relative to the repo root (confirmed against .gitignore's
# repo-root-relative /pb_data/ and /backups/ entries, and against the Sync
# script's hardcoded /home/Docker/kabatu-farm/ path), so this script was very
# likely backing up nothing since that move. Corrected below to match.
# NOT YET LIVE-VERIFIED against the actual VPS — run this manually once and
# confirm a real archive lands in $LOCAL_BACKUP_DIR and on Drive before
# trusting the timer.

set -euo pipefail

PB_DATA_DIR="/home/Docker/kabatu-farm/pb_data"
LOCAL_BACKUP_DIR="/home/Docker/kabatu-farm/backups"
GDRIVE_REMOTE="gdrive:KabatuFarm/pocketbase-backups"
LOCAL_RETENTION_DAYS=7
REMOTE_RETENTION_DAYS=90

timestamp="$(date +%Y-%m-%d_%H%M)"
work_dir="$(mktemp -d)"
archive_name="kabatu-pb-backup_${timestamp}.tar.gz"

cleanup() { rm -rf "$work_dir"; }
trap cleanup EXIT

echo "[$(date)] Starting backup..."
mkdir -p "$LOCAL_BACKUP_DIR"

if [ ! -d "$PB_DATA_DIR" ]; then
  echo "[$(date)] ERROR: PB_DATA_DIR ($PB_DATA_DIR) does not exist." >&2
  echo "[$(date)] Confirm the actual pb_data location on this host — e.g. via" >&2
  echo "[$(date)]   docker inspect kabatu-pocketbase --format '{{ range .Mounts }}{{ .Source }} -> {{ .Destination }}{{println}}{{ end }}'" >&2
  exit 1
fi

# 1. Consistent snapshot of every SQLite database PocketBase maintains.
mkdir -p "$work_dir/pb_data"
shopt -s nullglob
db_files=("$PB_DATA_DIR"/*.db)
shopt -u nullglob
if [ ${#db_files[@]} -eq 0 ]; then
  echo "[$(date)] ERROR: No .db files found under $PB_DATA_DIR — refusing to write an empty backup." >&2
  exit 1
fi
for db in "${db_files[@]}"; do
  db_name="$(basename "$db")"
  sqlite3 "$db" ".backup '$work_dir/pb_data/$db_name'"
done

# 2. Copy uploaded files (animal photos, receipts, soil test PDFs, etc.)
if [ -d "$PB_DATA_DIR/storage" ]; then
  cp -r "$PB_DATA_DIR/storage" "$work_dir/pb_data/storage"
fi

# 3. Bundle it up.
tar -czf "$LOCAL_BACKUP_DIR/$archive_name" -C "$work_dir" pb_data
echo "[$(date)] Local archive created: $LOCAL_BACKUP_DIR/$archive_name"

# 4. Ship to Google Drive.
rclone copy "$LOCAL_BACKUP_DIR/$archive_name" "$GDRIVE_REMOTE" --quiet
echo "[$(date)] Uploaded to $GDRIVE_REMOTE"

# 5. Rotate old backups, local and remote.
find "$LOCAL_BACKUP_DIR" -name "kabatu-pb-backup_*.tar.gz" -mtime "+$LOCAL_RETENTION_DAYS" -delete
rclone delete "$GDRIVE_REMOTE" --min-age "${REMOTE_RETENTION_DAYS}d" --quiet

echo "[$(date)] Backup complete."
