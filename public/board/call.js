// «Now playing» call screen, fight-night style (designed in /lab/): who goes to the table right now.
// Red corner left, blue corner right, a random background pattern, two random mascots, the names punch in
// from opposite sides, VS slams down, then an idle motion. Fire along the bottom only for important matches.
// Light for a TV browser: transforms and opacity only, few and small layers (big or many layers made the TV lag and flicker).

const PATTERNS = [
  'halftone', 'chevron', 'checker', 'felt', 'sunburst', 'stripes',
  'dots', 'crosshatch', 'zigzag', 'argyle', 'grid', 'plaid', 'triangles',
];
const IDLES = ['drift', 'sway', 'heartbeat', 'stare-down', 'adrenaline'];

// [body, hat, prop, name]
const MASCOTS = [
  ['🐶', '🎩', '🥊', 'Gentleman Pug'], ['🐱', '👑', '🥊', 'King Cat'], ['🐸', '🕶️', '', 'Cool Frog'],
  ['🐷', '🎓', '📚', 'Professor Pig'], ['🐔', '🪖', '🥊', 'Army Chicken'], ['🦆', '🧢', '', 'Duck in a Cap'],
  ['🐻', '🤠', '🌵', 'Cowboy Bear'], ['🦜', '🏴‍☠️', '⚔️', 'Pirate Parrot'], ['🐵', '', '🍌', 'Banana Monkey'],
  ['🐼', '🎀', '🎋', 'Panda with a Bow'], ['🦖', '', '🥊', 'Tiny-arms T-Rex'], ['🐙', '🎩', '🎱', 'Octopus Hustler'],
  ['🦈', '🕶️', '🎱', 'Pool Shark'], ['🐢', '⛑️', '', 'Safety Turtle'], ['🦄', '', '🎸', 'Rock Unicorn'],
  ['🐧', '🎩', '🌹', 'Penguin in a Tux'], ['🐮', '🤠', '🥛', 'Cowboy Cow'], ['🦊', '🕶️', '💰', 'Sly Fox'],
  ['🐭', '', '🧀', 'Mouse with Cheese'], ['🐉', '', '🔥', 'Dragon'], ['🥔', '🕶️', '🍟', 'Cool Potato'],
  ['🦘', '', '🥊', 'Boxing Kangaroo'], ['🦁', '👑', '', 'Lion King'], ['🐯', '🧢', '🥊', 'Tiger in a Cap'],
  ['🐺', '🕶️', '🌙', 'Night Wolf'], ['🦝', '🎩', '💰', 'Bandit Raccoon'], ['🦙', '🎩', '☕', 'Fancy Llama'],
  ['🐐', '🎓', '🎺', 'Jazz Goat'], ['🦩', '🕶️', '🍹', 'Party Flamingo'], ['🐊', '🧢', '🦷', 'Smiley Croc'],
  ['🦦', '', '🐟', 'Hungry Otter'], ['🐿️', '🪖', '🌰', 'Squirrel Soldier'], ['🦔', '🎉', '🎈', 'Birthday Hedgehog'],
  ['🦀', '', '🥊', 'Crab Boxer'], ['🐳', '🎩', '🎻', 'Whale Maestro'], ['🐌', '⛑️', '🏎️', 'Racing Snail'],
  ['🦥', '', '☕', 'Sleepy Sloth'], ['🦉', '🎓', '📜', 'Wise Owl'], ['🐝', '', '🍯', 'Busy Bee'],
  ['🐰', '🎩', '🥕', 'Magic Bunny'], ['🐗', '🪖', '🍺', 'Beer Boar'], ['🤖', '', '🔧', 'Robo Champ'],
  ['👽', '', '🛸', 'Alien Visitor'], ['👻', '🎩', '🎱', 'Ghost of the Table'], ['🌵', '🤠', '', 'Cactus Cowboy'],
  ['🍕', '🕶️', '', 'Pizza Boss'], ['🍔', '👑', '🍟', 'Burger King'], ['🥑', '🧢', '', 'Avocado Bro'],
  // pride squad
  ['🦄', '👑', '🏳️‍🌈', 'Rainbow Unicorn'], ['🦩', '🕶️', '🏳️‍🌈', 'Pride Flamingo'], ['🦚', '', '🏳️‍🌈', 'Proud Peacock'],
  ['🐻', '🧢', '🏳️‍🌈', 'Pride Bear'], ['🐙', '🎩', '🏳️‍🌈', 'Fabulous Octopus'],
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
  color: #ffd400; text-shadow: 0 0 50px rgba(0,0,0,.45); will-change: transform; }
.fight .mascot { position: absolute; z-index: 1; font-size: 300px; line-height: 1; font-style: normal; will-change: transform; filter: drop-shadow(0 10px 0 rgba(0,0,0,.4)); }
.fight .mascot .hat { position: absolute; left: 50%; top: -.36em; font-size: .52em; transform: translateX(-50%) rotate(-10deg); }
.fight .mascot .item { position: absolute; right: -.18em; bottom: -.02em; font-size: .46em; transform: rotate(14deg); }
.fight .mascot.m2 .item { right: auto; left: -.18em; transform: rotate(-14deg); }
/* left mascot right under the left name (380-600), right mascot right above the right name (640-860); centred on the names */
.fight .mascot.m1 { left: 515px; top: 615px; transform-origin: 50% 50%; margin-left: -150px; }
.fight .mascot.m2 { left: 1525px; top: 325px; margin-left: -150px; }
/* fire for important matches: the classic pixel «Doom fire» on a tiny canvas, stretched over the bottom with crisp
   pixels (cheaper for the TV than smoothing, and it looks like a game); its own layer, so redrawing it repaints nothing else.
   Once replaced by SVG tongues because the TV choked; the culprit then was more likely the huge rotating ray layers. */
.fight canvas.fire { position: absolute; left: 0; bottom: 60px; width: 2040px; height: 440px; z-index: 1; pointer-events: none; display: none;
  image-rendering: pixelated; image-rendering: crisp-edges; will-change: transform; }
.fight.important canvas.fire { display: block; }
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

// Classic «Doom fire» (85×32 cells, big pixels): heat rises from the bottom row, cools and drifts sideways; 20 frames a second.
function makeFire(cv) {
  const ctx = cv.getContext('2d');
  const FW = cv.width;
  const FH = cv.height;
  const MAX = 36;
  const heat = new Uint8Array(FW * FH);
  const pal = []; // black -> red -> orange -> yellow -> white; low heat is transparent
  for (let k = 0; k <= MAX; k++) {
    const t = k / MAX;
    pal.push([
      Math.min(255, Math.round(255 * Math.min(1, t * 2.2))),
      Math.round(255 * Math.max(0, Math.min(1, (t - 0.35) * 1.8))),
      Math.round(255 * Math.max(0, (t - 0.8) * 4)),
      Math.round(255 * Math.min(1, t * 3.5)),
    ]);
  }
  const img = ctx.createImageData(FW, FH);
  for (let x = 0; x < FW; x++) heat[(FH - 1) * FW + x] = MAX;
  let running = false;
  let last = 0;
  function step() {
    for (let x = 0; x < FW; x++) {
      for (let y = 1; y < FH; y++) {
        const src = y * FW + x;
        const r = (Math.random() * 3.6) | 0;
        const dst = src - FW - (r & 1) + ((Math.random() * 1.6) | 0);
        if (dst >= 0) heat[dst] = Math.max(0, heat[src] - (r > 2 ? 3 : (r & 1) * 2)); // ~1.25 a row: dies out before the top
      }
    }
    const d = img.data;
    for (let k = 0; k < heat.length; k++) {
      const c = pal[heat[k]];
      d[k * 4] = c[0]; d[k * 4 + 1] = c[1]; d[k * 4 + 2] = c[2]; d[k * 4 + 3] = c[3];
    }
    ctx.putImageData(img, 0, 0);
  }
  function frame(now) {
    if (!running) return;
    if (cv.offsetParent === null) { running = false; return; } // hidden without stop(): nothing to burn for
    if (now - last > 50) { step(); last = now; }
    requestAnimationFrame(frame);
  }
  return {
    start() { if (!running) { running = true; requestAnimationFrame(frame); } },
    stop() { running = false; },
  };
}

// The Ballet Bull, drawn after one friend: quiff, full short beard, white oversized tee, plus a pink tutu, pointe shoes,
// hooves over the head in fifth position and a rainbow flag.
const BALLET_BULL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="1em" height="1em" style="display:block"><path d="M182 168 C214 160 226 132 214 118" fill="none" stroke="#5e3820" stroke-width="5" stroke-linecap="round"/><path d="M214 118 c-8 -6 -2 -16 4 -12 c6 -6 12 4 6 9 c6 4 -2 12 -10 3z" fill="#3b2414"/><path d="M168 190 C196 196 210 214 204 230 C198 244 176 244 160 238" fill="none" stroke="#6b4126" stroke-width="22" stroke-linecap="round"/><path d="M166 230 c-10 -2 -18 6 -14 13 c4 6 14 4 18 -2z" fill="#ff9ccc" stroke="#d9579a" stroke-width="2"/><path d="M146 190 C144 220 146 250 148 272" fill="none" stroke="#6b4126" stroke-width="22" stroke-linecap="round"/><path d="M138 266 L158 252 M158 266 L138 252 M140 252 L156 240" stroke="#ff9ccc" stroke-width="3.5" stroke-linecap="round"/><path d="M138 262 C136 278 142 292 149 294 C156 292 161 278 158 262z" fill="#ff9ccc" stroke="#d9579a" stroke-width="2"/><rect x="143" y="289" width="12" height="5" rx="2" fill="#f6c1dd" stroke="#d9579a" stroke-width="1.5"/><path d="M112 112 C104 140 106 172 118 192 L182 192 C194 172 196 140 188 112 C172 98 128 98 112 112z" fill="#f4f1e8"/><path d="M120 150 C124 168 130 184 134 192 M176 140 C178 160 176 178 172 192" fill="none" stroke="#d9d4c4" stroke-width="3" stroke-linecap="round"/><path d="M136 104 Q150 114 164 104" fill="none" stroke="#d9d4c4" stroke-width="3"/><path d="M84 186 Q96 170 108 184 Q120 168 132 182 Q144 166 156 182 Q168 166 180 182 Q192 168 204 184 Q216 172 220 188 Q190 206 150 206 Q108 206 84 186z" fill="#ff8fc8"/><path d="M90 180 Q104 160 118 176 Q132 158 146 174 Q160 158 174 174 Q188 160 202 178 Q214 166 214 182 Q186 196 150 196 Q112 196 90 180z" fill="#ffb3da"/><path d="M104 176 Q150 156 196 176 Q176 186 150 186 Q122 186 104 176z" fill="#ffd3ea"/><path d="M120 120 C96 100 98 60 124 44" fill="none" stroke="#7a4a2a" stroke-width="18" stroke-linecap="round"/><path d="M180 120 C204 100 202 60 176 44" fill="none" stroke="#7a4a2a" stroke-width="18" stroke-linecap="round"/><path d="M104 108 C108 96 122 92 132 102 L124 124 C114 124 106 118 104 108z" fill="#f4f1e8"/><path d="M196 108 C192 96 178 92 168 102 L176 124 C186 124 194 118 196 108z" fill="#f4f1e8"/><ellipse cx="128" cy="40" rx="10" ry="8" fill="#3b2414" transform="rotate(-30 128 40)"/><ellipse cx="172" cy="40" rx="10" ry="8" fill="#3b2414" transform="rotate(30 172 40)"/><line x1="176" y1="46" x2="208" y2="2" stroke="#8a6a3a" stroke-width="4" stroke-linecap="round"/><g transform="translate(206 4) rotate(12)"><path d="M0 0 C14 -6 26 6 44 0 L44 6 C26 12 14 0 0 6z" fill="#e40303"/><path d="M0 6 C14 0 26 12 44 6 L44 12 C26 18 14 6 0 12z" fill="#ff8c00"/><path d="M0 12 C14 6 26 18 44 12 L44 18 C26 24 14 12 0 18z" fill="#ffed00"/><path d="M0 18 C14 12 26 24 44 18 L44 24 C26 30 14 18 0 24z" fill="#008026"/><path d="M0 24 C14 18 26 30 44 24 L44 30 C26 36 14 24 0 30z" fill="#24408e"/><path d="M0 30 C14 24 26 36 44 30 L44 36 C26 42 14 30 0 36z" fill="#732982"/></g><path d="M120 70 C100 66 92 52 98 40 C104 54 114 58 126 60z" fill="#f3e6c4" stroke="#c9b48a" stroke-width="2"/><path d="M180 70 C200 66 208 52 202 40 C196 54 186 58 174 60z" fill="#f3e6c4" stroke="#c9b48a" stroke-width="2"/><ellipse cx="114" cy="80" rx="12" ry="6" fill="#6b4126" transform="rotate(20 114 80)"/><ellipse cx="186" cy="80" rx="12" ry="6" fill="#6b4126" transform="rotate(-20 186 80)"/><ellipse cx="150" cy="80" rx="34" ry="30" fill="#7a4a2a"/><path d="M124 64 C122 46 132 34 146 30 C154 22 172 22 180 32 C176 32 172 34 170 36 C178 42 180 52 176 62 C168 54 158 52 148 54 C138 55 130 58 124 64z" fill="#1f1a17"/><path d="M136 46 C144 34 160 30 172 32 M140 52 C148 42 162 40 172 44" fill="none" stroke="#3a312b" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="136" cy="76" rx="6" ry="7" fill="#fff"/><circle cx="137" cy="77" r="3.5" fill="#1a1a1a"/><ellipse cx="164" cy="76" rx="6" ry="7" fill="#fff"/><circle cx="163" cy="77" r="3.5" fill="#1a1a1a"/><path d="M128 67 Q136 63 143 66 M157 66 Q164 63 172 67" fill="none" stroke="#1f1a17" stroke-width="4.5" stroke-linecap="round"/><path d="M118 86 C118 112 132 126 150 126 C168 126 182 112 182 86 C176 100 166 108 150 108 C134 108 124 100 118 86z" fill="#241a14"/><ellipse cx="150" cy="98" rx="20" ry="13" fill="#e8b49a"/><ellipse cx="143" cy="97" rx="3.5" ry="4.5" fill="#5e3820"/><ellipse cx="157" cy="97" rx="3.5" ry="4.5" fill="#5e3820"/><path d="M143 104 C143 113 157 113 157 104" fill="none" stroke="#f2c230" stroke-width="3.5"/></svg>`;

// Personal mascots of regulars: always theirs, never in the random pool. Key: the name in lower case without spaces and dots.
// [body, hat, item, nickname, picture]: with a picture, it is drawn instead of the emoji.
const PERSONAL = {
  kc: ['🐂', '', '', 'Ballet Bull', BALLET_BULL], // a friend's running joke
};

/** The player's mascot: a personal one by name, else a hash of the player id (FNV-1a), random if there is no id. */
function mascotFor(p) {
  const own = PERSONAL[(p?.name || '').toLowerCase().replace(/[\s.]/g, '')];
  if (own) return own;
  if (!p?.id) return MASCOTS[Math.floor(Math.random() * MASCOTS.length)];
  let h = 0x811c9dc5;
  for (let i = 0; i < p.id.length; i++) h = Math.imul(h ^ p.id.charCodeAt(i), 0x01000193) >>> 0;
  return MASCOTS[h % MASCOTS.length];
}

export function createCall(root) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  root.innerHTML = `<div class="fight">
    <div class="ring">
      <div class="corner red"></div><div class="corner blue"></div><div class="gap"></div><div class="pattern"></div>${rays()}
      <canvas class="fire" width="85" height="32"></canvas>
      <div class="mascot m1"></div><div class="mascot m2"></div>
      <div class="sub">Now playing</div><div class="label"></div>
      <div class="name n1"></div><div class="vs">VS</div><div class="name n2"></div>
    </div>
    <div class="flash"></div><div class="bar"></div></div>`;
  const q = (sel) => root.querySelector(sel);
  const fight = q('.fight');
  const ring = q('.ring');
  const fire = makeFire(q('canvas.fire'));
  let running = []; // animations of the current show, cancelled by the next one

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

  function setMascot(n, [body, hat, item, , picture]) {
    const box = q(`.mascot.m${n}`);
    if (picture) { box.innerHTML = picture; return; }
    box.textContent = body;
    if (hat) box.insertAdjacentHTML('beforeend', `<span class="hat">${hat}</span>`);
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
    anim(q('.flash'), [{ opacity: power / 60 }, { opacity: 0 }], { duration: 260, delay: at, easing: 'ease-out' });
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
    /** m: match view (p1, p2, label); important: fire along the bottom; ms: how long the screen stays. */
    show(m, important, ms) {
      running.forEach((a) => a.cancel());
      running = [];
      q('.label').textContent = m.label || '';

      q('.pattern').className = `pattern p-${pick(PATTERNS)}`;
      fight.classList.toggle('important', !!important);
      if (important) fire.start(); else fire.stop();
      // each player keeps one mascot for the whole tournament: it comes from the player's id, which is new in every
      // tournament, so next time the same name most likely gets another one
      const m1 = mascotFor(m.p1);
      let m2 = mascotFor(m.p2);
      if (m2 === m1) m2 = MASCOTS[(MASCOTS.indexOf(m1) + 1) % MASCOTS.length]; // two players with the same mascot: the next one
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
      anim(q('.bar'), [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: ms, easing: 'linear', fill: 'forwards' });
    },
    hide() {
      running.forEach((a) => a.cancel());
      running = [];
      fire.stop();
    },
  };
}
