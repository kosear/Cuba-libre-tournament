# Bugs

Found while testing. Newest on top. When a bug is fixed, move it to «Fixed» with the date and a short note.

## Open

(none)

## Fixed

### 2026-10-10: splash logo is centered by its picture, not by the bar name
The logo was centered by its whole drawing, the figure's legs pulled the name up.
Now the «CUBA LIBRE» letters (38% of the logo height, `LOGO_TEXT_Y` in `public/board/splash.js`) sit at the screen centre,
the logo moved 64 px down.

### 2026-10-10: new player does not appear right away
In `public/admin/app.js` the add-player form called `render()` before the outbox was composed into the shown state,
so it drew the old state; then focus went back to the name input and every later render was deferred while typing.
The player showed up only after the input lost focus. Fix: call `refresh()` (compose + render) instead.
