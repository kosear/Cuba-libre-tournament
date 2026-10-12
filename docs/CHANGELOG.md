# Significant changes

Newest on top. What to write and when: section 5 of `CLAUDE.md`.

## 2026-10-12 — Group decider only when it matters; the play-off to come in the queue

- Each group in the state has a new field `lastMatters`: `true`/`false` when one match is left (does any outcome of it change who
  of the group can go through, their order, wins or balls), `null` otherwise. The TV calls the last match a GROUP DECIDER only
  when it is `true` (before: always).
- The state has a new list `upcoming` during the group stage: sf1, sf2, third, final as they will follow the queue, with
  `{ name, placeholder: true }` where the participant is not certain yet. Empty once the bracket exists.
- Rules of play and replay are unchanged; old archived states simply have no `lastMatters` / `upcoming`.

## 2026-10-12 — Skip: a group match can be cancelled

- New actions `match.skip` { id } and `match.unskip` { id }. Only group matches. A skipped match leaves the queue
  and counts as nothing for both players: no win, no balls, no frame; it is left out of the average balls for withdrawn
  players. The group is over without it (`isGroupDone` now treats skipped matches as done). Unskip puts it at the end of the queue.
- A match has a new field `skipped` (false by default). A result entered for a skipped match clears it; a withdrawal
  turns it into a walkover as before, and a restore puts it back to skipped.
- State to the TV/admin: `matchView` has `skipped`; group `cross` cells may be `{ skipped: true }`; group `played`
  counts skipped matches; the snapshot has a new list `skipped` (for the admin to bring them back).
- Old tournaments replay exactly as before: they have no skip actions.

## 2026-10-11

- New table `settings` (migration `004_settings.sql`, additive) for screen settings switched from the admin page.
  The TV state (`/api/state`) and the admin state get a new field `settings: { lizards }`: «lots of geckos», gecko and
  butterfly as often as `?lizard=fast` on every screen. Set with `POST /api/admin/settings { lizards: true|false }`.
  Tournament data and old archived states are not affected; old archive records simply have no `settings`.
- New action `groups.setup` `{ groups: [{ id, name, players: [{ id, name }] }] }` (setup phase only): the admin's quick
  setup now adds all groups and their players in one action, so it is one journal entry and one undo. It is all or
  nothing: a repeated name or a bad id rejects the whole setup. The shuffle stays on the admin page, the payload holds
  the final groups, so replay is exact. Before, quick setup sent one `group.add` per group and one `player.add` per
  player; old tournaments replay unchanged. The admin journal's name lookup reads names from `groups.setup` too.
- Apart from `settings` above, the TV state shape is unchanged.

## 2026-10-10

- `player.replace` with `withId` now swaps the two players between their groups: the games of both in their old groups
  are deleted (for the opponents too), each joins the other group like a late player. Refused if either has withdrawn.
  Before this change `withId` removed the replaced player; only dev tournaments used that form.
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
