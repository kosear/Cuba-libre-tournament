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
];
// pride squad: only for the regulars in LUCKY, never in the common pool
const PRIDE = [
  ['🦄', '👑', '🏳️‍🌈', 'Rainbow Unicorn'], ['🦩', '🕶️', '🏳️‍🌈', 'Pride Flamingo'], ['🦚', '', '🏳️‍🌈', 'Proud Peacock'],
  ['🐻', '🧢', '🏳️‍🌈', 'Pride Bear'], ['🐙', '🎩', '🏳️‍🌈', 'Fabulous Octopus'], ['🐂', '🩰', '🏳️‍🌈', 'Ballet Bull'],
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
.fight canvas.fire { position: absolute; left: 0; bottom: 60px; width: 2040px; height: 330px; z-index: 1; pointer-events: none; display: none;
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

// Classic «Doom fire» (85×28 cells, big pixels): heat rises from the bottom row, cools and drifts sideways; 20 frames a second.
// The bottom row is not equally hot: hot spots wander slowly along it, so tongues of different heights, not a wall.
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
  let running = false;
  let last = 0;
  let t = Math.random() * 100;
  function step() {
    t += 0.05;
    for (let x = 0; x < FW; x++) {
      const u = x / FW;
      const m = 0.78 + 0.3 * Math.sin(u * 7 + t * 0.7) * Math.sin(u * 3.1 - t * 0.4) + 0.12 * Math.sin(u * 19 + t * 1.3);
      heat[(FH - 1) * FW + x] = Math.round(MAX * Math.max(0.45, Math.min(1, m)));
    }
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

// Some regulars draw from a set of their own (a friendly running joke): `chance` of the tournaments, else the common
// pool. Decided by their id like everyone else, so it stays for the tournament and looks like plain luck.
// Key: the name in lower case without spaces and dots.
const LUCKY = {
  kc: { set: PRIDE, chance: 1 },
  david: { set: PRIDE, chance: 0.5 },
};

/** The player's mascot: a hash of the player id (FNV-1a) into their set (LUCKY or the common pool). */
function mascotFor(p) {
  const lucky = LUCKY[(p?.name || '').toLowerCase().replace(/[\s.]/g, '')];
  if (!p?.id) return MASCOTS[Math.floor(Math.random() * MASCOTS.length)];
  let h = 0x811c9dc5;
  for (let i = 0; i < p.id.length; i++) h = Math.imul(h ^ p.id.charCodeAt(i), 0x01000193) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0; // mix the bits: similar ids land far apart
  h = (h ^ (h >>> 16)) >>> 0;
  const set = lucky && ((h >>> 20) % 1000) / 1000 < lucky.chance ? lucky.set : MASCOTS; // high bits: independent of the pick
  return set[h % set.length];
}

export function createCall(root) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  root.innerHTML = `<div class="fight">
    <div class="ring">
      <div class="corner red"></div><div class="corner blue"></div><div class="gap"></div><div class="pattern"></div>${rays()}
      <canvas class="fire" width="85" height="28"></canvas>
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

  function setMascot(n, [body, hat, item]) {
    const box = q(`.mascot.m${n}`);
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
