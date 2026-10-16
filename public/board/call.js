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

// Every emoji is drawn from our own copy of the Noto emoji (public/assets/emoji/, Apache 2.0, googlefonts/noto-emoji
// v2.047, svg/: the version of the Noto Color Emoji font the mascots were fitted to), not by the screen's font: the TV,
// phones, Macs and screenshots all show the same picture, so which way an animal looks is known. A new emoji needs its
// SVG there too (file name: its code points in hex, joined by _, without FE0F).
// an emoji: a pictograph, joined by ZWJ to more (🐻‍❄️, 🏳️‍🌈); no /v flag (\p{RGI_Emoji}): too new for the TV's browser
const EMOJI = /\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*/gu;
// a comic hit burst: a white cloud with 11 big uneven spikes, a dark outline and an offset dark shadow, the word on it,
// speed lines flashing out round it
const LINES = `<svg class="lines" viewBox="-1 -1 2 2" aria-hidden="true"><g stroke="#fff" stroke-width=".05" stroke-linecap="round"><line x1="0.574" y1="0.011" x2="0.963" y2="0.019"/><line x1="0.498" y1="0.285" x2="0.856" y2="0.490"/><line x1="0.372" y1="0.400" x2="0.674" y2="0.725"/><line x1="0.118" y1="0.578" x2="0.167" y2="0.824"/><line x1="-0.114" y1="0.512" x2="-0.200" y2="0.896"/><line x1="-0.317" y1="0.388" x2="-0.543" y2="0.665"/><line x1="-0.524" y1="0.275" x2="-0.848" y2="0.446"/><line x1="-0.579" y1="0.032" x2="-0.844" y2="0.046"/><line x1="-0.458" y1="-0.231" x2="-0.732" y2="-0.370"/><line x1="-0.300" y1="-0.426" x2="-0.495" y2="-0.702"/><line x1="-0.086" y1="-0.581" x2="-0.128" y2="-0.863"/><line x1="0.163" y1="-0.529" x2="0.277" y2="-0.900"/><line x1="0.348" y1="-0.481" x2="0.553" y2="-0.765"/><line x1="0.549" y1="-0.215" x2="0.813" y2="-0.319"/></g></svg>`;
const BURST = `<svg class="cloud" viewBox="-270 -175 540 350" aria-hidden="true"><path d="M243 -1 L158 34 L205 83 L114 77 L103 145 L30 101 L-26 158 L-69 90 L-181 119 L-144 56 L-206 43 L-161 -0 L-220 -36 L-145 -52 L-169 -120 L-70 -97 L-35 -153 L23 -102 L121 -146 L117 -79 L189 -79 L153 -30Z" transform="translate(7 8)" fill="#15110e"/><path d="M243 -1 L158 34 L205 83 L114 77 L103 145 L30 101 L-26 158 L-69 90 L-181 119 L-144 56 L-206 43 L-161 -0 L-220 -36 L-145 -52 L-169 -120 L-70 -97 L-35 -153 L23 -102 L121 -146 L117 -79 L189 -79 L153 -30Z" fill="#fff" stroke="#15110e" stroke-width="7" stroke-linejoin="miter"/></svg>`;
/** The HTML of a comic hit burst with `word` on it (the cloud fits round the word, .pow / .pz-pow size it). */
export function burstHTML(word) {
  return `${LINES}${BURST}<span class="w">${word}</span>`;
}
/** The burst's speed lines flash out: scaled up and gone in a blink. */
export function burstLines(el) {
  el.querySelector('.lines')?.animate([{ transform: 'scale(.4)', opacity: 1 }, { transform: 'scale(1.25)', opacity: 0 }], { duration: 280, easing: 'ease-out', fill: 'forwards' });
}
/** The emoji in `s` turned into pictures (.emo in style.css sizes them like the font did). */
export function emojify(s) {
  return s.replace(EMOJI, (e) => `<img class="emo" src="/assets/emoji/${[...e].map((c) => c.codePointAt(0)).filter((c) => c !== 0xfe0f).map((c) => c.toString(16)).join('_')}.svg" alt="">`);
}
// Bodies drawn side-on looking left (in Noto all side-on animals look left; the rest look at us): turned round to look right.
const LOOKS_LEFT = new Set([...'🦈🦦🦙🦖🦆🐓🦍🦎🦅🐆🦓🦭🐝🦒🐘🐉🐧🐍🦜🐢🐞🦘🐐🐊🦔🐋🐌🐗🦄🦩🐂']);
// and these count as looking right: the sloth hangs with its head on the left, it reads best turned away
const LOOKS_RIGHT = new Set([...'🦥']);
/** Which way a mascot looks as drawn: -1 left, 1 right, 0 at us. */
const facing = (m) => (LOOKS_LEFT.has(m[0]) ? -1 : LOOKS_RIGHT.has(m[0]) ? 1 : 0);

// [body, hat, prop, name, scale]; scale (optional) makes the whole mascot a little smaller or bigger; the prop can be
// [prop, dx, dy, deg] (em of the prop) to move it off the body; a body starting with «<» is an inline SVG; a hat is centred over the emoji, or [hat, dx, dy, deg] (em) for animals drawn side-on,
// whose head is not in the middle (checked against the Noto emoji the TV uses)
const MASCOTS = [
  // nicknames with a joke, like a boxer's
  ['🦈', ['🕶️', -0.33, 0.28, -18], ['🎱', -0.25, 0, 14], 'The Loan Shark'], ['🦥', '', '☕', 'Slow Hand'], ['🐸', '', '🍺', 'Hoppy Hour'],
  ['🦦', '', '🍹', 'Otterly Wasted'], ['🦙', ['🕶️', -0.66, 0.34, -12], '', 'No Prob-llama'], ['🐻‍❄️', '', '🧊', 'Ice Cold'],
  ['🦁', '', '❤️', 'Lionheart'], ['🦖', '', ['🥊', -0.25, 0, 14], 'Tiny Arms, Big Breaks'], ['🦆', '', ['🎯', 0.15, 0.35, 14], 'Sitting Duck'],
  ['🐓', '', '🥊', 'Cocky Rooster'], ['🦝', '🎩', '💰', 'The Bandit'], ['🐷', '', ['💸', 0, 0.25, 14], 'Piggy Bank'],
  ['🦍', ['👑', -0.35, -0.15, 8], '', 'Kong of the Table'], ['🦍', ['👓', -0.5, 0.45, -8], '🪄', 'Hairy Potter'],
  // Bali and around
  ['🦥', '', '⏰', 'Jam Karet'], ['🦎', '', '🌙', 'Tokek'], ['🦅', '', ['🍔', 0, 0.3, 14], 'Bald Eagle'],
  // more puns
  ['🐆', '', ['🤞', 0, 0.15, 14], 'Cheetah'], ['🦓', '', ['🎱', -1.9, 0.3, 14], 'Stripes'], ['🦭', '', '👍', 'Seal of Approval'],
  ['🐥', '', '🧲', 'Chick Magnet'], ['🐝', '', ['🚫', 0.1, 0.4, 14], 'Buzzkill'], ['🦒', '', '🏁', 'Neck and Neck'],
  ['🐘', '', ['🛋️', 0, 0.3, 14], 'Elephant in the Room'], ['🦉', ['🕶️', 0, 0.76, 0], '', 'Owl Be Back'], ['🐉', '', '🔥', 'Hot Shot'],
  ['🐧', ['🎩', -0.1, -0.35, 10], '🍸', 'The Tuxedo'], ['🐨', '', ['🎱', 0, 0.2, 14], 'Koala-ty Shot'], ['🐍', '', '🎲', 'Snake Eyes'],
  // a little flirty
  ['😼', '🎩', '💰', 'Fat Cat'], ['🐺', '🎩', '😉', 'Big Bad Wolf'], ['🐱', '🎀', '💋', 'Naughty Kitten'],
  // the old ones that still make you smile
  [PUG, ['🕶️', 0, 1.12, 0], '', 'Pug Life'], ['🐻', '', '🧸', 'Bear Hug'], ['🦜', '', '⚔️', 'Pirate Parrot'],
  ['🐵', '', '🍌', 'Cheeky Monkey'], ['🐙', '🎩', ['🎱', 0, 0.15, 14], 'Eight-Ball'], ['🐢', '', ['🌺', -0.6, 0.4, 14], 'Pelan Pelan'],
  ['🐞', '', '🍀', 'Lady Luck'], ['🥔', '🕶️', '📺', 'Couch Potato'], ['🦘', '', ['🏄', -0.15, -0.15, 14], 'Canggu Bro'],
  ['🐐', '', '🏆', 'The G.O.A.T.'], ['🦋', '', '🥂', 'Social Butterfly'], ['🐊', '', ['🦷', -1.6, 0.15, 14], 'Crikey!'],
  ['🦔', '', ['👟', 0, 0.3, 14], 'Gotta Go Fast'], ['🐋', '', ['🎱', 0, 0.5, 14], 'Killer Whale'], ['🐌', '', ['✉️', 0, 0.15, 14], 'Snail Mail'],
  ['🐰', '', ['🎱', 0, 0.15, 14], 'Bunny Hop'], ['🐗', '', ['🃏', -1.8, 0.25, -12], 'Wild Card'], ['🤖', '', ['🍺', 0, 0.2, 14], 'Bender'],
  ['👻', ['🎩', 0, -0.12, -10], ['🎱', 0, 0.1, 14], 'Ghost of the Table'], ['🍕', '', '🍍', 'Pineapple Pizza'], ['🍔', '👑', '🍟', 'Burger King'],
  ['🥑', '🧢', '', 'Avocado Bro'],
  CUBAN_PETE,
];
// pride squad: the regulars in LUCKY draw from it, everyone else meets it in the common pool, 4 times rarer
const PRIDE = [
  ['🦄', ['👑', -0.3, 0.18, -10], ['🏳️‍🌈', -0.1, 0.6, 0], 'Rainbow Unicorn'], ['🦩', ['🕶️', -0.26, 0.13, -10], ['🏳️‍🌈', -0.25, 0, 14], 'Pride Flamingo'], ['🦚', '', '🏳️‍🌈', 'Proud Peacock'],
  ['🐻', '🧢', ['🏳️‍🌈', 0.1, 0.6, 10], 'Pride Bear'], ['🐙', '🎩', ['🏳️‍🌈', 0, 0.15, 14], 'Fabulous Octopus'], ['🐂', ['🩰', -0.32, 0.25, -10], '🏳️‍🌈', 'Ballet Bull'],
];
// the common pool: each ordinary mascot 4 times, each pride one once
const POOL = [...MASCOTS.flatMap((m) => [m, m, m, m]), ...PRIDE];

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
.fight .mascot { position: absolute; z-index: 1; font-size: 300px; line-height: 1; font-style: normal; will-change: transform; filter: drop-shadow(0 10px 0 rgba(0,0,0,.4)); }
.fight .pow { position: absolute; z-index: 5; width: 330px; height: 214px; display: flex; align-items: center; justify-content: center;
  font: 400 66px/1 Bangers, Impact, 'Arial Black', sans-serif; color: #ffd400; letter-spacing: 2px; -webkit-text-stroke: 3.5px #4a1a00; pointer-events: none; } /* comic hit burst of the mascots' brawl: the word on a white spiky cloud (Bangers: style.css) */
.fight .pow .cloud { position: absolute; inset: 0; width: 100%; height: 100%; }
.fight .pow .w { position: relative; transform: rotate(var(--tilt, -6deg)); }
.fight .pow .lines { position: absolute; left: -55%; top: -55%; width: 210%; height: 210%; pointer-events: none; }
.fight .dropped { position: absolute; z-index: 1; line-height: 1; filter: drop-shadow(0 6px 0 rgba(0,0,0,.35)); } /* a prop put down for a fight */
.fight .dust { position: absolute; z-index: 1; width: 0; height: 0; pointer-events: none; } /* a cartoon dust cloud; (left, top) is its middle */
.fight .dust i { position: absolute; border-radius: 50%; background: #f3e6c8; box-shadow: 0 0 0 5px rgba(74,42,0,.3); }
.fight .mascot .hat { position: absolute; left: 50%; top: -.36em; font-size: .52em; transform: translateX(-50%) rotate(-10deg); }
.fight .mascot .item { position: absolute; right: -.18em; bottom: -.02em; font-size: .46em; transform: rotate(14deg); }
.fight .mascot .item.l { right: auto; left: -.18em; transform: rotate(-14deg); } /* the prop on the left (mascotInner mirrored) */
.fight .mascot .who { display: inline-block; position: relative; transform: scaleX(-1); } /* body and hat turned round */
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
  kc: { set: PRIDE, chance: 0.5 },
  david: { set: PRIDE, chance: 0.5 },
};
// every Pete (Peter, Pedro, Петя...) gets Cuban Pete in half the tournaments; the name only has to start so
const PETES = /^(pete|peter|petr|pyotr|piet|pietro|pierre|pedro|петя|петр|питер|пит)/;
const PETE = { set: [CUBAN_PETE], chance: 0.5 };

/** The player's set (LUCKY or the common pool) and their place in it: a hash of the player id (FNV-1a). */
function mascotPick(p) {
  const key = (p?.name || '').toLowerCase().replace(/[\s.]/g, '').replace(/ё/g, 'е');
  const lucky = LUCKY[key] || (PETES.test(key) ? PETE : null);
  if (!p?.id) { const set = lucky && Math.random() < lucky.chance ? lucky.set : POOL; return [set, Math.floor(Math.random() * set.length)]; }
  let h = 0x811c9dc5;
  for (let i = 0; i < p.id.length; i++) h = Math.imul(h ^ p.id.charCodeAt(i), 0x01000193) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0; // mix the bits: similar ids land far apart
  h = (h ^ (h >>> 16)) >>> 0;
  const set = lucky && ((h >>> 20) % 1000) / 1000 < lucky.chance ? lucky.set : POOL; // high bits: independent of the pick
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
    const m = free(set, start) || free(POOL, start % POOL.length) || set[start];
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

/**
 * A mascot's body, hat and prop as HTML (font-size sets its size); mirrored: the prop on the left (class l); look: the way it
 * should look (1 right, -1 left, 0 as drawn): a side-on body looking the other way is turned round, its hat with it.
 */
function mascotInner(m, mirrored = false, look = 0) {
  const [body, hat, item] = m;
  let html = emojify(body);
  if (Array.isArray(hat)) {
    const [h, dx, dy, deg] = hat;
    html += `<span class="hat" style="transform: translate(calc(-50% + ${dx}em), ${dy}em) rotate(${deg}deg)">${emojify(h)}</span>`;
  } else if (hat) html += `<span class="hat">${emojify(hat)}</span>`;
  if (look && facing(m) === -look) html = `<span class="who">${html}</span>`;
  if (Array.isArray(item)) {
    // [prop, dx, dy, deg] (em of the prop): moved off the body; mirrored for a mascot whose prop is on its left
    const [it, dx, dy, deg] = item;
    const k = mirrored ? -1 : 1;
    html += `<span class="item${mirrored ? ' l' : ''}" style="transform: translate(${k * dx}em, ${dy}em) rotate(${k * deg}deg)">${emojify(it)}</span>`;
  } else if (item) html += `<span class="item${mirrored ? ' l' : ''}">${emojify(item)}</span>`;
  return html;
}

/**
 * The player's mascot of this tournament (players: all, in join order) as HTML, for the podium; its size factor and
 * which way it looks as drawn (-1 left, 1 right, 0 at us).
 */
export function mascotHTML(p, players = []) {
  const m = mascotFor(p, players);
  // drawn as it is (the podium turns it round as a whole): a body looking left gets its prop on the left, in front of it
  return { html: mascotInner(m, facing(m) === -1), scale: m[4] ?? 1, facing: facing(m) };
}

export function createCall(root) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  root.innerHTML = `<div class="fight">
    <div class="ring">
      <div class="corner red"></div><div class="corner blue"></div><div class="gap"></div><div class="pattern"></div>${rays()}
      <div class="mascot m1"></div><div class="mascot m2"></div>
      <div class="sub">Now playing</div><div class="label"></div>
      <div class="name n1"></div><div class="vs">VS</div><div class="name n2"></div>
    </div>
    <div class="flash"></div><div class="bar"></div></div>`;
  const q = (sel) => root.querySelector(sel);
  const fight = q('.fight');
  const ring = q('.ring');
  let running = []; // animations of the current show, cancelled by the next one
  let timers = []; // timeouts of the current show (the mascots' fight), cleared by the next one

  const anim = (el, frames, opts) => {
    const a = el.animate(frames, opts);
    if (running.length > 400) running = running.filter((x) => x.playState !== 'finished'); // a screen that stays long
    running.push(a);
    return a;
  };
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

  function setMascot(n, m) {
    const scale = m[4] ?? 1;
    const box = q(`.mascot.m${n}`);
    // a mascot a little smaller or bigger than the rest: the font size (hat and prop follow), kept centred
    box.style.fontSize = scale === 1 ? '' : `${300 * scale}px`;
    box.style.marginLeft = scale === 1 ? '' : `${-150 * scale}px`;
    box.innerHTML = mascotInner(m, n === 2, n === 1 ? 1 : -1); // they look at each other; the right one's prop on the left
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

  // Where the mascots brawl: the three patches of the ring with no text on them (the title sits at 130-300, the left
  // name at 180-850 × 380-600, VS at 800-1120 × 510-730, the right name at 1070-1740 × 640-860). Each is the (left, top)
  // of the box between the two fighters: the pair takes 560 × 300 px round it.
  // bottom left, bottom left of centre, bottom centre, top right, top right corner, top left corner
  const SPOTS = [[190, 650], [410, 755], [640, 755], [1300, 330], [1520, 60], [150, 70]];
  const JITTER = [[40, 30], [30, 20], [20, 15], [60, 40], [15, 15], [15, 15]];
  const spot = (i) => [SPOTS[i][0] + rand(-JITTER[i][0], JITTER[i][0]), SPOTS[i][1] + rand(-JITTER[i][1], JITTER[i][1])];
  /** The SPOTS free of text now: the two at the top only where the title's text leaves room. */
  function spots() {
    const r = document.createRange();
    r.selectNodeContents(q('.sub'));
    const R = ring.getBoundingClientRect();
    const k = R.width / ring.offsetWidth;
    const t = r.getBoundingClientRect();
    const [left, right] = [(t.left - R.left) / k, (t.right - R.left) / k];
    const out = [0, 1, 2, 3];
    if (right < 1330) out.push(4);
    if (left > 660) out.push(5);
    return out;
  }
  /** The free spots in a random order, none twice before all have had their turn (a new round never starts where the last ended). */
  function spotOrder(last) {
    const free = spots();
    for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
    if (free.length > 1 && free[0] === last) free.push(free.shift());
    return free;
  }
  const rand = (a, b) => a + Math.random() * (b - a);
  const after = (ms, fn) => timers.push(setTimeout(fn, ms));

  /** A cartoon dust cloud of a few puffs at (x, y) of the ring that swells, drifts up and fades; k: its size. */
  function dust(x, y, k = 1) {
    const d = document.createElement('div');
    d.className = 'dust';
    d.style.left = `${x}px`;
    d.style.top = `${y}px`;
    const n = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const r = rand(70, 120) * k;
      const a = (i / n) * Math.PI + rand(-0.3, 0.3); // a half-ring lying on the floor
      d.insertAdjacentHTML('beforeend', `<i style="width:${r}px;height:${r}px;left:${Math.cos(a) * 120 * k - r / 2}px;top:${-Math.sin(a) * 45 * k - r / 2}px"></i>`);
    }
    ring.append(d);
    const ms = rand(800, 1100);
    d.animate([{ transform: 'scale(.3)', opacity: 1 }, { transform: 'translateY(-20px) scale(1)', opacity: 1, offset: 0.4 },
      { transform: `translate(${rand(-20, 20)}px, -60px) scale(1.35)`, opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
    after(ms + 50, () => d.remove());
  }

  /** A comic hit burst (POW!, BAM!… in a white spiky cloud) at (x, y) of the ring. */
  function pow(x, y) {
    const b = document.createElement('div');
    b.className = 'pow';
    b.innerHTML = burstHTML(['POW!', 'BAM!', 'WHAM!', 'BOOM!'][Math.floor(Math.random() * 4)]);
    b.style.left = `${x}px`;
    b.style.top = `${y}px`;
    b.style.setProperty('--tilt', `${rand(-14, 8).toFixed(0)}deg`); // each one a little different
    const k = rand(0.85, 1.1);
    const tilt = rand(-10, 10);
    ring.append(b);
    burstLines(b);
    b.animate([{ transform: 'translate(-50%, -50%) scale(.2) rotate(-20deg)', opacity: 1 }, { transform: `translate(-50%, -50%) scale(${k * 1.15}) rotate(${tilt + 8}deg)`, opacity: 1, offset: 0.2 },
      { transform: `translate(-50%, -50%) scale(${k * 1.05}) rotate(${tilt + 2}deg)`, opacity: 1, offset: 0.6 }, { transform: `translate(-50%, -50%) scale(${k}) rotate(${tilt}deg)`, opacity: 0 }], { duration: 650, easing: 'ease-out', fill: 'forwards' });
    after(700, () => b.remove());
  }

  /** The mascots as fighters: their box, which way they punch, home place in the ring, current shift from it and the shift
   * they will have when what is already scheduled has played (rounds are scheduled ahead). */
  const fighters = () => [1, 2].map((n) => {
    const el = q(`.mascot.m${n}`);
    return { el, dir: n === 1 ? 1 : -1, home: [el.offsetLeft, el.offsetTop], x: 0, y: 0, plan: [0, 0] };
  });

  /**
   * Before a fight the mascot tosses away what it holds: the prop flies a little behind it, away from the other one,
   * and lies there on the floor, left behind in the ring (a copy in the ring; the one in its hands is hidden till it picks it up again).
   */
  function putDown(f) {
    const it = f.el.querySelector('.item');
    if (!it || f.drop) return;
    const R = ring.getBoundingClientRect();
    const k = R.width / ring.offsetWidth; // the stage is scaled to the screen
    const r = it.getBoundingClientRect();
    const B = f.el.getBoundingClientRect();
    const [w, h] = [it.offsetWidth, it.offsetHeight];
    const [cx, cy] = [(r.left + r.width / 2 - R.left) / k, (r.top + r.height / 2 - R.top) / k];
    const m = new DOMMatrix(getComputedStyle(it).transform);
    const deg = (Math.atan2(m.b, m.a) * 180) / Math.PI;
    const back = -f.dir; // tossed a little behind it, away from the other one
    const lie = deg + back * rand(60, 110); // tumbles over in the air
    const dx = back * rand(140, 240);
    const dy = Math.max(0, (B.bottom - R.top) / k - h * 0.45 - cy); // down to the floor
    const d = document.createElement('div');
    d.className = 'dropped';
    d.innerHTML = it.innerHTML;
    Object.assign(d.style, { left: `${cx - w / 2}px`, top: `${cy - h / 2}px`, width: `${w}px`, height: `${h}px`, fontSize: getComputedStyle(it).fontSize });
    if (propsUnder) ring.insertBefore(d, q('.mascot.m1')); else ring.append(d); // a big match's brawl walks over them
    it.style.visibility = 'hidden';
    // a toss: up and back over its shoulder, down on the floor, a little bounce
    anim(d, [{ transform: `rotate(${deg}deg)`, easing: 'ease-out' },
      { transform: `translate(${dx * 0.45}px, -110px) rotate(${(deg + lie) / 2}deg)`, offset: 0.35, easing: 'ease-in' },
      { transform: `translate(${dx}px, ${dy}px) rotate(${lie}deg)`, offset: 0.75, easing: 'ease-out' },
      { transform: `translate(${dx * 1.08}px, ${dy - 12}px) rotate(${lie}deg)`, offset: 0.87, easing: 'ease-in' },
      { transform: `translate(${dx * 1.12}px, ${dy}px) rotate(${lie}deg)` }],
    { duration: 560, fill: 'forwards' });
    f.drop = { d, it, deg, lie, dx: dx * 1.12, dy, cx, cy };
  }
  /**
   * A big match opens with a throw: the mascot hurls its prop at the other one (`at` ms from now). The prop flies
   * spinning, hits (a burst, the other one reels), bounces off and falls on the floor by it, and lies there.
   */
  function throwAt(f, o, at) {
    const it = f.el.querySelector('.item');
    if (!it) return;
    after(at, () => {
      const R = ring.getBoundingClientRect();
      const k = R.width / ring.offsetWidth;
      const r = it.getBoundingClientRect();
      const O = o.el.getBoundingClientRect();
      const [w, h] = [it.offsetWidth, it.offsetHeight];
      const [cx, cy] = [(r.left + r.width / 2 - R.left) / k, (r.top + r.height / 2 - R.top) / k];
      const [ox, oy] = [(O.left + O.width / 2 - R.left) / k, (O.top + O.height * 0.45 - R.top) / k]; // its chest
      const m = new DOMMatrix(getComputedStyle(it).transform);
      const deg = (Math.atan2(m.b, m.a) * 180) / Math.PI;
      const [tx, ty] = [ox - cx, oy - cy];
      const spin = deg + f.dir * rand(540, 720);
      const lie = spin + f.dir * rand(60, 120);
      // bounced back off it, well away, down on the floor a little below its feet (kept on the screen)
      const fx = Math.max(80, Math.min(ring.offsetWidth - 80, cx + tx - f.dir * rand(200, 320))) - cx;
      const fy = Math.min(ring.offsetHeight - 120, (O.bottom - R.top) / k + rand(40, 110)) - h * 0.45 - cy;
      const d = document.createElement('div');
      d.className = 'dropped';
      d.innerHTML = it.innerHTML;
      Object.assign(d.style, { left: `${cx - w / 2}px`, top: `${cy - h / 2}px`, width: `${w}px`, height: `${h}px`, fontSize: getComputedStyle(it).fontSize });
      if (propsUnder) ring.insertBefore(d, q('.mascot.m1')); else ring.append(d); // a big match's brawl walks over them
      it.style.visibility = 'hidden';
      const FLY = 1250;
      const HIT = 0.3;
      const bx = fx + 0.12 * (fx - tx); // the little second hop, on the same way
      anim(d, [{ transform: `rotate(${deg}deg)`, easing: 'ease-out' },
        { transform: `translate(${tx / 2}px, ${Math.min(0, ty) / 2 - 120}px) rotate(${(deg + spin) / 2}deg)`, offset: HIT / 2, easing: 'ease-in' },
        { transform: `translate(${tx}px, ${ty}px) rotate(${spin}deg)`, offset: HIT, easing: 'ease-out' }, // the hit
        { transform: `translate(${tx + (fx - tx) * 0.45}px, ${ty - 150}px) rotate(${(spin + lie) / 2}deg)`, offset: 0.52, easing: 'ease-in' }, // up off it
        { transform: `translate(${fx}px, ${fy}px) rotate(${lie}deg)`, offset: 0.75, easing: 'ease-out' }, // the floor
        { transform: `translate(${(fx + bx) / 2}px, ${fy - 35}px) rotate(${lie + f.dir * -25}deg)`, offset: 0.86, easing: 'ease-in' },
        { transform: `translate(${bx}px, ${fy}px) rotate(${lie + f.dir * -40}deg)` }],
      { duration: FLY, fill: 'forwards' });
      after(FLY * HIT - 110, () => { // a touch before the prop's middle gets there: the burst has to grow, and the edge hits first
        pow(ox + rand(-30, 30), oy + rand(-30, 20));
        anim(o.el, [{ transform: `translate(${o.x}px, ${o.y}px)` }, { transform: `translate(${o.x + f.dir * 40}px, ${o.y - 12}px) rotate(${f.dir * 10}deg)`, offset: 0.3 },
          { transform: `translate(${o.x}px, ${o.y}px)` }], { duration: 380, easing: 'ease-out', fill: 'forwards' });
      });
      f.drop = { d, it, deg, lie: lie + f.dir * -40, dx: bx, dy: fy, cx, cy };
    });
  }
  /** Back home: it picks its prop up again, the prop flies back into its hands. */
  function pickUp(f) {
    if (!f.drop) return;
    const { d, it, deg, lie, dx, dy, cx, cy } = f.drop;
    f.drop = null;
    const R = ring.getBoundingClientRect();
    const k = R.width / ring.offsetWidth;
    const r = it.getBoundingClientRect();
    const [tx, ty] = [(r.left + r.width / 2 - R.left) / k - cx, (r.top + r.height / 2 - R.top) / k - cy];
    anim(d, [{ transform: `translate(${dx}px, ${dy}px) rotate(${lie}deg)` }, { transform: `translate(${(dx + tx) / 2}px, ${Math.min(dy, ty) - 60}px) rotate(${deg}deg)`, offset: 0.5 },
      { transform: `translate(${tx}px, ${ty}px) rotate(${deg}deg)` }], { duration: 380, easing: 'ease-out', fill: 'forwards' });
    after(390, () => { d.remove(); it.style.visibility = ''; });
  }
  /** Both hop, `at` ms from now, to their shifts `to` ([[x, y], [x, y]]); returns when they have landed. */
  function hopTo(fs, to, at, wild) {
    const hopMs = wild ? 300 : 380;
    const hops = wild ? 2 : 3;
    fs.forEach((f, k) => {
      const [x0, y0] = f.plan;
      const [tx, ty] = to[k];
      f.plan = [tx, ty];
      for (let i = 1; i <= hops; i++) {
        after(at + (i - 1) * hopMs + k * 120, () => {
          const [fx, fy] = [f.x, f.y];
          [f.x, f.y] = [x0 + (tx - x0) * i / hops, y0 + (ty - y0) * i / hops];
          anim(f.el, [
            { transform: `translate(${fx}px, ${fy}px)` }, { transform: `translate(${(fx + f.x) / 2}px, ${(fy + f.y) / 2 - 90}px) scale(.95, 1.06)`, offset: 0.5 },
            { transform: `translate(${f.x}px, ${f.y}px) scale(1.1, .88)`, offset: 0.9 }, { transform: `translate(${f.x}px, ${f.y}px)` }],
          { duration: hopMs, easing: 'linear', fill: 'forwards' });
          // a puff of dust from under the feet where it lands
          const [lx, ly] = [f.home[0] + f.x + 150, f.home[1] + f.y + 290];
          after(hopMs * 0.85, () => dust(lx, ly, wild ? 0.9 : 0.75));
        });
      }
    });
    return at + hops * hopMs + 120;
  }

  /**
   * Both hop to (mx, my) of the ring (left and top of a box right between them: side by side, half a body apart, m1 on the left; one of SPOTS) and
   * pound each other there in turns, comic bursts between them; nobody wins, nobody is knocked away. wild: the big-match
   * frenzy: faster, harder, now and then two in a row, the screen shakes. Returns when it ends (ms from now). Transforms only.
   */
  function scuffle(fs, mx, my, at, hits, wild) {
    const t0 = hopTo(fs, fs.map((f, k) => [mx + (k ? 130 : -130) - f.home[0], my - f.home[1]]), at, wild) + (wild ? 60 : 80);
    const step = wild ? 210 : 300;
    const reach = wild ? 80 : 60;
    let turn = 1;
    for (let i = 0; i < hits; i++) {
      if (!(wild && i && Math.random() < 0.3)) turn = 1 - turn;
      const f = fs[turn];
      const o = fs[1 - turn];
      after(t0 + i * step, () => {
        const px = f.dir * reach;
        const deg = f.dir * (wild ? 14 : 10);
        anim(f.el, [{ transform: `translate(${f.x}px, ${f.y}px)` }, { transform: `translate(${f.x + px}px, ${f.y}px) rotate(${deg}deg)`, offset: 0.4 },
          { transform: `translate(${f.x}px, ${f.y}px)` }], { duration: step - 50, easing: 'ease-out', fill: 'forwards' });
        anim(o.el, [{ transform: `translate(${o.x}px, ${o.y}px)` }, { transform: `translate(${o.x + px * 0.35}px, ${o.y}px) rotate(${deg * 0.6}deg)`, offset: 0.5 },
          { transform: `translate(${o.x}px, ${o.y}px)` }], { duration: step - 50, delay: 70, fill: 'forwards' });
        pow(mx + 150 + rand(-90, 90), my + 110 + rand(-30, 60)); // between the two, never above them (a name may be there), somewhere else each time
        // the scuffle raises dust around their feet
        if (i % 2 === 0) dust(mx + 150 + rand(-140, 140), my + 280 + rand(-20, 20), wild ? 1.3 : 1);
      });
      impact(t0 + i * step + 60, wild && i % 3 === 2 ? 9 : 4); // every hit jolts the screen a little, a big match's third one more
    }
    return t0 + hits * step + 150;
  }

  /**
   * A plain match: both hop under VS, trade punches and hop back home; again a few seconds later while the screen
   * still has time for a whole one (`left`: ms the screen stays from now).
   */
  let propsUnder = false; // a prop lying in the ring: over the mascots on a plain match, under them in a big match's brawl all over the ring
  function brawl(bobs, bob, left) {
    propsUnder = false;
    bobs[1]?.cancel();
    bobs[2]?.cancel();
    const fs = fighters();
    fs.forEach(putDown); // props tossed aside first, then off to fight
    const [sx, sy] = spot(2); // under VS, between the names
    const end = scuffle(fs, sx, sy, 650, 6 + Math.floor(Math.random() * 3), false);
    const home = hopTo(fs, [[0, 0], [0, 0]], end, false) + 100;
    after(home, () => { fs.forEach(pickUp); bob(1, 0); bob(2, 0); });
    const next = home + rand(3000, 7000);
    if (left - next > 9000) after(next, () => brawl(bobs, bob, left - next));
  }

  /**
   * A big match: from the start to the end of the show the mascots fight all over the screen: hop to a random spot,
   * a furious exchange, on to the next spot far from the last one.
   */
  function frenzy(bobs, ms) {
    propsUnder = true;
    bobs[1]?.cancel();
    bobs[2]?.cancel();
    const fs = fighters();
    // a moment to take in the screen, then one hurls its prop at the other, the other hurls back, then they go at it;
    // the props stay on the floor (this fight never comes back home)
    const [first, second] = Math.random() < 0.5 ? fs : [fs[1], fs[0]];
    const T1 = 1500;
    const T2 = T1 + 1800; // hit, reel, a second to get angry
    throwAt(first, second, T1);
    throwAt(second, first, T2);
    let last = -1;
    let queue = [];
    // planned a minute at a time (a screen that stays long would otherwise get all its fights at once)
    const plan = (left, t0 = T2 + 1400) => { // when the second prop has landed
      let t = t0;
      while (t < Math.min(left, 60000)) {
        // the text-free patches in a random order, each once before any again; straight on from one to the next
        if (!queue.length) queue = spotOrder(last);
        const i = queue.shift();
        last = i;
        const [mx, my] = spot(i);
        t = scuffle(fs, mx, my, t, 6 + Math.floor(Math.random() * 7), true);
      }
      if (left > t) after(t, () => plan(left - t, 0));
    };
    plan(ms);
  }

  return {
    /** m: match view (p1, p2, label); hype: why it is a big match ('' if not), shown as the title; ms: how long the screen stays; players: all, in join order. */
    show(m, hype, ms, players = []) {
      running.forEach((a) => a.cancel());
      running = [];
      timers.forEach(clearTimeout);
      timers = [];
      ring.querySelectorAll('.pow, .dust, .dropped').forEach((x) => x.remove());
      q('.label').textContent = m.label || '';

      q('.pattern').className = `pattern p-${pick(PATTERNS)}`;
      fight.classList.toggle('important', !!hype);
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
      // a big match: they fight all over the screen as soon as VS has landed; a plain one: once, somewhere in the middle, under VS
      if (hype) after(TV + 500, () => frenzy(bobs, ms - TV - 500));
      else if (ms > 9000) { const at = rand(5500, Math.min(10000, ms - 7000)); after(at, () => brawl(bobs, bob, ms - at)); }
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
