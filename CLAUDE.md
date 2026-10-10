# Cuba Libre — billiards tournament: bar TV screen + admin panel

Product requirements and mockups: `docs/requirements.md`, `docs/mockups/`. Open questions: `docs/open-questions.md`.

Stack: Node 22 + Express + SQLite (better-sqlite3) + Server-Sent Events. Plain JS frontend, no build step.

## Environments and deploy

| Branch | URL | Server dir | Port |
|---|---|---|---|
| `dev`  | https://dev.cubalibre.su | /srv/cubalibre/dev  | 3001 |
| `main` | https://cubalibre.su     | /srv/cubalibre/prod | 3000 |

**Deploy = `git push`.** The server checks GitHub every 15 seconds; a new commit on a branch is pulled,
`npm ci` runs if dependencies changed, and the app restarts. No ssh, no manual steps.

Workflow: commit to `dev` → check on dev.cubalibre.su → merge `dev` into `main` → live on cubalibre.su.
Never push untested changes straight to `main`: the bar TV shows `main`.

Each environment has its own `.env` and its own database (`data/app.db`), both outside git.
Copy prod data to dev (as root on the VPS): `bash /srv/cubalibre/dev/deploy/copy-prod-to-dev.sh`.

Changes in `deploy/` (Caddyfile, systemd units) are NOT applied by auto-sync;
re-run `deploy/setup.sh` as root on the server.

## Layout
- `src/server.js` — Express app, routes mounting, static.
- `src/db.js` — SQLite connection + migrations runner.
- `src/events.js` — SSE hub: `sseHandler`, `broadcast(type, payload)`.
- `src/auth.js` — Basic auth for `/admin` and `/api/admin/*` (user `admin`, password `ADMIN_PASSWORD` in `.env`).
- `src/routes/public.js` — read-only API for the TV + `getState()` (full snapshot).
- `src/routes/admin.js` — mutations. Pattern: write DB → `broadcast('state', getState())`.
- `migrations/NNN_name.sql` — applied once in filename order at startup.
- `public/tv/` — served at `/`. Fullscreen 16:9 TV page, no interaction, re-renders on SSE `state` event.
- `public/admin/` — served at `/admin`. Mobile-first, calls `/api/admin/*`.
- `deploy/` — Caddyfile, systemd units, setup and sync scripts.

The `messages` table and routes are a placeholder example of the full cycle; replace them with the real domain.

## How to add a feature
1. New table/columns → new file `migrations/00N_*.sql`.
2. Add fields to `getState()` in `src/routes/public.js`.
3. Add mutation route in `src/routes/admin.js`, end with `broadcast('state', getState())`.
4. Render in `public/tv/app.js` (`render(state)`), add controls in `public/admin/app.js`.

## Migrations — rules (prod data depends on this)
- A migration runs on dev first, then the same file runs on prod after merge.
- **Never edit or delete a migration that is already merged into `dev`.** Fix mistakes with a new migration.
- Never renumber files. Numbers only grow.
- Prefer additive changes (new tables/columns). Destructive changes need an explicit decision.

## Local run
```
npm install
cp .env.example .env
npm run dev   # http://localhost:3000, admin at /admin
```

## Debug on the server
- `journalctl -u cubalibre@dev -f` — app logs (syntax errors show up here).
- `journalctl -u cubalibre-sync@dev -f` — deploy log.
- `curl -s https://dev.cubalibre.su/api/health`

## Rules
- Keep the TV page readable from 5 meters: large fonts, high contrast, no scrolling.
- Secrets only in `.env`, never in code.
