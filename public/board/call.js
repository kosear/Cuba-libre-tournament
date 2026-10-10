// «Now playing» call screen, fight-night style (designed in /lab/): who goes to the table right now.
// Red corner left, blue corner right, a random background pattern, two random mascots, the names punch in
// from opposite sides, VS slams down, then an idle motion. Real fire along the bottom only for important matches.
// Light for a TV browser: transforms and opacity only; the fire is a tiny canvas stretched by CSS.

const PATTERNS = [
  'halftone', 'carbon', 'chevron', 'ropes', 'checker', 'felt', 'sunburst', 'stripes',
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

const CSS = `
.fight { position: absolute; inset: 0; overflow: hidden; background: #0b0d14; color: #fff; }
.fight .ring { position: absolute; inset: -60px; will-change: transform; } /* bigger than the stage: shaking never shows the edges */
.fight .corner { position: absolute; inset: 0; }
.fight .red { background: linear-gradient(115deg, #7a0016 0%, #c8102e 49%, transparent 49.1%); }
.fight .blue { background: linear-gradient(115deg, transparent 50.9%, #1d4fbf 51%, #0a1f5c 100%); }
/* the band between the corners: solid Honda Monkey orange, above the background pattern */
.fight .gap { position: absolute; inset: 0; z-index: 1; background: linear-gradient(115deg, transparent 49%, #f47b20 49.1%, #f47b20 50.9%, transparent 51%); }
/* anime speed lines: bold spikes (SVG drawn once, see rays()); the whole fan turns slowly and jitters in small jerks.
   Outer box: slow rotation; inner svg: the jitter. Only transforms change, nothing is repainted. */
.fight .rays { position: absolute; left: -300px; top: -360px; width: 2520px; height: 1800px; z-index: 1; pointer-events: none;
  will-change: transform; animation: rays-turn 60s linear infinite; } /* bigger than the stage: corners stay covered while it turns */
.fight .rays.r2 { animation-duration: 90s; animation-direction: reverse; opacity: .45; }
.fight .rays svg { width: 100%; height: 100%; display: block; will-change: transform; animation: rays-jitter .32s infinite; }
.fight .rays.r2 svg { animation-duration: .4s; animation-delay: -.15s; }
@keyframes rays-turn { to { transform: rotate(360deg); } }
@keyframes rays-jitter {
  0% { transform: translate(0, 0) scale(1); animation-timing-function: steps(1); }
  25% { transform: translate(6px, -4px) scale(1.012); animation-timing-function: steps(1); }
  50% { transform: translate(-5px, 3px) scale(.995); animation-timing-function: steps(1); }
  75% { transform: translate(3px, 6px) scale(1.008); animation-timing-function: steps(1); }
}
.fight .flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; z-index: 8; }
.fight .pattern { position: absolute; inset: 0; pointer-events: none; }
.p-halftone { opacity: .35; background: radial-gradient(circle, #000 0 38%, transparent 40%) 0 0 / 22px 22px;
  -webkit-mask: radial-gradient(ellipse at center, transparent 25%, #000 85%); mask: radial-gradient(ellipse at center, transparent 25%, #000 85%); }
.p-carbon { opacity: .28; background:
  linear-gradient(27deg, #000 5px, transparent 5px) 0 5px / 20px 20px, linear-gradient(207deg, #000 5px, transparent 5px) 10px 0 / 20px 20px,
  linear-gradient(27deg, #222 5px, transparent 5px) 0 10px / 20px 20px, linear-gradient(207deg, #222 5px, transparent 5px) 10px 5px / 20px 20px,
  linear-gradient(90deg, #1b1b1b 10px, transparent 10px) 0 0 / 20px 20px,
  linear-gradient(#1d1d1d 25%, #1a1a1a 25%, #1a1a1a 50%, transparent 50%, transparent 75%, #242424 75%, #242424) 0 0 / 20px 20px; }
.p-chevron { opacity: .16; background:
  linear-gradient(135deg, #fff 25%, transparent 25%) -60px 0 / 120px 120px, linear-gradient(225deg, #fff 25%, transparent 25%) -60px 0 / 120px 120px,
  linear-gradient(315deg, #fff 25%, transparent 25%) 0 0 / 120px 120px, linear-gradient(45deg, #fff 25%, transparent 25%) 0 0 / 120px 120px; }
.p-ropes { background:
  linear-gradient(transparent 0 calc(30% - 9px), rgba(255,255,255,.22) calc(30% - 9px) calc(30% + 9px), transparent 0),
  linear-gradient(transparent 0 calc(52% - 9px), rgba(255,255,255,.22) calc(52% - 9px) calc(52% + 9px), transparent 0),
  linear-gradient(transparent 0 calc(74% - 9px), rgba(255,255,255,.22) calc(74% - 9px) calc(74% + 9px), transparent 0); }
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
.fight .name { position: absolute; z-index: 2; width: 670px; height: 220px; display: flex; align-items: center; justify-content: center; text-align: center;
  font-size: 150px; line-height: 1; font-weight: 900; font-style: italic; text-transform: uppercase; will-change: transform;
  text-shadow: 0 8px 0 rgba(0,0,0,.5), 0 0 40px rgba(0,0,0,.35); }
.fight .name span { display: block; max-width: 100%; }
.fight .n1 { left: 180px; top: 380px; }
.fight .n2 { right: 180px; top: 640px; }
.fight .vs { position: absolute; z-index: 3; left: 0; right: 0; top: 510px; text-align: center; font-size: 220px; line-height: 220px; font-weight: 900; font-style: italic;
  color: #ffd400; text-shadow: 0 0 50px rgba(0,0,0,.45); will-change: transform; }
.fight .mascot { position: absolute; z-index: 1; font-size: 300px; line-height: 1; font-style: normal; will-change: transform; filter: drop-shadow(0 10px 0 rgba(0,0,0,.4)); }
.fight .mascot .hat { position: absolute; left: 50%; top: -.36em; font-size: .52em; transform: translateX(-50%) rotate(-10deg); }
.fight .mascot .item { position: absolute; right: -.18em; bottom: -.02em; font-size: .46em; transform: rotate(14deg); }
.fight .mascot.m2 .item { right: auto; left: -.18em; transform: rotate(-14deg); }
.fight .mascot.m1 { left: 70px; top: 170px; }
.fight .mascot.m2 { right: 70px; top: 700px; }
.fight .mname { position: absolute; z-index: 1; font-size: 26px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,.75); }
.fight .mname.m1 { left: 80px; top: 120px; }
.fight .mname.m2 { right: 80px; bottom: 120px; }
.fight canvas.fire { position: absolute; left: 0; bottom: 60px; width: 2040px; height: 460px; z-index: 1; pointer-events: none; display: none; }
.fight.important canvas.fire { display: block; }
.fight .bar { position: absolute; left: 0; bottom: 0; height: 12px; width: 100%; background: #ffd400; transform-origin: 0 50%; z-index: 9; }
`;

/** Bold white spikes pointing at the centre of the stage, random lengths and widths; the middle stays clear. */
function rays(n) {
  const cx = 1260; // centre of the 2520×1800 box = centre of the stage
  const cy = 900;
  const count = n === 1 ? 36 : 28;
  let d = '';
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
    const w = n === 1 ? 0.016 + Math.random() * 0.028 : 0.008 + Math.random() * 0.014; // half-width at the outer end, radians
    const r1 = 280 + Math.random() * 260; // the sharp tip
    const r2 = 1600;
    const p = (r, t) => `${(cx + r * Math.cos(t)).toFixed(0)},${(cy + r * Math.sin(t)).toFixed(0)}`;
    d += `<polygon points="${p(r1, a)} ${p(r2, a - w)} ${p(r2, a + w)}"/>`;
  }
  return `<div class="rays r${n}"><svg viewBox="0 0 2520 1800" aria-hidden="true"><g fill="#fff" fill-opacity=".9">${d}</g></svg></div>`;
}

export function createCall(root) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  root.innerHTML = `<div class="fight">
    <div class="ring">
      <div class="corner red"></div><div class="corner blue"></div><div class="gap"></div><div class="pattern"></div>${rays(1)}${rays(2)}
      <canvas class="fire" width="170" height="64"></canvas>
      <div class="mascot m1"></div><div class="mascot m2"></div><div class="mname m1"></div><div class="mname m2"></div>
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

  function setName(el, text) {
    el.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = text;
    el.append(span);
    // Shrink until it fits: at most 2 lines in the box, and no single word wider than the box.
    let size = 150;
    el.style.fontSize = `${size}px`;
    const lines = () => Math.round(span.offsetHeight / size);
    while (size > 40 && (span.scrollWidth > el.clientWidth + 1 || lines() > 2 || span.offsetHeight > el.clientHeight)) {
      el.style.fontSize = `${(size -= 4)}px`;
    }
  }

  function setMascot(n, [body, hat, item, title]) {
    const box = q(`.mascot.m${n}`);
    box.textContent = body;
    if (hat) box.insertAdjacentHTML('beforeend', `<span class="hat">${hat}</span>`);
    if (item) box.insertAdjacentHTML('beforeend', `<span class="item">${item}</span>`);
    q(`.mname.m${n}`).textContent = title;
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
    /** m: match view (p1, p2, label); important: real fire along the bottom; ms: how long the screen stays. */
    show(m, important, ms) {
      running.forEach((a) => a.cancel());
      running = [];
      q('.label').textContent = m.label || '';
      setName(q('.n1'), m.p1?.name ?? '');
      setName(q('.n2'), m.p2?.name ?? '');
      q('.pattern').className = `pattern p-${pick(PATTERNS)}`;
      fight.classList.toggle('important', !!important);
      if (important) fire.start(); else fire.stop();
      const m1 = pick(MASCOTS);
      let m2;
      do m2 = pick(MASCOTS); while (m2 === m1);
      setMascot(1, m1);
      setMascot(2, m2);

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
        anim(q(`.mname.m${n}`), [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: delay + 400, fill: 'backwards' });
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

// Classic «Doom fire» on a tiny canvas: heat rises from the bottom row, decays and drifts; CSS stretches it smoothly.
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
        if (dst >= 0) heat[dst] = Math.max(0, heat[src] - (r > 2 ? 2 : r & 1));
      }
    }
    for (let k = 0; k < heat.length; k++) {
      const c = pal[heat[k]];
      img.data[k * 4] = c[0]; img.data[k * 4 + 1] = c[1]; img.data[k * 4 + 2] = c[2]; img.data[k * 4 + 3] = c[3];
    }
    ctx.putImageData(img, 0, 0);
  }
  function frame(now) {
    if (!running) return;
    if (now - last > 33) { step(); last = now; } // ~30 fps
    requestAnimationFrame(frame);
  }
  return {
    start() { if (!running) { running = true; requestAnimationFrame(frame); } },
    stop() { running = false; },
  };
}
