# Bugs

Found while testing. Newest on top. When a bug is fixed, move it to «Fixed» with the date and a short note.

## Open

Found by QA on 2026-10-10 (local copy: a rules fuzzer with ~40 000 random admin actions, plus browser runs of the admin
on a 360 px phone and the board at 1920×1080). Not fixed yet, waiting for the customer's decision.

### 2026-10-10: a manual play-off edit during the group stage switches the whole tournament to the play-off
Repro: 2 groups of 4, start, one result, then in «Play-off» set Semi-final 1 by hand (A1 vs B2).
`progress()` creates the bracket as soon as any slot is overridden, and `phase` becomes `playoff` while 11 group matches
are still in the queue. Effects: the TV stops showing the group slides; adding a late player, «Replace» and
«Send to another group» are refused (`wrong_phase`). Expected: the group stage goes on until the groups are done,
the hand-made pairing just waits.

### 2026-10-10: the same player can be put into both semi-finals by hand
Repro: `playoff.set` sf1 = A1 vs B2, then sf2 = A1 vs B1 — both accepted. After the semis the final is «A1 vs A1».
The same with a hand-made 3rd-place match: its players can later reach the final, and the podium shows one player twice.
`playoff.set` only checks that p1 ≠ p2 inside one slot. Expected: a player can be in only one semi-final;
the 3rd-place and final slots only take the semi-finals' losers/winners (or are checked against them).

### 2026-10-10: editing a group result after a semi-final was played can put a player into both semi-finals
Repro (fuzzer, 4 groups): groups done, Semi-final 1 played (P251 vs P247), then the admin corrects an earlier group
result. Qualification is recomputed, the played sf1 keeps its players, the unplayed sf2 gets new ones — and one of them
is P247 again. Then P247 plays both the final and the 3rd-place match and stands on the podium twice.
Expected: players of an already played semi-final are never placed into the other one (or the edit is refused / the
admin is warned that the bracket would change).

### 2026-10-10: TV group tables cut ordinary names and the leader's trophy
On the «Group stage» slide (4 groups) and on a single group slide, names like «Ivan Petrov 🏆», «Sergey Kim 🏆»,
«Maxim Orlov 🏆», «Budi Santoso 🏆» become «Ivan Petrov …», «Maxim Orlo…»: the 🏆 is eaten by the ellipsis.
Cause: fixed column widths in `table.std` (name 43 %) with the bigger fonts. Expected: the name and the trophy fit
(a smaller font for long names, or the trophy outside the cut part).

## Questions for the customer (not bugs)

- **BYE players on the TV.** After a quick setup the BYE fillers stay in the group tables as struck-out rows
  («BYE», 3 frames). Show them, or hide BYE rows on the TV?
- **BYE and fairness.** A walkover against a BYE gives a win plus the average balls (≈), like any withdrawal.
  Players of a group with a BYE get a free win; this matters when groups are compared with each other
  (3 groups: best second; 5+ groups: best winners). Keep it, or count BYE games differently?

## Fixed

### 2026-10-10: splash logo is centered by its picture, not by the bar name
The logo was centered by its whole drawing, the figure's legs pulled the name up.
Now the «CUBA LIBRE» letters (38% of the logo height, `LOGO_TEXT_Y` in `public/board/splash.js`) sit at the screen centre,
the logo moved 64 px down.

### 2026-10-10: new player does not appear right away
In `public/admin/app.js` the add-player form called `render()` before the outbox was composed into the shown state,
so it drew the old state; then focus went back to the name input and every later render was deferred while typing.
The player showed up only after the input lost focus. Fix: call `refresh()` (compose + render) instead.
