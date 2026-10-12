// «Now playing» call screen, fight-night style (designed in /lab/): who goes to the table right now.
// Red corner left, blue corner right, a random background pattern, two random mascots, the names punch in
// from opposite sides, VS slams down, then an idle motion. Important matches: instead of «Now playing», why the match
// matters (★ FINAL ★, ★ TIE-BREAK ★…) in big shiny gold letters. (Caution tapes, shock waves and a harder slam were
// tried: the tapes looked like a police line, the rest was too heavy for the TV.)
// Light for a TV browser: transforms and opacity only, few and small layers (big or many layers made the TV lag and flicker).

const PATTERNS = [
  'halftone', 'chevron', 'checker', 'felt', 'sunburst', 'stripes',
  'dots', 'crosshatch', 'zigzag', 'argyle', 'grid', 'plaid', 'triangles',
];
const IDLES = ['drift', 'sway', 'heartbeat', 'stare-down', 'adrenaline'];

// There is no pug emoji: a pug face drawn in the style of the Noto emoji (the TV's), used as a body.
const PUG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 10 120 120" width="1em" height="1em" style="display:block"><path d="M64 26 C40 26 22 34 18 52 C14 68 12 90 22 104 C32 118 50 122 64 122 C78 122 96 118 106 104 C116 90 114 68 110 52 C106 34 88 26 64 26z" fill="#e2b77b"/><path d="M18 80 C16 96 24 110 40 117 C30 106 24 94 22 78z M110 80 C112 96 104 110 88 117 C98 106 104 94 106 78z" fill="#cf9f63"/><path d="M64 26 C42 26 26 34 21 50 C32 41 47 37 64 37 C81 37 96 41 107 50 C102 34 86 26 64 26z" fill="#efcc94"/><path d="M22 34 C24 24 36 20 44 26 C40 34 34 44 26 50 C20 46 20 40 22 34z" fill="#2f2622"/><path d="M106 34 C104 24 92 20 84 26 C88 34 94 44 102 50 C108 46 108 40 106 34z" fill="#2f2622"/><path d="M28 34 C32 28 38 27 41 29 C37 35 33 40 29 43z" fill="#4a3d36"/><path d="M100 34 C96 28 90 27 87 29 C91 35 95 40 99 43z" fill="#4a3d36"/><path d="M44 46 Q54 40 64 44 Q74 40 84 46" fill="none" stroke="#a8773f" stroke-width="3.2" stroke-linecap="round"/><path d="M50 54 Q57 50 64 53 Q71 50 78 54" fill="none" stroke="#a8773f" stroke-width="3" stroke-linecap="round"/><path d="M30 70 C30 58 40 54 48 58 C54 61 58 66 64 66 C70 66 74 61 80 58 C88 54 98 58 98 70 C98 82 96 96 88 104 C80 112 48 112 40 104 C32 96 30 82 30 70z" fill="#3e322c"/><ellipse cx="45" cy="70" rx="11" ry="11" fill="#f3ead9"/><ellipse cx="83" cy="70" rx="11" ry="11" fill="#f3ead9"/><circle cx="45.5" cy="70.5" r="9.6" fill="#1a1411"/><circle cx="82.5" cy="70.5" r="9.6" fill="#1a1411"/><circle cx="42" cy="66.5" r="3.4" fill="#fff"/><circle cx="79" cy="66.5" r="3.4" fill="#fff"/><path d="M48 82 C54 76 74 76 80 82 C74 80 54 80 48 82z" fill="#2a211d" stroke="#2a211d" stroke-width="4" stroke-linejoin="round"/><path d="M54 88 C54 83 74 83 74 88 C74 93 69 96 64 96 C59 96 54 93 54 88z" fill="#15100e"/><ellipse cx="59.5" cy="87.5" rx="2.6" ry="1.6" fill="#4d3f38"/><path d="M64 96 L64 101" stroke="#15100e" stroke-width="2.6" stroke-linecap="round"/><path d="M64 101 C58 108 46 108 42 100" fill="none" stroke="#15100e" stroke-width="2.6" stroke-linecap="round"/><path d="M64 101 C70 108 82 108 86 100" fill="none" stroke="#15100e" stroke-width="2.6" stroke-linecap="round"/><path d="M59 104 C59 113 69 113 69 104 C66 106 62 106 59 104z" fill="#e8657e"/><path d="M64 106 L64 110" stroke="#c44a63" stroke-width="1.4" stroke-linecap="round"/></svg>`;

// Cuban Pete («They call me Cuban Pete, I'm the king of the rumba beat»): the frog with the green face of «The Mask»,
// a Cuban straw fedora and maracas, both drawn (no straw-hat emoji, and the maracas emoji is too new for the TV).
const PETE_HAT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="1.45em" height="1.45em" style="display:block"><ellipse cx="60" cy="84" rx="58" ry="17" fill="#c9a861"/><ellipse cx="60" cy="81" rx="56" ry="15" fill="#e9cf8c"/><path d="M8 80 Q60 92 112 80" fill="none" stroke="#c9a861" stroke-width="2"/><path d="M28 80 C26 58 30 36 40 30 C48 26 54 32 60 32 C66 32 72 26 80 30 C90 36 94 58 92 80 Q60 90 28 80z" fill="#e3c57f"/><path d="M40 30 C48 26 54 32 60 32 C66 32 72 26 80 30 C76 40 70 44 60 44 C50 44 44 40 40 30z" fill="#d6b56c"/><path d="M34 52 Q60 60 86 52 M31 62 Q60 71 89 62" fill="none" stroke="#caa962" stroke-width="1.6"/><path d="M29 68 Q60 79 91 68 L92 79 Q60 90 28 79z" fill="#2c211b"/><path d="M29 68 Q60 79 91 68" fill="none" stroke="#4a3a2e" stroke-width="1.5"/></svg>`;
const MARACAS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="1.6em" height="1.6em" style="display:block"><g transform="rotate(-24 60 60)"><rect x="30" y="58" width="9" height="52" rx="4.5" fill="#8a5a2b"/><rect x="30" y="58" width="4" height="52" rx="2" fill="#a8743f"/><ellipse cx="34.5" cy="38" rx="21" ry="26" fill="#e23b2e"/><path d="M15 32 Q34.5 42 54 32 M14 44 Q34.5 54 55 44" fill="none" stroke="#ffd23f" stroke-width="5"/><path d="M19 22 Q34.5 28 50 22" fill="none" stroke="#2fa84f" stroke-width="4"/><ellipse cx="27" cy="27" rx="6" ry="9" fill="#fff" opacity=".35"/></g><g transform="rotate(22 60 60)"><rect x="80" y="58" width="9" height="52" rx="4.5" fill="#8a5a2b"/><rect x="80" y="58" width="4" height="52" rx="2" fill="#a8743f"/><ellipse cx="84.5" cy="38" rx="21" ry="26" fill="#ffc21f"/><path d="M65 32 Q84.5 42 104 32 M64 44 Q84.5 54 105 44" fill="none" stroke="#e23b2e" stroke-width="5"/><path d="M69 22 Q84.5 28 100 22" fill="none" stroke="#2fa84f" stroke-width="4"/><ellipse cx="77" cy="27" rx="6" ry="9" fill="#fff" opacity=".35"/></g></svg>`;
const CUBAN_PETE = ['🐸', [PETE_HAT, 0, -0.32, -8], [MARACAS, 0.75, -0.1, 16], 'Cuban Pete', 0.95]; // the hat above the eyes, the maracas off the body

// [body, hat, prop, name, scale]; scale (optional) makes the whole mascot a little smaller or bigger; the prop can be
// [prop, dx, dy, deg] (em of the prop) to move it off the body; a body starting with «<» is an inline SVG; a hat is centred over the emoji, or [hat, dx, dy, deg] (em) for animals drawn side-on,
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
  CUBAN_PETE,
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
/* semi-finals and the final: a row of cartoon flames burns along the bottom of the screen, embers fly up; now and then a
   fire extinguisher pops in, puffs, the flames die down and flare up again, bigger every time. Small SVG pictures that
   only move and scale (cheap for the TV). The ring is 60 px bigger than the stage on every side. */
.fight .grow { position: absolute; left: 0; right: 0; bottom: 60px; height: 260px; z-index: 1; transform-origin: 50% 100%; pointer-events: none; }
.fight .burn { position: absolute; inset: 0; display: none; transform-origin: 50% 100%; font-style: normal; }
.fight.fire .burn { display: block; animation: tame 8s 1.4s infinite; }
.fight .burn .g { position: absolute; bottom: -20px; width: 150px; transform-origin: 50% 100%; } /* one tongue; grows wider and taller as a whole */
.fight .burn .f { position: absolute; inset: 0; transform-origin: 50% 100%; animation: flick .5s ease-in-out infinite alternate; }
.fight .burn .f svg { width: 100%; height: 100%; display: block; overflow: visible; }
@keyframes flick { 0% { transform: scale(1, 1) rotate(-4deg); } 50% { transform: scale(.9, 1.2) rotate(3deg); } 100% { transform: scale(1.06, .88) rotate(-1deg); } }
@keyframes tame { 0%, 72% { transform: scale(1); } 76%, 81% { transform: scale(1, .12); } 87% { transform: scale(1.1, 1.5); } 93%, 100% { transform: scale(1); } }
.fight .burn .e { position: absolute; bottom: 120px; width: 14px; height: 14px; border-radius: 50%; background: #ffd400; box-shadow: 0 0 0 4px #ff7a00;
  opacity: 0; animation: ember 1.6s ease-out infinite; }
@keyframes ember { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 100% { transform: translate(var(--dx), -220px) scale(.3); opacity: 0; } }
.fight .ext { position: absolute; right: 120px; bottom: 230px; font-size: 150px; line-height: 1; font-style: normal; z-index: 4; display: none;
  transform-origin: 30% 80%; }
.fight.fire .ext { display: block; animation: ext 8s 1.4s infinite backwards; opacity: 0; }
@keyframes ext { 0%, 62% { transform: translateX(520px) rotate(0); opacity: 0; } 67% { transform: translateX(0) rotate(-8deg); opacity: 1; }
  71% { transform: translateX(-10px) rotate(-24deg); opacity: 1; } 84% { transform: translateX(-10px) rotate(-24deg); opacity: 1; }
  90%, 100% { transform: translateX(520px) rotate(0); opacity: 0; } }
.fight .puff { position: absolute; left: 0; right: 0; bottom: 40px; height: 300px; z-index: 4; display: none; opacity: 0; transform-origin: 50% 100%; }
.fight.fire .puff { display: block; animation: puff 8s 1.4s infinite; }
.fight .puff i { position: absolute; border-radius: 50%; background: #fff; box-shadow: 0 0 0 6px rgba(74,42,0,.35); }
@keyframes puff { 0%, 71% { transform: scale(1, .2); opacity: 0; } 74% { transform: scale(1); opacity: .95; } 84% { transform: scale(1.05, 1.2); opacity: .9; } 90%, 100% { transform: scale(1.1, 1.4); opacity: 0; } }
.fight .mascot { position: absolute; z-index: 1; font-size: 300px; line-height: 1; font-style: normal; will-change: transform; filter: drop-shadow(0 10px 0 rgba(0,0,0,.4)); }
.fight .pow { position: absolute; z-index: 5; font: italic 900 96px/1 Inter, system-ui, sans-serif; color: #ffd400; letter-spacing: 1px;
  -webkit-text-stroke: 6px #4a1a00; pointer-events: none; } /* comic hit burst of the mascots' brawl */
.fight .daze { position: absolute; left: 50%; top: -.3em; font-size: .35em; transform-origin: 50% 60%; } /* dazed after a beating */
.fight .mascot .hat { position: absolute; left: 50%; top: -.36em; font-size: .52em; transform: translateX(-50%) rotate(-10deg); }
.fight .mascot .item { position: absolute; right: -.18em; bottom: -.02em; font-size: .46em; transform: rotate(14deg); }
.fight .mascot.m2 .item { right: auto; left: -.18em; transform: rotate(-14deg); }
/* left mascot right under the left name (380-600), right mascot right above the right name (640-860); centred on the names */
.fight .mascot.m1 { left: 515px; top: 615px; transform-origin: 50% 50%; margin-left: -150px; }
.fight .mascot.m2 { left: 1525px; top: 325px; margin-left: -150px; }
/* important matches: the title says why, in gold. The element itself draws a dark brown outline and shadow,
   its ::after copy on top fills the letters (the outline stays outside the letters, as with VS) */
.fight.important .sub { top: 112px; font-size: 132px; font-style: italic; letter-spacing: 4px; color: #4a2a00;
  display: flex; justify-content: center; align-items: center; gap: .18em; text-shadow: none; }
/* the words: a dark outline drawn by the element, its ::after copy on top fills the letters (outline outside, as with VS) */
.fight .sub .t { position: relative; -webkit-text-stroke: 16px #4a2a00; text-shadow: 0 10px 0 rgba(0,0,0,.45); }
.fight .sub .t::after { content: attr(data-text); position: absolute; left: 0; top: 0; color: #ffd23f; -webkit-text-stroke: 0; text-shadow: none; }
/* the stars: SVG with round joins (text ★ with a thick stroke came out spiky and broken on the TV) */
.fight .sub .star { width: .85em; height: .85em; flex: none; overflow: visible; }
.fight.important .label { top: 272px; }
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
// every Pete (Peter, Pedro, Петя...) gets Cuban Pete in half the tournaments; the name only has to start so
const PETES = /^(pete|peter|petr|pyotr|piet|pietro|pierre|pedro|петя|петр|питер|пит)/;
const PETE = { set: [CUBAN_PETE], chance: 0.5 };

/** The player's set (LUCKY or the common pool) and their place in it: a hash of the player id (FNV-1a). */
function mascotPick(p) {
  const key = (p?.name || '').toLowerCase().replace(/[\s.]/g, '').replace(/ё/g, 'е');
  const lucky = LUCKY[key] || (PETES.test(key) ? PETE : null);
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
    // all of a small set taken (a second Pete): the common pool instead, never a mascot twice
    const free = (s, i) => { for (let k = 0; k < s.length; k++) { const c = s[(i + k) % s.length]; if (!used.has(c)) return c; } return null; };
    const m = free(set, start) || free(MASCOTS, start % MASCOTS.length) || set[start];
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

const FLAME = 'M50 4C62 40 92 58 88 104C85 140 66 156 50 156C34 156 15 140 12 104C9 72 30 64 34 36C42 56 46 30 50 4Z';
const FLAME_IN = 'M50 62C58 84 72 94 70 120C68 140 60 148 50 148C40 148 32 140 30 120C29 102 40 94 42 78C46 88 48 74 50 62Z';
/** The flames along the bottom, embers, the extinguisher and its puff (shown only with .fight.fire). */
function fire() {
  const tongue = (x, h, d, delay) => `<span class="g" style="left:${x}px;height:${h}px"><span class="f" style="animation-duration:${d}s;animation-delay:-${delay}s">
    <svg viewBox="0 0 100 160" preserveAspectRatio="none"><path d="${FLAME}" fill="#ff4d1a" stroke="#4a1a00" stroke-width="6" stroke-linejoin="round"/>
    <path d="${FLAME_IN}" fill="#ffd400"/></svg></span></span>`;
  // a row of 17 tongues across the 2040 px ring, uneven heights and tempos so it never looks like a pattern
  const H = [170, 220, 150, 240, 190, 160, 230, 180, 250, 170, 210, 150, 235, 185, 160, 225, 175];
  const T = [.46, .55, .5, .42, .58, .48, .4, .52, .45, .56, .43, .5, .47, .54, .41, .53, .49];
  const flames = H.map((h, i) => tongue(i * 120 - 15, h, T[i], (i * 0.13) % 0.5)).join('');
  const embers = [[200, -30, 0], [520, 20, .4], [860, 40, .9], [1180, -40, 1.2], [1500, 30, .6], [1800, -20, 1.0]]
    .map(([x, dx, delay]) => `<i class="e" style="left:${x}px;--dx:${dx}px;animation-delay:${delay}s"></i>`).join('');
  const puff = [[120, 120, 180], [380, 60, 230], [660, 110, 200], [930, 40, 250], [1220, 100, 210], [1500, 50, 240], [1760, 110, 190], [250, 160, 150], [1080, 150, 160], [1640, 160, 150]]
    .map(([x, y, d]) => `<i style="left:${x}px;top:${y}px;width:${d}px;height:${d}px"></i>`).join('');
  return `<span class="grow"><span class="burn">${flames}${embers}</span></span><span class="puff">${puff}</span><span class="ext">🧯</span>`;
}

/** A mascot's body, hat and prop as HTML (font-size sets its size); mirrored: the prop on the left. */
function mascotInner([body, hat, item], mirrored = false) {
  let html = body;
  if (Array.isArray(hat)) {
    const [h, dx, dy, deg] = hat;
    html += `<span class="hat" style="transform: translate(calc(-50% + ${dx}em), ${dy}em) rotate(${deg}deg)">${h}</span>`;
  } else if (hat) html += `<span class="hat">${hat}</span>`;
  if (Array.isArray(item)) {
    // [prop, dx, dy, deg] (em of the prop): moved off the body; mirrored for a mascot whose prop is on its left
    const [it, dx, dy, deg] = item;
    const m = mirrored ? -1 : 1;
    html += `<span class="item" style="transform: translate(${m * dx}em, ${dy}em) rotate(${m * deg}deg)">${it}</span>`;
  } else if (item) html += `<span class="item">${item}</span>`;
  return html;
}

/** The player's mascot of this tournament (players: all, in join order) as HTML, for the podium; and its size factor. */
export function mascotHTML(p, players = []) {
  const m = mascotFor(p, players);
  return { html: mascotInner(m), scale: m[4] ?? 1 };
}

export function createCall(root) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  root.innerHTML = `<div class="fight">
    <div class="ring">
      <div class="corner red"></div><div class="corner blue"></div><div class="gap"></div><div class="pattern"></div>${rays()}
      <div class="mascot m1"></div><div class="mascot m2"></div>${fire()}
      <div class="sub">Now playing</div><div class="label"></div>
      <div class="name n1"></div><div class="vs">VS</div><div class="name n2"></div>
    </div>
    <div class="flash"></div><div class="bar"></div></div>`;
  const q = (sel) => root.querySelector(sel);
  const fight = q('.fight');
  const ring = q('.ring');
  let running = []; // animations of the current show, cancelled by the next one
  let timers = []; // timeouts of the current show (the mascots' fight), cleared by the next one

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

  function setMascot(n, [body, hat, item, , scale = 1]) {
    const box = q(`.mascot.m${n}`);
    // a mascot a little smaller or bigger than the rest: the font size (hat and prop follow), kept centred
    box.style.fontSize = scale === 1 ? '' : `${300 * scale}px`;
    box.style.marginLeft = scale === 1 ? '' : `${-150 * scale}px`;
    box.innerHTML = mascotInner([body, hat, item], n === 2); // the right mascot is mirrored: its prop on the left
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

  /** The title: «Now playing», or for a big match why it is big, in gold with stars, as large as fits (132 px down to 60). */
  const STAR = 'M0-10 2.94-4.05 9.51-3.09 4.76 1.55 5.88 8.09 0 5 -5.88 8.09 -4.76 1.55 -9.51-3.09 -2.94-4.05Z';
  function title(hype) {
    const sub = q('.sub');
    sub.style.fontSize = '';
    if (!hype) { sub.textContent = 'Now playing'; return; }
    const star = `<svg class="star" viewBox="-12 -12 24 24" aria-hidden="true"><path d="${STAR}" transform="translate(0 1.8)" fill="#000" fill-opacity=".45" stroke="#000" stroke-opacity=".45" stroke-width="4.4" stroke-linejoin="round"/><path d="${STAR}" fill="#4a2a00" stroke="#4a2a00" stroke-width="4.4" stroke-linejoin="round"/><path d="${STAR}" fill="#ffd23f" stroke="#ffd23f" stroke-width=".6" stroke-linejoin="round"/></svg>`; // outline below, gold on top: no paint-order needed
    const word = hype.replace(/[&<>"]/g, '');
    sub.innerHTML = `${star}<span class="t" data-text="${word}">${word}</span>${star}`;
    // the stars and the word as drawn on the scaled stage, against the full-width box
    const box = sub.getBoundingClientRect().width;
    const words = () => [...sub.children].reduce((w, c) => w + c.getBoundingClientRect().width, 0) * 1.08; // with the gaps
    let size = parseFloat(getComputedStyle(sub).fontSize);
    while (size > 60 && words() > box * 0.92) sub.style.fontSize = `${(size -= 4)}px`;
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
    // a big match's gold title moves with the same random idle as the rest: pulses, sways, beats, swells or shakes
    const gold = fight.classList.contains('important');
    if (gold) {
      const pulse = (k) => [{ transform: 'scale(1)' }, { transform: `scale(${k})` }, { transform: 'scale(1)' }];
      if (kind === 'drift') loop(sub, pulse(1.06), 1600, at);
      else if (kind === 'sway') loop(sub, [{ transform: 'rotate(0)' }, { transform: 'rotate(-2.5deg)' }, { transform: 'rotate(0)' }, { transform: 'rotate(2.5deg)' }, { transform: 'rotate(0)' }], 2200, at);
      else if (kind === 'heartbeat') {
        loop(sub, [{ transform: 'scale(1)' }, { transform: 'scale(1.1)', offset: 0.1 }, { transform: 'scale(1)', offset: 0.22 },
          { transform: 'scale(1.06)', offset: 0.32 }, { transform: 'scale(1)', offset: 0.46 }, { transform: 'scale(1)' }], 1000, at, { easing: 'ease-out' });
      } else if (kind === 'stare-down') anim(sub, [{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }], { duration: hold, delay: at, easing: 'ease-in', fill: 'forwards' });
      else loop(sub, jitter(3), 140, at, { easing: 'linear' });
    }
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
      if (!gold) loop(sub, jitter(1.5), 160, at, { easing: 'linear' });
    } else if (kind === 'stare-down') {
      anim(s1, [{ transform: 'translateX(0)' }, { transform: 'translateX(70px)' }], { duration: hold, delay: at, easing: 'ease-in', fill: 'forwards' });
      anim(s2, [{ transform: 'translateX(0)' }, { transform: 'translateX(-70px)' }], { duration: hold, delay: at, easing: 'ease-in', fill: 'forwards' });
      loop(vs, jitter(2.5), 140, at, { easing: 'linear' });
    } else {
      loop(s1, jitter(3), 120, at, { easing: 'linear' });
      loop(s2, jitter(3), 130, at, { easing: 'linear' });
      loop(vs, jitter(4), 110, at, { easing: 'linear' });
      if (!gold) loop(sub, jitter(2), 150, at, { easing: 'linear' });
    }
  }

  const rand = (a, b) => a + Math.random() * (b - a);
  const after = (ms, fn) => timers.push(setTimeout(fn, ms));

  /** A comic hit burst (POW!, BAM!…) at (x, y) of the ring. */
  function pow(x, y) {
    const b = document.createElement('div');
    b.className = 'pow';
    b.textContent = ['POW!', 'BAM!', 'WHAM!', 'BOOM!', '💥'][Math.floor(Math.random() * 5)];
    b.style.left = `${x}px`;
    b.style.top = `${y}px`;
    ring.append(b);
    b.animate([{ transform: 'translate(-50%, -50%) scale(.2) rotate(-20deg)', opacity: 1 }, { transform: 'translate(-50%, -50%) scale(1.15) rotate(8deg)', opacity: 1, offset: 0.4 },
      { transform: 'translate(-50%, -50%) scale(1) rotate(0)', opacity: 0 }], { duration: 650, easing: 'ease-out' });
    after(700, () => b.remove());
  }

  /**
   * One mascot hops over to the other and beats it up: punches with comic bursts, the other spins off and sits dazed
   * under circling stars, the bully hops back. Their bobbing stops for it and starts again after. Transforms only.
   */
  function brawl(bobs, bob) {
    const [an, vn] = Math.random() < 0.5 ? [1, 2] : [2, 1];
    const a = q(`.mascot.m${an}`);
    const v = q(`.mascot.m${vn}`);
    bobs[an]?.cancel();
    bobs[vn]?.cancel();
    const size = 300;
    // the victim's place in the bully's own coordinates; stop a body short of it, on the bully's side
    const dx = v.offsetLeft - a.offsetLeft;
    const dy = v.offsetTop - a.offsetTop;
    const dist = Math.hypot(dx, dy);
    const [ux, uy] = [dx / dist, dy / dist];
    const tx = dx - ux * size * 0.85;
    const ty = dy - uy * size * 0.85;
    let x = 0;
    let y = 0;
    const hops = 4;
    const hopMs = 380;
    const hop = (fx, fy, to, ty2, ms) => anim(a, [
      { transform: `translate(${fx}px, ${fy}px)` }, { transform: `translate(${(fx + to) / 2}px, ${(fy + ty2) / 2 - 90}px) scale(.95, 1.06)`, offset: 0.5 },
      { transform: `translate(${to}px, ${ty2}px) scale(1.1, .88)`, offset: 0.9 }, { transform: `translate(${to}px, ${ty2}px)` }], { duration: ms, easing: 'linear', fill: 'forwards' });
    for (let i = 1; i <= hops; i++) {
      after((i - 1) * hopMs, () => { const [fx, fy] = [x, y]; x = tx * i / hops; y = ty * i / hops; hop(fx, fy, x, y, hopMs); });
    }
    const t0 = hops * hopMs;
    const punches = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < punches; i++) {
      after(t0 + i * 330, () => {
        anim(a, [{ transform: `translate(${x}px, ${y}px)` }, { transform: `translate(${x + ux * 70}px, ${y + uy * 70}px) rotate(${ux > 0 ? 10 : -10}deg)`, offset: 0.4 },
          { transform: `translate(${x}px, ${y}px)` }], { duration: 260, easing: 'ease-out', fill: 'forwards' });
        anim(v, [{ transform: 'none' }, { transform: `translate(${ux * 24}px, ${uy * 24}px) rotate(${ux > 0 ? 8 : -8}deg)`, offset: 0.5 }, { transform: 'none' }], { duration: 260, delay: 90 });
        pow(v.offsetLeft + 150 + rand(-60, 60), v.offsetTop + 90 + rand(-40, 40));
      });
    }
    const t1 = t0 + punches * 330 + 150;
    after(t1, () => {
      // knocked away: a spin and a slide, then dazed under circling stars
      anim(v, [{ transform: 'none' }, { transform: `translate(${ux * 70}px, ${uy * 70 - 80}px) rotate(${ux > 0 ? 360 : -360}deg)`, offset: 0.6 },
        { transform: `translate(${ux * 110}px, ${uy * 110}px) rotate(${ux > 0 ? 720 : -720}deg)` }], { duration: 700, easing: 'ease-out', fill: 'forwards' });
      const stars = document.createElement('span');
      stars.className = 'daze';
      stars.textContent = '💫';
      v.append(stars);
      anim(stars, [{ transform: 'translateX(-50%) rotate(0)' }, { transform: 'translateX(-50%) rotate(360deg)' }], { duration: 700, iterations: 4 });
      // the bully hops back home
      for (let i = 1; i <= hops; i++) {
        after(500 + (i - 1) * hopMs, () => { const [fx, fy] = [x, y]; x = tx * (1 - i / hops); y = ty * (1 - i / hops); hop(fx, fy, x, y, hopMs); });
      }
      after(500 + hops * hopMs + 100, () => bob(an, 0));
      // the victim gets up and slides back
      after(3000, () => {
        stars.remove();
        anim(v, [{ transform: `translate(${ux * 110}px, ${uy * 110}px)` }, { transform: 'none' }], { duration: 500, easing: 'ease-in-out', fill: 'forwards' });
        after(520, () => bob(vn, 0));
      });
    });
  }

  return {
    /** m: match view (p1, p2, label); hype: why it is a big match ('' if not), shown as the title; ms: how long the screen stays; players: all, in join order. */
    show(m, hype, ms, players = []) {
      running.forEach((a) => a.cancel());
      running = [];
      timers.forEach(clearTimeout);
      timers = [];
      ring.querySelectorAll('.pow, .daze').forEach((x) => x.remove());
      q('.label').textContent = m.label || '';

      q('.pattern').className = `pattern p-${pick(PATTERNS)}`;
      fight.classList.toggle('important', !!hype);
      const burning = hype === 'Semi-final' || hype === 'Final';
      fight.classList.toggle('fire', burning); // flames behind VS
      if (burning) {
        // every time the extinguisher has put it out, the fire flares up bigger than before and stays so
        // (the flare-up of the 8 s cycle, started 1.4 s in, is at 87%: see @keyframes tame)
        const flares = [];
        for (let t = 1400 + 0.87 * 8000; t < ms; t += 8000) flares.push(t);
        const frames = [{ transform: 'scale(1)', offset: 0 }];
        flares.forEach((t, i) => {
          frames.push({ transform: `scale(${1 + 0.45 * i})`, offset: (t - 50) / ms });
          frames.push({ transform: `scale(${1 + 0.45 * (i + 1)})`, offset: (t + 250) / ms }); // each tongue taller and wider, from its own foot
        });
        frames.push({ transform: frames.at(-1).transform, offset: 1 });
        q('.grow').querySelectorAll('.g').forEach((g) => anim(g, frames, { duration: ms, fill: 'forwards' }));
      }
      title(hype);
      if (hype) q('.label').textContent = ''; // the big gold title says it already: no small line under it
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
      const bobs = {};
      const bob = (n, delay) => {
        bobs[n] = loop(q(`.mascot.m${n}`), [{ transform: 'translateY(0) rotate(0)' }, { transform: `translateY(-16px) rotate(${n === 1 ? 4 : -4}deg)` }, { transform: 'translateY(0) rotate(0)' }],
          900 + n * 120, delay);
      };
      for (const [n, from, delay] of [[1, -700, 60], [2, 700, 360]]) {
        const box = q(`.mascot.m${n}`);
        anim(box, [{ transform: `translateX(${from}px) rotate(${from > 0 ? 14 : -14}deg)` }, { transform: 'translateX(0) rotate(0)' }],
          { duration: 500, delay, easing: 'cubic-bezier(.2,.8,.3,1.4)', fill: 'backwards' });
        bob(n, delay + 500);
      }
      // once a show, somewhere in its middle, one mascot hops over to the other and beats it up
      if (ms > 9000) after(rand(5500, Math.min(10000, ms - 7000)), () => brawl(bobs, bob));
      idle(pick(IDLES), TV + 600, ms - TV - 600);
      anim(q('.bar'), [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: ms, easing: 'linear', fill: 'forwards' });
    },
    hide() {
      running.forEach((a) => a.cancel());
      running = [];
      timers.forEach(clearTimeout);
      timers = [];
    },
  };
}
