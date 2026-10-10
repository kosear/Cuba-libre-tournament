#!/usr/bin/env bash
# Replace the dev database with a fresh copy of prod. Run as root on the VPS:
#   bash /srv/cubalibre/dev/deploy/copy-prod-to-dev.sh
set -euo pipefail
PROD=/srv/cubalibre/prod/data/app.db
DEV=/srv/cubalibre/dev/data/app.db
systemctl stop cubalibre@dev
rm -f "$DEV" "$DEV-wal" "$DEV-shm"
sqlite3 "$PROD" ".backup '$DEV'"
chown cubalibre:cubalibre "$DEV"
systemctl start cubalibre@dev
echo "dev database replaced with a copy of prod"
