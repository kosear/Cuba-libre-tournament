# Bugs

Found while testing. Newest on top. When a bug is fixed, move it to «Fixed» with the date and a short note.

## Open

### Splash logo is centered by its picture, not by the bar name (2026-10-10)

Reported by the infra owner while testing.
- **What happens:** on the splash screen (`public/board/splash.js`, logo in the middle with rolling balls) the logo is
  centered by its whole drawing, including the woman's legs at the bottom, so the name looks too high.
- **Expected:** move the logo a little lower, so that the main name «Cuba Libre» sits in the visual center of the screen.
  The legs may go below the center.

### New player does not appear right away (2026-10-10)

Reported by the infra owner while testing on prod.
- **What happens:** after adding a new player in the admin panel, the player does not show up immediately.
  They appear only after some next action.
- **Expected:** the player shows up right after «Add», in the admin panel and on the TV.
- **Not yet clear:** whether it is the admin list, the TV, or both, and which action makes the player appear.

## Fixed

(none yet)
