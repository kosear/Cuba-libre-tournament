#!/usr/bin/env bash
# One-time (idempotent) server setup. Run as root on the VPS:
#   curl -fsSL https://raw.githubusercontent.com/kosear/Cuba-libre-tournament/main/deploy/setup.sh | bash
# Re-run after changing anything in deploy/ (Caddyfile, systemd units).
# Requires: node 22, git, caddy (apt).
set -euo pipefail

REPO=https://github.com/kosear/Cuba-libre-tournament.git
ROOT=/srv/cubalibre

id cubalibre >/dev/null 2>&1 || useradd --system --create-home --home-dir "$ROOT" --shell /usr/sbin/nologin cubalibre
mkdir -p "$ROOT" && chown cubalibre:cubalibre "$ROOT"

setup_env() {
  local env=$1 branch=$2 port=$3 dir="$ROOT/$1"
  if [ ! -d "$dir/.git" ]; then
    runuser -u cubalibre -- git clone -q -b "$branch" "$REPO" "$dir"
  fi
  if [ ! -f "$dir/.env" ]; then
    sed -e "s/^PORT=.*/PORT=$port/" "$dir/.env.example" > "$dir/.env"
    chown cubalibre:cubalibre "$dir/.env"; chmod 600 "$dir/.env"
    echo "[$env] created .env. Add admins: cd $dir && runuser -u cubalibre -- node scripts/admin.js add <login> <password>"
  fi
  (cd "$dir" && runuser -u cubalibre -- npm ci --omit=dev --no-audit --no-fund >/dev/null)
}

setup_env prod main 3000
setup_env dev  dev  3001

cp "$ROOT/prod/deploy/cubalibre@.service" "$ROOT/prod/deploy/cubalibre-sync@.service" \
   "$ROOT/prod/deploy/cubalibre-sync@.timer" "$ROOT/prod/deploy/cubalibre-archive@.service" \
   "$ROOT/prod/deploy/cubalibre-backup@.service" "$ROOT/prod/deploy/cubalibre-backup@.timer" /etc/systemd/system/
install -D -m 755 "$ROOT/prod/deploy/archive.py" /usr/local/lib/cubalibre/archive.py
install -D -m 755 "$ROOT/prod/deploy/backup.sh" /usr/local/lib/cubalibre/backup.sh
install -d -o cubalibre -g cubalibre -m 700 /var/lib/cubalibre-backup/prod /var/lib/cubalibre-backup/dev
cp "$ROOT/prod/deploy/Caddyfile" /etc/caddy/Caddyfile
systemctl daemon-reload

for env in prod dev; do
  systemctl enable -q --now "cubalibre@$env" "cubalibre-sync@$env.timer" "cubalibre-archive@$env" "cubalibre-backup@$env.timer"
  systemctl restart "cubalibre@$env" "cubalibre-archive@$env"
done
systemctl reload caddy

echo "done. logs: journalctl -u cubalibre@prod -f | journalctl -u cubalibre-sync@dev -f"
