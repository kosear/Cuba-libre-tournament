#!/usr/bin/env bash
# Auto-deploy: bring /srv/cubalibre/<env> to the tip of its branch.
# Runs as root every 15 s via cubalibre-sync@<env>.timer.
# GitHub is the source of truth: local edits on the server are discarded.
# .env and data/ are gitignored and never touched.
# Wrapped in main() so bash parses the whole file before git rewrites it.
set -euo pipefail

main() {
  local env="$1" dir="/srv/cubalibre/$1" branch
  case "$env" in
    prod) branch=main ;;
    dev)  branch=dev ;;
    *) echo "unknown env $env" >&2; exit 1 ;;
  esac

  cd "$dir"
  as_app git fetch -q origin "$branch"
  local old new
  old=$(as_app git rev-parse HEAD)
  new=$(as_app git rev-parse "origin/$branch")
  [ "$old" = "$new" ] && exit 0

  echo "[$env] $old -> $new"
  as_app git reset -q --hard "$new"

  if ! as_app git diff --quiet "$old" "$new" -- package.json package-lock.json; then
    echo "[$env] dependencies changed, npm ci"
    as_app npm ci --omit=dev --no-audit --no-fund
  fi

  systemctl restart "cubalibre@$env"
  echo "[$env] deployed $(as_app git log -1 --format='%h %s')"
  exit 0
}

as_app() { runuser -u cubalibre -- "$@"; }

main "$@"
