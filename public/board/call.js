// «Now playing» call screen, fight-night style (designed in /lab/): who goes to the table right now.
// Red corner left, blue corner right, a random background pattern, two random mascots, the names punch in
// from opposite sides, VS slams down, then an idle motion. Important matches: two caution tapes run across the screen
// saying why the match matters (FINAL, TIE-BREAK…). (Shock waves and a harder slam were tried: too heavy for the TV.)
// Light for a TV browser: transforms and opacity only, few and small layers (big or many layers made the TV lag and flicker).

const PATTERNS = [
  'halftone', 'chevron', 'checker', 'felt', 'sunburst', 'stripes',
  'dots', 'crosshatch', 'zigzag', 'argyle', 'grid', 'plaid', 'triangles',
];
const IDLES = ['drift', 'sway', 'heartbeat', 'stare-down', 'adrenaline'];

// There is no pug emoji: a pug face drawn in the style of the Noto emoji (the TV's), used as a body.
const PUG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 10 120 120" width="1em" height="1em" style="display:block"><path d="M64 26 C40 26 22 34 18 52 C14 68 12 90 22 104 C32 118 50 122 64 122 C78 122 96 118 106 104 C116 90 114 68 110 52 C106 34 88 26 64 26z" fill="#e2b77b"/><path d="M18 80 C16 96 24 110 40 117 C30 106 24 94 22 78z M110 80 C112 96 104 110 88 117 C98 106 104 94 106 78z" fill="#cf9f63"/><path d="M64 26 C42 26 26 34 21 50 C32 41 47 37 64 37 C81 37 96 41 107 50 C102 34 86 26 64 26z" fill="#efcc94"/><path d="M22 34 C24 24 36 20 44 26 C40 34 34 44 26 50 C20 46 20 40 22 34z" fill="#2f2622"/><path d="M106 34 C104 24 92 20 84 26 C88 34 94 44 102 50 C108 46 108 40 106 34z" fill="#2f2622"/><path d="M28 34 C32 28 38 27 41 29 C37 35 33 40 29 43z" fill="#4a3d36"/><path d="M100 34 C96 28 90 27 87 29 C91 35 95 40 99 43z" fill="#4a3d36"/><path d="M44 46 Q54 40 64 44 Q74 40 84 46" fill="none" stroke="#a8773f" stroke-width="3.2" stroke-linecap="round"/><path d="M50 54 Q57 50 64 53 Q71 50 78 54" fill="none" stroke="#a8773f" stroke-width="3" stroke-linecap="round"/><path d="M30 70 C30 58 40 54 48 58 C54 61 58 66 64 66 C70 66 74 61 80 58 C88 54 98 58 98 70 C98 82 96 96 88 104 C80 112 48 112 40 104 C32 96 30 82 30 70z" fill="#3e322c"/><ellipse cx="45" cy="70" rx="11" ry="11" fill="#f3ead9"/><ellipse cx="83" cy="70" rx="11" ry="11" fill="#f3ead9"/><circle cx="45.5" cy="70.5" r="9.6" fill="#1a1411"/><circle cx="82.5" cy="70.5" r="9.6" fill="#1a1411"/><circle cx="42" cy="66.5" r="3.4" fill="#fff"/><circle cx="79" cy="66.5" r="3.4" fill="#fff"/><path d="M48 82 C54 76 74 76 80 82 C74 80 54 80 48 82z" fill="#2a211d" stroke="#2a211d" stroke-width="4" stroke-linejoin="round"/><path d="M54 88 C54 83 74 83 74 88 C74 93 69 96 64 96 C59 96 54 93 54 88z" fill="#15100e"/><ellipse cx="59.5" cy="87.5" rx="2.6" ry="1.6" fill="#4d3f38"/><path d="M64 96 L64 101" stroke="#15100e" stroke-width="2.6" stroke-linecap="round"/><path d="M64 101 C58 108 46 108 42 100" fill="none" stroke="#15100e" stroke-width="2.6" stroke-linecap="round"/><path d="M64 101 C70 108 82 108 86 100" fill="none" stroke="#15100e" stroke-width="2.6" stroke-linecap="round"/><path d="M59 104 C59 113 69 113 69 104 C66 106 62 106 59 104z" fill="#e8657e"/><path d="M64 106 L64 110" stroke="#c44a63" stroke-width="1.4" stroke-linecap="round"/></svg>`;

// [body, hat, prop, name]; a body starting with «<» is an inline SVG; a hat is centred over the emoji, or [hat, dx, dy, deg] (em) for animals drawn side-on,
// whose head is not in the middle (checked against the Noto emoji the TV uses)
const MASCOTS = [
  // nicknames with a joke, like a boxer's
  ['🦈', ['🕶️', -0.33, 0.28, -18], '🎱', 'The Loan Shark'], ['🦥', '', '☕', 'Slow Hand'], ['🐸', '', '🍺', 'Hoppy Hour'],
  ['🦦', '', '🍹', 'Otterly Wasted'], ['🦙', ['🕶️', -0.66, 0.34, -12], '', 'No Prob-llama'], ['🐻‍❄️', '', '🧊', 'Ice Cold'],
  ['🦁', '', '❤️', 'Lionheart'], ['🦖', '', '🥊', 'Tiny Arms, Big Breaks'], ['🦆', '', '🎯', 'Sitting Duck'],
  ['🐓', '', '🥊', 'Cocky Rooster'], ['🦝', '🎩', '💰', 'The Bandit'], ['🐷', '', '💸', 'Piggy Bank'],
  ['🦍', ['👑', -0.45, 0.24, -12], '', 'Kong of the Table'], ['🦍', ['👓', -0.5, 0.62, -8], '🪄', 'Hairy Potter'],
  // Bali and around
  ['🦥', '', '⏰', 'Jam Karet'], ['🦎', '', '🌙', 'Tokek'], ['🦅', '', '🍔', 'Bald Eagle'],
  // more puns
  ['🐆', '', '🤞', 'Cheetah'], ['🦓', '', '🎱', 'Stripes'], ['🦭', '', '👍', 'Seal of Approval'],
  ['🐥', '', '🧲', 'Chick Magnet'], ['🐝', '', '🚫', 'Buzzkill'], ['🦒', '', '🏁', 'Neck and Neck'],
  ['🐘', '', '🛋️', 'Elephant in the Room'], ['🦉', ['🕶️', 0, 0.76, 0], '', 'Owl Be Back'], ['🐉', '', '🔥', 'Hot Shot'],
  ['🐧', ['🎩', -0.1, 0.02, -10], '🍸', 'The Tuxedo'], ['🐨', '', '🎱', 'Koala-ty Shot'], ['🐍', '', '🎲', 'Snake Eyes'],
  // a little flirty
  ['😼', '🎩', '💰', 'Fat Cat'], ['🐺', '🎩', '😉', 'Big Bad Wolf'], ['🐱', '🎀', '💋', 'Naughty Kitten'],
  // the old ones that still make you smile
  [PUG, ['🕶️', 0, 1.12, 0], '', 'Pug Life'], ['🐻', '', '🧸', 'Bear Hug'], ['🦜', '', '⚔️', 'Pirate Parrot'],
  ['🐵', '', '🍌', 'Cheeky Monkey'], ['🐙', '🎩', '🎱', 'Eight-Ball'], ['🐢', '', '🌺', 'Pelan Pelan'],
  ['🐞', '', '🍀', 'Lady Luck'], ['🥔', '🕶️', '📺', 'Couch Potato'], ['🦘', '', '🏄', 'Canggu Bro'],
  ['🐐', '', '🏆', 'The G.O.A.T.'], ['🦋', '', '🥂', 'Social Butterfly'], ['🐊', '', '🦷', 'Crikey!'],
  ['🦔', '', '👟', 'Gotta Go Fast'], ['🐋', '', '🎱', 'Killer Whale'], ['🐌', '', '✉️', 'Snail Mail'],
  ['🐰', '', '🎱', 'Bunny Hop'], ['🐗', '', '🃏', 'Wild Card'], ['🤖', '', '🍺', 'Bender'],
  ['👻', '🎩', '🎱', 'Ghost of the Table'], ['🍕', '', '🍍', 'Pineapple Pizza'], ['🍔', '👑', '🍟', 'Burger King'],
  ['🥑', '🧢', '', 'Avocado Bro'],
];
// pride squad: only for the regulars in LUCKY, never in the common pool
const PRIDE = [
  ['🦄', ['👑', -0.3, 0.18, -10], '🏳️‍🌈', 'Rainbow Unicorn'], ['🦩', ['🕶️', -0.26, 0.13, -10], '🏳️‍🌈', 'Pride Flamingo'], ['🦚', '', '🏳️‍🌈', 'Proud Peacock'],
  ['🐻', '🧢', '🏳️‍🌈', 'Pride Bear'], ['🐙', '🎩', '🏳️‍🌈', 'Fabulous Octopus'], ['🐂', ['🩰', -0.32, 0.25, -10], '🏳️‍🌈', 'Ballet Bull'],
];

const CSS = `
.fight { position: absolute; inset: 0; overflow: hidden; background: #0b0d14; color: #fff; }
.fight .ring { position: absolute; inset: -60px; will-change: transform; } /* bigger than the stage: shaking never shows the edges */
.fight .corner { position: absolute; inset: 0; }
/* everything but the two halves: one group, so the way out fades it as a single layer */
.fight .stuff { position: absolute; inset: 0; }
.fight.leaving .rays, .fight.leaving .rays svg { animation-play-state: paused; } /* frozen on the way out */
.fight .red { background: linear-gradient(115deg, #7a0016 0%, #c8102e 49%, transparent 49.1%); }
.fight .blue { background: linear-gradient(115deg, transparent 50.9%, #1d4fbf 51%, #0a1f5c 100%); }
/* the band between the corners: solid Honda Monkey orange, above the background pattern */
.fight .gap { position: absolute; inset: 0; z-index: 1; background: linear-gradient(115deg, transparent 49%, #f47b20 49.1%, #f47b20 50.9%, transparent 51%); }
/* anime speed lines: 12 SVG triangles in ONE layer just a bit bigger than the stage (2112×1188, centred), so the TV's
   graphics chip keeps a single small texture. The fan sways ±1.5° (never a full turn: the rays' ends stay off screen)
   and jitters in small jerks. Only transforms change, nothing is repainted. */
.fight .rays { position: absolute; left: -36px; top: 6px; width: 2112px; height: 1188px; z-index: 1; pointer-events: none;
  will-change: transform; animation: rays-sway 8s ease-in-out infinite alternate; }
@keyframes rays-sway { from { transform: rotate(-1.5deg); } to { transform: rotate(1.5deg); } }
.fight .rays svg { width: 100%; height: 100%; display: block; animation: rays-jitter .5s infinite; }
@keyframes rays-jitter {
  0% { transform: translate(0, 0); animation-timing-function: steps(1); }
  25% { transform: translate(5px, -3px); animation-timing-function: steps(1); }
  50% { transform: translate(-4px, 2px); animation-timing-function: steps(1); }
  75% { transform: translate(2px, 4px); animation-timing-function: steps(1); }
}
.fight .flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; z-index: 8; }
.fight .pattern { position: absolute; inset: 0; pointer-events: none; }
.p-halftone { opacity: .25; background: radial-gradient(circle, #000 0 38%, transparent 40%) 0 0 / 22px 22px; } /* no mask: masks are heavy on the TV */
.p-chevron { opacity: .16; background:
  linear-gradient(135deg, #fff 25%, transparent 25%) -60px 0 / 120px 120px, linear-gradient(225deg, #fff 25%, transparent 25%) -60px 0 / 120px 120px,
  linear-gradient(315deg, #fff 25%, transparent 25%) 0 0 / 120px 120px, linear-gradient(45deg, #fff 25%, transparent 25%) 0 0 / 120px 120px; }
.p-checker { opacity: .08; background: repeating-conic-gradient(#fff 0 25%, transparent 0 50%) 0 0 / 90px 90px; transform: rotate(-25deg) scale(1.6); }
.p-felt { opacity: .22; background:
  repeating-linear-gradient(45deg, rgba(0,0,0,.6) 0 1px, transparent 1px 4px), repeating-linear-gradient(-45deg, rgba(255,255,255,.25) 0 1px, transparent 1px 5px); }
.p-sunburst { opacity: .14; background: repeating-conic-gradient(from 0deg at 50% 55%, #fff 0 6deg, transparent 6deg 18deg); }
.p-stripes { opacity: .12; background: repeating-linear-gradient(-65deg, #000 0 60px, transparent 60px 120px); }
.p-dots { opacity: .18; background: radial-gradient(circle, #fff 0 3px, transparent 4px) 0 0 / 40px 40px; }
.p-crosshatch { opacity: .14; background:
  repeating-linear-gradient(45deg, #000 0 2px, transparent 2px 22px), repeating-linear-gradient(-45deg, #000 0 2px, transparent 2px 22px); }
.p-zigzag { opacity: .14; background:
  linear-gradient(135deg, #fff 25%, transparent 25%) -40px 0 / 80px 80px, linear-gradient(225deg, #fff 25%, transparent 25%) -40px 0 / 80px 80px; }
.p-argyle { opacity: .16; background:
  repeating-linear-gradient(120deg, rgba(255,255,255,.5) 0 2px, transparent 2px 70px), repeating-linear-gradient(60deg, rgba(255,255,255,.5) 0 2px, transparent 2px 70px),
  linear-gradient(60deg, rgba(0,0,0,.6) 25%, transparent 25%, transparent 75%, rgba(0,0,0,.6) 75%) 0 0 / 70px 121px,
  linear-gradient(120deg, rgba(0,0,0,.6) 25%, transparent 25%, transparent 75%, rgba(0,0,0,.6) 75%) 0 0 / 70px 121px; }
.p-grid { opacity: .12; background:
  linear-gradient(#fff 2px, transparent 2px) 0 0 / 80px 80px, linear-gradient(90deg, #fff 2px, transparent 2px) 0 0 / 80px 80px; }
.p-plaid { opacity: .2; background:
  repeating-linear-gradient(0deg, rgba(0,0,0,.5) 0 30px, transparent 30px 60px, rgba(255,255,255,.15) 60px 66px, transparent 66px 120px),
  repeating-linear-gradient(90deg, rgba(0,0,0,.5) 0 30px, transparent 30px 60px, rgba(255,255,255,.15) 60px 66px, transparent 66px 120px); }
.p-triangles { opacity: .14; background:
  linear-gradient(60deg, #000 25%, transparent 25.5%, transparent 75%, #000 75.5%) 0 0 / 80px 140px,
  linear-gradient(-60deg, #000 25%, transparent 25.5%, transparent 75%, #000 75.5%) 0 0 / 80px 140px; }
.fight .sub { position: absolute; left: 0; right: 0; top: 130px; text-align: center; font-size: 104px; line-height: 1; font-weight: 900;
  letter-spacing: 6px; text-transform: uppercase; text-shadow: 0 6px 0 rgba(0,0,0,.45); z-index: 4; }
.fight .label { position: absolute; left: 0; right: 0; top: 262px; text-align: center; font-size: 38px; font-weight: 800; font-style: italic; color: #ffd400;
  text-transform: uppercase; letter-spacing: 6px; z-index: 4; }
/* name boxes: up to 2 lines, wrapped at spaces; 380-600 and 640-860, they cross without touching; 120 px from the screen edges */
.fight .name { position: absolute; z-index: 2; width: 670px; height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
  font-size: 150px; line-height: 1; font-weight: 900; font-style: italic; text-transform: uppercase; will-change: transform;
  text-shadow: 0 8px 0 rgba(0,0,0,.5), 0 0 40px rgba(0,0,0,.35); }
.fight .name span { display: block; max-width: 100%; }
/* the mascot's name right under the player's name, like a boxer's nickname: same font, small, flies in with the name */
.fight .name .nick { font-size: 34px; line-height: 1.1; letter-spacing: 3px; color: #ffd400; margin-top: 6px; max-width: 100%;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fight .n1 { left: 180px; top: 380px; }
.fight .n2 { right: 180px; top: 640px; }
.fight .vs { position: absolute; z-index: 3; left: 0; right: 0; top: 510px; text-align: center; font-size: 220px; line-height: 220px; font-weight: 900; font-style: italic;
  color: #ffd400; will-change: transform; }
/* white outline OUTSIDE the letters: a white copy with a thick stroke lies under the yellow text, which covers the stroke's
   inner half. (paint-order: stroke fill would do it in one layer, but the TV ignores it and the stroke eats the letters.) */
.fight .vs::before { content: 'VS'; position: absolute; left: 0; right: 0; top: 0; z-index: -1; color: #fff; -webkit-text-stroke: 22px #fff;
  text-shadow: 0 0 50px rgba(0,0,0,.45); } /* the dark glow under the outline, not on it */
.fight .mascot { position: absolute; z-index: 1; font-size: 300px; line-height: 1; font-style: normal; will-change: transform; filter: drop-shadow(0 10px 0 rgba(0,0,0,.4)); }
.fight .mascot .hat { position: absolute; left: 50%; top: -.36em; font-size: .52em; transform: translateX(-50%) rotate(-10deg); }
.fight .mascot .item { position: absolute; right: -.18em; bottom: -.02em; font-size: .46em; transform: rotate(14deg); }
.fight .mascot.m2 .item { right: auto; left: -.18em; transform: rotate(-14deg); }
/* left mascot right under the left name (380-600), right mascot right above the right name (640-860); centred on the names */
.fight .mascot.m1 { left: 515px; top: 615px; transform-origin: 50% 50%; margin-left: -150px; }
.fight .mascot.m2 { left: 1525px; top: 325px; margin-left: -150px; }
/* important matches: two caution tapes across the screen, the words running in opposite directions (one moving layer
   each, transforms only) */
.fight .tape { position: absolute; left: -240px; width: 2400px; height: 100px; z-index: 5; pointer-events: none; display: none; overflow: hidden;
  background: #ffd400; box-shadow: 0 8px 24px rgba(0,0,0,.45);
  border-top: 15px solid transparent; border-bottom: 15px solid transparent;
  border-image: repeating-linear-gradient(45deg, #111 0 18px, #ffd400 18px 36px) 15; }
.fight.important .tape { display: block; }
.fight .tape.t1 { top: -9px; transform: rotate(-1deg); } /* its top stripes just off screen, the words whole */
.fight.important .sub { top: 152px; } .fight.important .label { top: 284px; } /* room under the top tape */
.fight .tape.t2 { top: 950px; transform: rotate(2deg); }
.fight .tape .run { display: flex; width: max-content; will-change: transform; white-space: nowrap; color: #111;
  font-size: 60px; line-height: 70px; font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: 5px; }
.fight .tape .run span { padding-right: 60px; }
.fight .bar { position: absolute; left: 0; bottom: 0; height: 12px; width: 100%; background: #ffd400; transform-origin: 0 50%; z-index: 9; }
`;

/** 12 white triangles pointing at the centre of the stage; tips away from the middle, outer ends far off screen. */
function rays() {
  const cx = 1056; // centre of the 2112×1188 box = centre of the stage
  const cy = 594;
  let d = '';
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const w = 0.02 + Math.random() * 0.03; // half-width at the outer end, radians
    const r1 = 300 + Math.random() * 240; // the sharp tip
    const r2 = 1500; // > 1101 to a screen corner + sway and jitter
    const p = (r, t) => `${(cx + r * Math.cos(t)).toFixed(0)},${(cy + r * Math.sin(t)).toFixed(0)}`;
    d += `<polygon points="${p(r1, a)} ${p(r2, a - w)} ${p(r2, a + w)}"/>`;
  }
  return `<div class="rays"><svg viewBox="0 0 2112 1188" aria-hidden="true"><g fill="#fff" fill-opacity=".28">${d}</g></svg></div>`;
}

// Some regulars draw from a set of their own (a friendly running joke): `chance` of the tournaments, else the common
// pool. Decided by their id like everyone else, so it stays for the tournament and looks like plain luck.
// Key: the name in lower case without spaces and dots.
const LUCKY = {
  kc: { set: PRIDE, chance: 1 },
  david: { set: PRIDE, chance: 0.5 },
};

/** The player's set (LUCKY or the common pool) and their place in it: a hash of the player id (FNV-1a). */
function mascotPick(p) {
  const lucky = LUCKY[(p?.name || '').toLowerCase().replace(/[\s.]/g, '')];
  if (!p?.id) { const set = lucky && Math.random() < lucky.chance ? lucky.set : MASCOTS; return [set, Math.floor(Math.random() * set.length)]; }
  let h = 0x811c9dc5;
  for (let i = 0; i < p.id.length; i++) h = Math.imul(h ^ p.id.charCodeAt(i), 0x01000193) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0; // mix the bits: similar ids land far apart
  h = (h ^ (h >>> 16)) >>> 0;
  const set = lucky && ((h >>> 20) % 1000) / 1000 < lucky.chance ? lucky.set : MASCOTS; // high bits: independent of the pick
  return [set, h % set.length];
}

/**
 * Mascots of all the tournament's players, none twice: in the order they joined, each takes the one its id points to,
 * or the next free one in its set. A late player never changes the mascots of those before them.
 */
function mascotsFor(players) {
  const used = new Set();
  const out = new Map();
  for (const p of players) {
    const [set, start] = mascotPick(p);
    let m = set[start];
    for (let k = 0; k < set.length; k++) {
      const c = set[(start + k) % set.length];
      if (!used.has(c)) { m = c; break; }
    }
    used.add(m);
    out.set(p.id, m);
  }
  return out;
}

/** The player's mascot, among all the tournament's players (`players` in join order). */
function mascotFor(p, players = []) {
  const own = mascotsFor(players).get(p?.id);
  if (own) return own;
  const [set, k] = mascotPick(p);
  return set[k];
}

// The slow way out at the end of the screen: the action slows down to a stop, all but the background fades out,
// then the two halves part. LEAVE_SLOW ms in all, taken from the end of the screen's time (app.js).
const SLOWDOWN = 2000; // seconds 14-16 of the 20 s screen
const FADE = 2000; // 16-18
const PART = 2000; // 18-20
export const LEAVE_SLOW = SLOWDOWN + FADE + PART;

export function createCall(root) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  root.innerHTML = `<div class="fight">
    <div class="ring">
      <div class="corner red"></div><div class="corner blue"></div>
      <div class="stuff"><div class="gap"></div><div class="pattern"></div>${rays()}
      <div class="mascot m1"></div><div class="mascot m2"></div>
      <div class="sub">Now playing</div><div class="label"></div>
      <div class="name n1"></div><div class="vs">VS</div><div class="name n2"></div></div>
    </div>
      <div class="tape t1"><div class="run"></div></div><div class="tape t2"><div class="run"></div></div>
    <div class="flash"></div><div class="bar"></div></div>`;
  const q = (sel) => root.querySelector(sel);
  const fight = q('.fight');
  const ring = q('.ring');
  let running = []; // animations of the current show, cancelled by the next one
  let shown = 0; // counts show() calls
  let barAnim = null; // the countdown keeps running while everything else slows down
  let leaveTimers = []; // timers of a leave() in progress, dropped by the next show()

  const anim = (el, frames, opts) => { const a = el.animate(frames, opts); running.push(a); return a; };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function setName(el, text, nickname) {
    el.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = text;
    const nick = document.createElement('div');
    nick.className = 'nick';
    nick.textContent = nickname;
    el.append(span, nick);
    // Shrink until it fits: at most 2 lines, no single word wider than the box, room left for the nickname.
    let size = 150;
    el.style.fontSize = `${size}px`;
    const room = () => el.clientHeight - nick.offsetHeight - 6;
    const lines = () => Math.round(span.offsetHeight / size);
    while (size > 40 && (span.scrollWidth > el.clientWidth + 1 || lines() > 2 || span.offsetHeight > room())) {
      el.style.fontSize = `${(size -= 4)}px`;
    }
  }

  function setMascot(n, [body, hat, item]) {
    const box = q(`.mascot.m${n}`);
    if (body.startsWith('<')) box.innerHTML = body; else box.textContent = body;
    if (Array.isArray(hat)) {
      const [h, dx, dy, deg] = hat;
      box.insertAdjacentHTML('beforeend', `<span class="hat" style="transform: translate(calc(-50% + ${dx}em), ${dy}em) rotate(${deg}deg)">${h}</span>`);
    } else if (hat) box.insertAdjacentHTML('beforeend', `<span class="hat">${hat}</span>`);
    if (item) box.insertAdjacentHTML('beforeend', `<span class="item">${item}</span>`);
  }

  // The whole ring jolts, a white flash.
  function impact(at, power) {
    anim(ring, [
      { transform: 'none' },
      { transform: `translate(${-power}px, ${power * 0.6}px) rotate(-.4deg)`, offset: 0.15 },
      { transform: `translate(${power * 0.7}px, ${-power * 0.5}px) rotate(.3deg)`, offset: 0.35 },
      { transform: `translate(${-power * 0.35}px, ${power * 0.25}px)`, offset: 0.6 },
      { transform: 'none' },
    ], { duration: 380, delay: at, easing: 'ease-out' });
    anim(q('.flash'), [{ opacity: Math.min(0.7, power / 60) }, { opacity: 0 }], { duration: 260, delay: at, easing: 'ease-out' }); // never a blank white screen
  }

  /** The tapes: the words repeated past twice the tape's width, the row runs by exactly one half, so it loops seamlessly. */
  function tapes(text) {
    const words = Array.from({ length: 16 }, () => `<span>${text.replace(/[&<>]/g, '')} ★</span>`).join('');
    [['.t1', -1], ['.t2', 1]].forEach(([sel, dir]) => {
      const tape = q(`.tape${sel}`);
      const row = tape.querySelector('.run');
      row.innerHTML = words + words;
      // on screen from the first moment, with everything else (a whip-in came late on the TV); the words keep running
      const half = row.scrollWidth / 2;
      anim(row, dir < 0 ? [{ transform: 'translateX(0)' }, { transform: `translateX(${-half}px)` }] : [{ transform: `translateX(${-half}px)` }, { transform: 'translateX(0)' }],
        { duration: half * 9, iterations: Infinity, easing: 'linear' });
    });
  }

  const loop = (el, frames, ms, delay, extra = {}) => anim(el, frames, { duration: ms, delay, iterations: Infinity, easing: 'ease-in-out', ...extra });
  const jitter = (px) => [
    { transform: 'translate(0,0)' }, { transform: `translate(${px}px,${-px}px)` }, { transform: `translate(${-px}px,${px * 0.5}px)` },
    { transform: `translate(${px * 0.5}px,${px}px)` }, { transform: 'translate(0,0)' },
  ];
  function idle(kind, at, hold) {
    const s1 = q('.n1 span');
    const s2 = q('.n2 span');
    const vs = q('.vs');
    const sub = q('.sub');
    if (kind === 'drift') {
      loop(s1, [{ transform: 'translateX(0)' }, { transform: 'translateX(28px)' }, { transform: 'translateX(0)' }], 2400, at);
      loop(s2, [{ transform: 'translateX(0)' }, { transform: 'translateX(-28px)' }, { transform: 'translateX(0)' }], 2400, at);
      loop(vs, [{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }], 1600, at);
    } else if (kind === 'sway') {
      loop(s1, [{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(14px)' }, { transform: 'translateY(0)' }], 2600, at);
      loop(s2, [{ transform: 'translateY(0)' }, { transform: 'translateY(14px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }], 2600, at);
      loop(vs, [{ transform: 'rotate(0)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(0)' }, { transform: 'rotate(4deg)' }, { transform: 'rotate(0)' }], 2200, at);
    } else if (kind === 'heartbeat') {
      loop(vs, [{ transform: 'scale(1)' }, { transform: 'scale(1.16)', offset: 0.1 }, { transform: 'scale(1)', offset: 0.22 },
        { transform: 'scale(1.1)', offset: 0.32 }, { transform: 'scale(1)', offset: 0.46 }, { transform: 'scale(1)' }], 1000, at, { easing: 'ease-out' });
      loop(sub, jitter(1.5), 160, at, { easing: 'linear' });
    } else if (kind === 'stare-down') {
      anim(s1, [{ transform: 'translateX(0)' }, { transform: 'translateX(70px)' }], { duration: hold, delay: at, easing: 'ease-in', fill: 'forwards' });
      anim(s2, [{ transform: 'translateX(0)' }, { transform: 'translateX(-70px)' }], { duration: hold, delay: at, easing: 'ease-in', fill: 'forwards' });
      loop(vs, jitter(2.5), 140, at, { easing: 'linear' });
    } else {
      loop(s1, jitter(3), 120, at, { easing: 'linear' });
      loop(s2, jitter(3), 130, at, { easing: 'linear' });
      loop(vs, jitter(4), 110, at, { easing: 'linear' });
      loop(sub, jitter(2), 150, at, { easing: 'linear' });
    }
  }

  return {
    /** m: match view (p1, p2, label); hype: why it is a big match ('' if not), for the tapes; ms: how long the screen stays; players: all, in join order. */
    show(m, hype, ms, players = []) {
      running.forEach((a) => a.cancel());
      running = [];
      shown++; // a leave() still running for the previous match must not hide this one
      leaveTimers.forEach(clearTimeout);
      leaveTimers = [];
      fight.getAnimations({ subtree: true }).forEach((a) => { if (a instanceof CSSAnimation) { a.playbackRate = 1; a.play(); } }); // the rays, if a slowdown stopped them
      fight.style.background = '';
      root.style.background = '';
      fight.classList.remove('leaving');
      q('.label').textContent = m.label || '';

      q('.pattern').className = `pattern p-${pick(PATTERNS)}`;
      const important = !!hype;
      fight.classList.toggle('important', important);
      if (important) tapes(hype);
      // each player keeps one mascot for the whole tournament: it comes from the player's id, which is new in every
      // tournament, so next time the same name most likely gets another one
      // no two players of the tournament share a mascot; each keeps theirs for the whole tournament
      const m1 = mascotFor(m.p1, players);
      let m2 = mascotFor(m.p2, players);
      if (m2 === m1) m2 = MASCOTS[(MASCOTS.indexOf(m1) + 1) % MASCOTS.length]; // only if a player is missing from the list
      setMascot(1, m1);
      setMascot(2, m2);
      setName(q('.n1'), m.p1?.name ?? '', m1[3]);
      setName(q('.n2'), m.p2?.name ?? '', m2[3]);

      const T1 = 120; // player 1 punches in
      const T2 = 420; // player 2 answers
      const TV = 820; // VS slams down
      const FLY = 330;
      // From beyond the opposite edge, leaning into the move; lands with a hard stop and recoil.
      const punch = (from, dir) => [
        { transform: `translateX(${from}px) skewX(${-dir * 22}deg) scaleX(1.25)`, easing: 'cubic-bezier(.5,0,.9,.4)' },
        { transform: `translateX(${-dir * 50}px) skewX(${dir * 10}deg) scaleX(.92)`, offset: 0.78, easing: 'ease-out' },
        { transform: 'translateX(0) skewX(0) scaleX(1)' },
      ];
      anim(q('.n1'), punch(1920, 1), { duration: FLY, delay: T1, fill: 'backwards' });
      anim(q('.n2'), punch(-1920, -1), { duration: FLY, delay: T2, fill: 'backwards' });
      impact(T1 + FLY * 0.78, 22);
      impact(T2 + FLY * 0.78, 22);
      anim(q('.vs'), [
        { transform: 'scale(6) rotate(-12deg)', opacity: 0, easing: 'cubic-bezier(.6,0,.9,.5)' },
        { transform: 'scale(.85) rotate(4deg)', opacity: 1, offset: 0.7 },
        { transform: 'scale(1) rotate(0)', opacity: 1 },
      ], { duration: 340, delay: TV, fill: 'backwards' });
      impact(TV + 240, 36);
      anim(q('.label'), [{ opacity: 0, transform: 'translateY(-30px)' }, { opacity: 1, transform: 'none' }], { duration: 250, fill: 'backwards' });
      // Mascots swoop in right behind the names, then bob.
      for (const [n, from, delay] of [[1, -700, 60], [2, 700, 360]]) {
        const box = q(`.mascot.m${n}`);
        anim(box, [{ transform: `translateX(${from}px) rotate(${from > 0 ? 14 : -14}deg)` }, { transform: 'translateX(0) rotate(0)' }],
          { duration: 500, delay, easing: 'cubic-bezier(.2,.8,.3,1.4)', fill: 'backwards' });
        loop(box, [{ transform: 'translateY(0) rotate(0)' }, { transform: `translateY(-16px) rotate(${n === 1 ? 4 : -4}deg)` }, { transform: 'translateY(0) rotate(0)' }],
          900 + n * 120, delay + 500);
      }
      idle(pick(IDLES), TV + 600, ms - TV - 600);
      barAnim = anim(q('.bar'), [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: ms, easing: 'linear', fill: 'forwards' });
    },
    hide() {
      running.forEach((a) => a.cancel());
      running = [];
    },
    /**
     * The way out, then done(). slow (at the end of the screen, LEAVE_SLOW ms): the action slows down to a stop
     * (SLOWDOWN), all but the background fades out as one layer (FADE), then the red and blue halves part to the sides
     * like doors and show the board underneath (PART); the countdown runs to the end. Fast (~0.8 s, the match left the
     * queue early): the same, at once. Few layers move: a heavier way out (names, VS, tapes flying off one by one) was
     * too much for the TV.
     */
    leave(done, slow = false) {
      const my = shown;
      const later = (fn, ms) => leaveTimers.push(setTimeout(() => { if (my === shown) fn(); }, ms));
      const go = (el, frames, ms, delay, easing) => anim(el, frames, { duration: ms, delay, easing, fill: 'forwards' });
      // everything that moves, the rays' CSS animations too; not the countdown
      const moving = () => fight.getAnimations({ subtree: true }).filter((a) => a !== barAnim && a.playState === 'running');
      const [slowdown, fade, part] = slow ? [SLOWDOWN, FADE, PART] : [0, 250, 480];
      let atRest = false; // the slowdown is over: its last step must not touch the fade and the doors
      if (slowdown) {
        // the speed falls from 1 to 0 in small steps, a little faster at first: a smooth coming to rest
        const t0 = performance.now();
        const step = () => {
          if (atRest) return;
          const k = Math.max(0, 1 - (performance.now() - t0) / slowdown);
          moving().forEach((a) => { a.playbackRate = k * k; });
          if (k > 0) later(step, 150);
        };
        step();
      }
      later(() => {
        atRest = true;
        moving().forEach((a) => a.pause()); // at rest
        fight.classList.add('leaving');
        for (const el of [q('.stuff'), q('.tape.t1'), q('.tape.t2')]) go(el, [{ opacity: 1 }, { opacity: 0 }], fade, 0, 'ease-in-out');
        // the halves still cover it; once they part, the board shows (the call box in app.js has a dark background too)
        fight.style.background = 'transparent';
        root.style.background = 'transparent';
        const ease = slow ? 'cubic-bezier(.6,0,.4,1)' : 'cubic-bezier(.5,0,.8,.5)';
        go(q('.red'), [{ transform: 'none' }, { transform: 'translateX(-1400px)' }], part, fade + (slow ? 0 : 50), ease);
        go(q('.blue'), [{ transform: 'none' }, { transform: 'translateX(1400px)' }], part, fade + (slow ? 0 : 50), ease);
        go(q('.bar'), [{ opacity: 1 }, { opacity: 0 }], slow ? 400 : 150, slow ? fade + part - 400 : 0, 'ease-out');
        later(() => {
          running.forEach((a) => a.cancel());
          running = [];
          fight.classList.remove('leaving');
          fight.style.background = '';
          root.style.background = '';
          done();
        }, fade + part + 70);
      }, slowdown);
    },
  };
}
