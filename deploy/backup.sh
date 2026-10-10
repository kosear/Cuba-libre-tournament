#!/usr/bin/env bash
# Database backup for one environment: /srv/cubalibre/<env>/data/app.db -> /var/lib/cubalibre-backup/<env>/.
#   backup.sh <env>            hourly copy (keep 48), plus the first copy of each day as daily (keep 30)
#   backup.sh <env> predeploy  copy before a deploy, called by sync.sh (keep 20)
# Files are plain SQLite databases, gzipped: hourly/app-2026-10-10_1400.db.gz. `.backup` gives a consistent copy
# of a live WAL database. Restore: stop cubalibre@<env>, gunzip over data/app.db (owner cubalibre), start.
# Installed by setup.sh to /usr/local/lib/cubalibre/, runs as cubalibre (cubalibre-backup@<env>.timer).
set -euo pipefail

env=$1 kind=${2:-hourly}
db=/srv/cubalibre/$env/data/app.db
dir=/var/lib/cubalibre-backup/$env
[ -f "$db" ] || { echo "[backup] $env: no $db, skipped"; exit 0; }

keep() { # keep <subdir> <n>: delete all but the newest n files
  ls -1t "$dir/$1"/*.db.gz 2>/dev/null | tail -n +"$(($2 + 1))" | xargs -r rm -f
}

stamp=$(date -u +%Y-%m-%d_%H%M)
mkdir -p "$dir/$kind"
tmp=$(mktemp "$dir/.app.XXXXXX")
trap 'rm -f "$tmp" "$tmp.gz"' EXIT
sqlite3 "$db" ".backup '$tmp'"
gzip -9 "$tmp"
out="$dir/$kind/app-$stamp.db.gz"
mv "$tmp.gz" "$out"

case "$kind" in
  hourly)
    keep hourly 48
    mkdir -p "$dir/daily"
    if ! ls "$dir/daily/app-${stamp%_*}"_*.db.gz >/dev/null 2>&1; then
      cp "$out" "$dir/daily/"
      keep daily 30
    fi ;;
  predeploy) keep predeploy 20 ;;
  *) echo "unknown kind $kind" >&2; exit 1 ;;
esac
echo "[backup] $env: $out ($(stat -c %s "$out") bytes)"
