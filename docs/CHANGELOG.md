# Significant changes

Newest on top. What to write and when: section 5 of `CLAUDE.md`.

## 2026-10-10

- DB backups on the server: hourly, daily and before every deploy (`deploy/backup.sh`, infra only).
- Tournament archive started on the server: every state from SSE goes to `/var/lib/cubalibre-archive/` (infra only,
  no app changes). Dev archive starts mid-tournament, at the rules of commit `55fd600`.
