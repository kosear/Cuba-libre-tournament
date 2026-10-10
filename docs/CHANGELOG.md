# Significant changes

Newest on top. What to write and when: section 5 of `CLAUDE.md`.

## 2026-10-10

- New action `player.replace` `{ id, newId, name }` or `{ id, withId }` (group stage only): the replaced player and all
  their group and tie-break games are deleted, for the opponents too; the substitute (a new player, or `withId` moved
  from another group) gets matches with everyone, queued like a late player. The replaced player is gone from the state.
- `player.move` now also works during the group stage: the player's games in the old group are deleted, then they join
  the new group like a late player. Before the start it only changes the group, as before.
  Both actions carry a random `seed` (queue positions). Old tournaments replay unchanged: neither action existed in them
  in this form (`player.move` was rejected after the start).
- TV state (`/api/state`) shape is unchanged.
- DB backups on the server: hourly, daily and before every deploy (`deploy/backup.sh`, infra only).
- Tournament archive started on the server: every state from SSE goes to `/var/lib/cubalibre-archive/` (infra only,
  no app changes). Dev archive starts mid-tournament, at the rules of commit `55fd600`.
