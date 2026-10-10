# Cuba Libre — billiards tournament: bar TV screen + admin panel

You are picking up a vibe-coded project. Read this file fully, then the docs it points to, before touching code.

## 1. Read first

| File | What it is |
|---|---|
| `docs/requirements.md` | Product requirements and tournament rules. **Source of truth for what to build.** |
| `docs/open-questions.md` | Undecided questions. Do not implement around them, ask. |
| `docs/mockups/` | Approved mockups: PNG screenshots + HTML/CSS sources in `src/` (`tv.css`, `admin.css`, `data.js`). Reuse the CSS when building real pages. |
| `docs/assets/` | Bar logo, SVG and PNG. |
| `docs/infrastructure.md` | Server, DNS, systemd, deploy internals. You rarely need it. |

**Working rule from the customer** (section «Как мы работаем» in `docs/requirements.md`): discuss and agree on a plan first,
write code only after the customer explicitly says to start. New features go into the requirements first.

## 2. Current state (2026-10-10)

- Infrastructure is done: server, HTTPS setup, prod/dev environments, auto-deploy.
- Admin login is done: two accounts with their own login and password, 30-day sessions. See section 6.
- The live update channel is done: SSE from server to TV and admin pages.
- The application is a **skeleton only**. The `messages` table, its routes and the TV/admin pages are a placeholder
  that demonstrates the full cycle: admin form → API → DB → SSE → TV. Replace it with the real domain.
  Drop the table with a new migration, do not edit `001_init.sql`.
- No tournament logic exists yet.

## 3. Stack

Node 22, Express 4, SQLite via better-sqlite3 (synchronous API), Server-Sent Events, ES modules.
Frontend: plain HTML/CSS/JS, **no build step, no framework**. Do not add a bundler.
New npm dependencies are fine (installed automatically on deploy), but avoid native modules other than better-sqlite3.

## 4. Environments and deploy

| Branch | URL | Purpose |
|---|---|---|
| `dev`  | https://dev.cubalibre.su | testing, push here freely |
| `main` | https://cubalibre.su     | **the TV in the bar shows this** |

**Deploy = `git push`.** The server polls GitHub every 15 s, pulls the branch, runs `npm ci` if
`package.json` or `package-lock.json` changed, and restarts the app. New migrations apply on startup.

Flow: commit to `dev` → wait about 20 s → check dev.cubalibre.su → fast-forward `main` to `dev` → push `main`.
Never push untested code straight to `main`.

**Verify a deploy:** `curl -s https://dev.cubalibre.su/api/health` returns `{"ok":true,"commit":"<short sha>",...}`.
If `commit` matches your last commit, it is live.

**You have no access to the server.** Consequences:
- If dev returns 502 after your push, the app crashed on startup: syntax error, bad migration, missing module.
  Reproduce locally with `npm run dev`. Server logs are available only through the infra owner (section 9).
- Each environment has its own `.env` and `data/app.db` on the server. You cannot read prod data.
- Files in `deploy/` are NOT applied by auto-deploy. If you change them, ask the infra owner to re-run `deploy/setup.sh`.

## 5. Before every push

Local setup, once:
```
npm install
cp .env.example .env
npm run admin -- add test test123
npm run dev        # http://localhost:3000, admin at http://localhost:3000/admin
```
On Windows, `better-sqlite3` may fail to install if no prebuilt binary matches your Node version.
Use Node 22 LTS, or WSL.

Checklist:
1. `node --check` on every changed `.js` file in `src/`.
2. `npm run dev`, open http://localhost:3000 and http://localhost:3000/admin, click through what you changed.
3. Check that the TV updates live: change something in admin with the TV page open in another tab.
4. If you added a migration, delete your local `data/app.db` once and start again, so all migrations apply from zero.
5. If the change is significant, add an entry to `docs/CHANGELOG.md` (see below).

### `docs/CHANGELOG.md`: log of significant changes

Write an entry, newest on top, when a change affects how the system behaves or stores data:
tournament rules or the engine in `src/domain/`, action types or their payload, the state shape sent to the TV
(`/api/state`, SSE), the DB schema, the API, or anything that changes how past tournaments replay.
Small UI tweaks, texts and translations do not need an entry.

Entry format: date, then in short — what changed, why, and whether old tournaments or old archived states
read differently now. The commit hash is in git, no need to copy it.
Why: the infra owner archives every tournament state from the SSE stream (`docs/infrastructure.md`, «Архив турниров»);
this file explains the archive when its format changes.

## 6. Architecture and conventions

```
src/server.js          app setup, mounts routes, static files
src/db.js              SQLite connection + migration runner
src/events.js          SSE hub: sseHandler, broadcast(type, payload)
src/auth.js            admin login: password hashing, sessions, /api/auth/*, requireAdminApi, requireAdminPage
src/routes/public.js   GET /api/state and getState(): everything the TV needs, one snapshot
src/routes/admin.js    POST/PUT/DELETE under /api/admin/*, login required
scripts/admin.js       CLI to add / remove admins and change passwords
migrations/NNN_*.sql   schema, applied once in filename order at startup
src/domain/            tournament rules engine: state is rebuilt from the action log (pure functions, tested);
                       also served at /domain, the admin page runs it to apply offline actions locally
src/tournament.js      action log storage: current tournament, undo/redo, journal
test/                  `npm test`: rules engine tests (node:test)
public/start/          served at /        (start screen: Scoreboard or Admin panel, public)
public/board/          served at /board   (TV scoreboard, public)
public/admin/          served at /admin   (admin page, login required; login.html/login.js/style.css/sw.js are public)
public/shared/         served at /shared  (live.js: SSE, auto-reload after a deploy, reconnect when pings stop)
public/assets/         served at /assets  (bar logo)
deploy/                Caddyfile, systemd units, setup and sync scripts
```

**Real-time pattern (keep it):**
- `getState()` builds the full state the TV needs.
- Every mutation in `admin.js`: validate → write DB (use `db.transaction` for multi-step writes) → `broadcast('state', getState())`.
- TV and admin subscribe to `/api/events`, fetch `/api/state` on every (re)connect, re-render on each `state` event.
- One bar, a handful of screens: always send the full snapshot, no diffs.

If the app grows, split `admin.js` into one router per entity under `src/routes/` and keep the same pattern.

**Auth:** each admin has their own login and password (table `admins`). Logging in at `/admin/login.html`
creates a row in `sessions` and an HttpOnly cookie valid for 30 days, so admins on phones stay logged in.
- New admin API routes go into `src/routes/admin.js` (or another router mounted behind `requireAdminApi`), never on the public router.
  Inside a handler, `req.admin` is `{ id, username }`, useful for an action log.
- New admin pages go into `public/admin/`; they are protected automatically. Only files listed in `PUBLIC_ADMIN_FILES` in `src/auth.js` are public.
- In admin page JS use the `api()` helper from `public/admin/app.js`: on 401 it sends the user back to the login page.
- Tournament changes from the admin page go through `act()`: it checks the action with the local engine, shows it at once,
  keeps it in the outbox (localStorage) and sends it when there is a connection. Each action carries `base`
  (the last log id the page knew); the server rejects it with `conflict` when the other admin changed the same thing
  after that (`actionKeys()` in `src/domain/engine.js`). Undo, redo and «New tournament» work only online with an empty outbox.
- No roles: all admins can do everything. No self-registration. Accounts are managed by the infra owner, see «Admins» below.

### Admins

Two admin accounts exist on each environment (prod and dev have separate databases, so separate accounts).
Managed only from the command line on the server by the infra owner:
```
cd /srv/cubalibre/prod     # or /srv/cubalibre/dev
runuser -u cubalibre -- node scripts/admin.js list
runuser -u cubalibre -- node scripts/admin.js add <login> <password>
runuser -u cubalibre -- node scripts/admin.js passwd <login> <new-password>   # also logs that admin out everywhere
runuser -u cubalibre -- node scripts/admin.js remove <login>
```
Locally: `npm run admin -- add <login> <password>`.

**TV page:** 16:9, viewed from several meters: big type, high contrast, no scrolling, no interaction.
It runs unattended for hours: handle reconnects, never show raw errors.

## 7. Database and migrations — rules (prod data depends on this)

- Schema changes only via a new file `migrations/00N_short_name.sql`. Numbers only grow.
- **Never edit or delete a migration that has been pushed to `dev`.** It may already be applied. Fix mistakes with a new migration.
- Each migration runs in a transaction. A failing migration stops the app, which means 502. Test locally first.
- Prefer additive changes. Dropping or rewriting tables that hold prod data needs an explicit decision from the customer.
- `foreign_keys` is ON. Store timestamps in UTC (`datetime('now')`), format them for display in the browser.

## 8. Known gaps (worth solving early)

- ~~The TV keeps old frontend code after a deploy.~~ Solved: SSE sends `hello` with the commit, `public/shared/live.js`
  reloads the page when it changes; static files are served with `Cache-Control: no-cache`.
- ~~No automated DB backups.~~ Done on the infra side: hourly, daily and before every deploy, see `docs/infrastructure.md`.

## 9. People

- **Customer / requirements:** owner of this GitHub repo. Requirements and decisions come from them, via `docs/`.
- **Infra owner:** GitHub `tarefev`. Server, domain, deploy, server logs, admin accounts.
  Ask them for anything from section 4 you cannot do yourself.

## 10. Languages

Per requirements: the TV is English only. The admin panel is multilingual with a switcher, see «Языки» in `docs/requirements.md`.
Code, comments and identifiers in English.
