// A tropical butterfly over the splash, seen from above like the gecko: it flutters along in a bobbing zigzag, now and
// then lands and slowly opens and closes its wings, then flies off. The gecko (lizard.js) may call it over to hunt,
// grab it (it then draws the prey itself with drawButterfly) and tear a wing off, which flutters down and lies there
// until the next gecko comes and eats it (takeWing).
// One butterfly at a time, on a small canvas moved with a CSS transform; it flies above the balls (z-index in style.css).

const W = 1920;
const H = 1080;
const BOX = 180;
const SPEED = 240; // px/s
const SHADOW = 'rgba(0,0,0,0.15)';
const WING_LIES = 15 * 60; // s a torn-off wing stays after landing (the next gecko eats it long before), then fades
const WING_FADE = 4;

// species seen in Bali; each wing pair is a gradient from the base to the tip
export const KINDS = [
  { // monarch-like (Danaus): orange, black veins and border with white dots
    fore: ['#b9520e', '#f28a22'], hind: ['#c45c10', '#f39a35'], edge: '#17110b', vein: '#1d140c', band: 7, dots: '#fff6e2',
  },
  { // Papilio ulysses: electric blue, wide black border
    fore: ['#0a2f7a', '#2b8ff2'], hind: ['#0b3486', '#3a9cf5'], edge: '#0b0e16', vein: null, band: 10, dots: null,
  },
  { // birdwing (Troides): black forewings with pale veins, golden hindwings
    fore: ['#121010', '#2c2724'], hind: ['#c98a0c', '#f6d235'], edge: '#121010', vein: '#5e574d', band: 5, dots: null,
  },
  { // lemon emigrant (Catopsilia): pale yellow, thin dark edge
    fore: ['#e2c63a', '#f7ec98'], hind: ['#e6cd45', '#f8efa6'], edge: '#6f6022', vein: '#cdb43e', band: 1.5, dots: null,
  },
  { // lacewing (Cethosia): red, black border with white dots
    fore: ['#8f1a12', '#e2452c'], hind: ['#a3221a', '#ec5c36'], edge: '#140d0b', vein: '#2a120d', band: 6, dots: '#ffffff',
  },
  { // tailed jay (Graphium): green on black
    fore: ['#2b6427', '#8fd06a'], hind: ['#2c6629', '#9ad874'], edge: '#101410', vein: '#183018', band: 6, dots: '#d4f5ae',
  },
  { // crow (Euploea): dark violet sheen, white dots
    fore: ['#1b1430', '#4c3c90'], hind: ['#1c1530', '#3c2f70'], edge: '#0d0a14', vein: null, band: 4, dots: '#ece6ff',
  },
];

const rand = (a, b) => a + Math.random() * (b - a);

// right-hand wings, the butterfly pointing up (-y), body along x = 0
const FORE = [[2, -7], [14, -23, 30, -33, 45, -31], [45, -22, 41, -10, 34, -2], [22, 0, 10, 1, 3, -1]];
const HIND = [[3, -1], [20, -5, 34, 2, 34, 14], [33, 26, 21, 34, 10, 32], [5, 27, 2, 15, 2, 4]];
const FORE_VEINS = [[[3, -6], [24, -24], [44, -30]], [[3, -5], [26, -18], [43, -20]], [[3, -4], [28, -10], [40, -10]], [[3, -3], [20, -4], [35, -3]]];
const HIND_VEINS = [[[3, 0], [20, 2], [33, 10]], [[3, 1], [20, 10], [31, 22]], [[3, 2], [14, 16], [20, 31]], [[3, 3], [7, 18], [10, 31]]];
const FORE_DOTS = [[40, -27, 1.8], [42, -21, 1.6], [40, -14, 1.5], [37, -7, 1.4], [33, -30, 1.4], [26, -31, 1.2]];
const HIND_DOTS = [[31, 16, 1.6], [28, 24, 1.5], [21, 30, 1.4], [13, 30, 1.2]];

function wingPath(ctx, w) {
  ctx.beginPath();
  ctx.moveTo(w[0][0], w[0][1]);
  for (let k = 1; k < w.length; k++) ctx.bezierCurveTo(...w[k]);
  ctx.closePath();
}

function paintWing(ctx, shape, veins, dots, colors, kind) {
  wingPath(ctx, shape);
  if (!kind) { ctx.fillStyle = SHADOW; ctx.fill(); return; }
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
  g.addColorStop(0, colors[0]);
  g.addColorStop(1, colors[1]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (kind.vein) {
    ctx.strokeStyle = kind.vein;
    ctx.lineWidth = 0.9;
    for (const [a, c, b] of veins) {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]);
      ctx.stroke();
    }
  }
  // the dark border: a thick stroke along the edge, half of it clipped away
  wingPath(ctx, shape);
  ctx.lineWidth = kind.band * 2;
  ctx.strokeStyle = kind.edge;
  ctx.stroke();
  if (kind.dots) {
    ctx.fillStyle = kind.dots;
    for (const [x, y, r] of dots) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  ctx.restore();
  wingPath(ctx, shape);
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.stroke();
}

/**
 * Draws a butterfly at (x, y) pointing along `heading`, scale `s`, wings open by `span` (0 folded, 1 flat).
 * `kind` null draws its shadow. `missing`: 1 or -1, that side's wings are torn off, 2 both. `crumple` 0..1 bends the wings in.
 */
export function drawButterfly(ctx, x, y, heading, s, span, kind, { missing = 0, crumple = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading + Math.PI / 2);
  ctx.scale(s, s);
  for (const side of [1, -1]) {
    if (side === missing || missing === 2) continue;
    ctx.save();
    // seen from above, a wing raised over the back is foreshortened; the hindwing lags a little behind the forewing
    ctx.scale(side * Math.max(0.06, span), 1);
    ctx.rotate(crumple * 0.35);
    paintWing(ctx, HIND, HIND_VEINS, HIND_DOTS, kind?.hind, kind);
    ctx.restore();
    ctx.save();
    ctx.scale(side * Math.max(0.06, span * 0.96 + 0.04), 1 - crumple * 0.3);
    ctx.rotate(-crumple * 0.25);
    paintWing(ctx, FORE, FORE_VEINS, FORE_DOTS, kind?.fore, kind);
    ctx.restore();
  }
  // abdomen, hairy thorax, head with big eyes, clubbed antennae
  const dark = kind ? '#1c1612' : SHADOW;
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(0, 12, 2.6, 13, 0, 0, 2 * Math.PI);
  ctx.fill();
  if (kind) {
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 0.7;
    for (let k = 4; k < 24; k += 3.5) {
      ctx.beginPath();
      ctx.moveTo(-2.3, k);
      ctx.lineTo(2.3, k);
      ctx.stroke();
    }
  }
  ctx.fillStyle = kind ? '#2a221c' : SHADOW;
  ctx.beginPath();
  ctx.ellipse(0, -3, 4, 7, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(0, -11.5, 3.3, 0, 2 * Math.PI);
  ctx.fill();
  if (kind) {
    ctx.fillStyle = '#3d342b';
    for (const side of [1, -1]) {
      ctx.beginPath();
      ctx.arc(side * 2.4, -12, 1.5, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.strokeStyle = '#1c1612';
    ctx.lineWidth = 0.9;
    ctx.fillStyle = '#1c1612';
    for (const side of [1, -1]) {
      ctx.beginPath();
      ctx.moveTo(side * 1.2, -14);
      ctx.quadraticCurveTo(side * 4, -26, side * 9, -33);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(side * 9.3, -33.4, 1.2, 2.2, side * 0.6, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * One torn-off forewing at (x, y), `side` 1 or -1, scale `s`, turned like a butterfly pointing along `heading`.
 * `base`: (x, y) is where it was torn off (held in the gecko's mouth), otherwise its middle. `kind` null = shadow.
 */
export function drawWing(ctx, x, y, heading, s, kind, side, base = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading + Math.PI / 2);
  ctx.scale(s * side, s);
  if (!base) ctx.translate(-20, 14); // around the wing's middle, not the body
  paintWing(ctx, FORE, FORE_VEINS, FORE_DOTS, kind?.fore, kind);
  ctx.restore();
}

export function createButterfly(root) {
  const el = document.createElement('canvas');
  el.className = 'butterfly';
  el.width = el.height = BOX;
  el.hidden = true;
  root.append(el);
  const ctx = el.getContext('2d');
  // torn-off wings (up to two at once) have their own canvases: one may still lie there when the next butterfly comes
  const pool = [0, 1].map(() => {
    const c = document.createElement('canvas');
    c.className = 'butterfly';
    c.width = c.height = BOX;
    c.hidden = true;
    root.append(c);
    return { el: c, ctx: c.getContext('2d'), w: null };
  });
  let b = null;
  const lying = () => pool.find((s) => s.w && !s.w.h && !s.w.away);
  let lastKind = -1;

  /** A point just off the screen; with `near`, the closest of a few random ones (a shorter way in). */
  function edgePoint(near) {
    let best = null;
    for (let k = 0; k < (near ? 5 : 1); k++) {
      const m = 60;
      const p = [[rand(0, W), -m], [W + m, rand(0, H)], [rand(0, W), H + m], [-m, rand(0, H)]][Math.floor(Math.random() * 4)];
      if (!best || Math.hypot(p[0] - near[0], p[1] - near[1]) < Math.hypot(best[0] - near[0], best[1] - near[1])) best = p;
    }
    return best;
  }

  function spawn(near, at, kind) {
    const [x, y] = at || edgePoint(near);
    const a = Math.atan2(H / 2 - y, W / 2 - x);
    b = {
      x, y, vx: Math.cos(a) * SPEED, vy: Math.sin(a) * SPEED, h: 1, heading: a, t: rand(0, 10), flap: 0, beat: rand(8, 11),
      kind: kind || KINDS[lastKind = (lastKind + 1 + Math.floor(Math.random() * (KINDS.length - 1))) % KINDS.length], // never twice in a row
      mode: 'fly', goal: null, land: false, sitFor: 0, speed: SPEED,
      onLand: null, after: null, hops: 0,
    };
    el.hidden = false;
  }

  function leave(from, fast) {
    const a = from ? Math.atan2(b.y - from[1], b.x - from[0]) + rand(-0.5, 0.5) : rand(0, 2 * Math.PI);
    b.mode = 'fly';
    b.land = false;
    b.goal = [b.x + Math.cos(a) * 3000, b.y + Math.sin(a) * 3000];
    b.speed = fast ? SPEED * 2.2 : SPEED;
    b.after = null;
    if (fast) { b.vx = Math.cos(a) * b.speed; b.vy = Math.sin(a) * b.speed; b.beat = 14; }
  }

  /** Up again and over to another spot nearby, to land there for a while. */
  function hop() {
    b.hops--;
    for (let k = 0; k < 20; k++) {
      const a = rand(0, 2 * Math.PI);
      const d = rand(250, 600);
      const x = b.x + Math.cos(a) * d;
      const y = b.y + Math.sin(a) * d;
      if (x < 150 || x > W - 150 || y < 120 || y > H - 120) continue;
      b.mode = 'fly';
      b.goal = [x, y];
      b.land = true;
      b.sitFor = rand(2, 6);
      b.speed = SPEED;
      return;
    }
    leave();
  }

  function remove() { b = null; el.hidden = true; }

  const api = {
    get active() { return !!b; },
    get landed() { return b?.mode === 'sit'; },
    get pos() { return b && [b.x, b.y]; },
    /** Where a torn-off wing lies on the table, once it has landed. */
    get wing() { const s = lying(); return s ? [s.w.x, s.w.y] : null; },
    /** The gecko picks the wing up: it draws it itself from now on. */
    takeWing() {
      const s = lying();
      if (!s) return null;
      const piece = { kind: s.w.kind, side: s.w.side };
      s.w = null;
      s.el.hidden = true;
      return piece;
    },
    /** Just flying by: across the middle, sometimes landing there for a while, now and then two or three times. */
    wander() {
      if (b) return;
      spawn();
      b.goal = [rand(400, W - 400), rand(250, H - 250)];
      b.land = Math.random() < 0.5;
      const r = Math.random();
      b.hops = !b.land ? 0 : r < 0.5 ? 0 : r < 0.85 ? 1 : 2; // landings after the first: of those that land, 50% once, 35% twice, 15% three times
      b.sitFor = rand(2, 6);
      b.after = () => leave();
    },
    /** Called by the gecko: fly to `target`, land and stay; `onLand` when it sits. */
    summon(target, onLand) {
      if (!b) spawn(target);
      b.mode = 'fly';
      b.goal = target;
      b.land = true;
      b.sitFor = Infinity;
      b.speed = SPEED;
      b.onLand = onLand;
      b.after = null;
    },
    /** Startled: off and away from `from`, fast. */
    flee(from) { if (b) leave(from, true); },
    /** Caught: the gecko holds it now and draws it itself. Returns its look and how it sat. */
    grab() {
      if (!b) return null;
      const prey = { kind: b.kind, heading: b.heading };
      remove();
      return prey;
    },
    /**
     * A wing torn off at (x, y), thrown off with velocity `v`: it flutters down, spinning, lies a while and fades.
     * `away`: caught by the air instead, it keeps fluttering and drifts off the screen.
     */
    dropWing(x, y, heading, kind, side, v, away = false) {
      const s = pool.find((p) => !p.w) || pool[0];
      s.w = { x, y, heading, kind, side, t: 0, h: 0.5, vx: v[0], vy: v[1], spin: rand(-6, 6), away };
      s.el.hidden = false;
    },
    /** Slipped out of the gecko's jaws at (x, y): flutters up and lands again at `to`, `onLand` when it sits. */
    release(x, y, heading, kind, to, onLand) {
      spawn(null, [x, y], kind);
      Object.assign(b, { heading, h: 0.6, mode: 'fly', goal: to, land: true, sitFor: Infinity, speed: 200, onLand });
    },
    eaten() {
      remove();
      for (const s of pool) { s.w = null; s.el.hidden = true; }
    },
    update(dt) {
      for (const s of pool) if (s.w) updateWing(s, dt);
      const wings = pool.some((s) => s.w);
      if (!b) return wings;
      b.t += dt;
      if (b.mode === 'fly') {
        const dx = b.goal[0] - b.x;
        const dy = b.goal[1] - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const near = b.land ? Math.min(1, d / 160) : 1; // slows down and stops zigzagging to land
        const sp = b.speed * (0.15 + 0.85 * near);
        const k = 1 - Math.exp(-dt * 3);
        b.vx += ((dx / d) * sp - b.vx) * k;
        b.vy += ((dy / d) * sp - b.vy) * k;
        // the flutter: never a straight line; each downstroke gives a little jerk forward
        const kick = 0.75 + 0.5 * Math.max(0, Math.sin(b.flap));
        const wob = (Math.sin(b.t * 3.1) * 90 + Math.sin(b.t * 7.7) * 45 + Math.sin(b.t * 13.3) * 20) * near;
        const v = Math.hypot(b.vx, b.vy) || 1;
        b.x += (b.vx * kick - (b.vy / v) * wob) * dt;
        b.y += (b.vy * kick + (b.vx / v) * wob) * dt;
        b.heading += (Math.atan2(b.vy, b.vx) + 0.25 * Math.sin(b.t * 5.3) * near - b.heading) * (1 - Math.exp(-dt * 8));
        // it rises a little on each downstroke and sinks between them
        b.h = (b.land ? Math.min(1, d / 140) : 1) * (0.85 + 0.15 * Math.sin(b.flap - 1));
        b.flap += dt * 2 * Math.PI * b.beat;
        if (b.land && d < 5) {
          b.x = b.goal[0];
          b.y = b.goal[1];
          b.mode = 'sit';
          b.sitT = 0;
          b.onLand?.();
          b.onLand = null;
        } else if (!b.land && b.after && d < 80) {
          const next = b.after;
          b.after = null;
          next();
        }
        if (!b.land && !b.after && (b.x < -100 || b.x > W + 100 || b.y < -100 || b.y > H + 100)) { remove(); return wings; }
      } else {
        b.sitT += dt;
        b.h = 0;
        if (b.sitT > b.sitFor) { if (b.hops > 0) hop(); else leave(); }
      }
      return true;
    },
    draw() {
      for (const s of pool) if (s.w) drawFallen(s);
      if (!b) return;
      el.style.transform = `translate(${Math.round(b.x - BOX / 2)}px, ${Math.round(b.y - BOX / 2)}px)`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, BOX, BOX);
      // flying: a fast downstroke, the wings meeting over the back on the upstroke;
      // sitting: wings mostly closed over the back, opened flat now and then to bask
      let span;
      if (b.mode === 'sit') {
        const c = Math.cos(b.sitT * 1.3);
        span = 0.1 + 0.9 * Math.min(1, Math.max(0, 0.4 + 1.2 * c));
      } else {
        const ph = (b.flap / (2 * Math.PI)) % 1;
        span = ph < 0.4 ? 1 - (ph / 0.4) * 0.9 : 0.1 + ((ph - 0.4) / 0.6) * 0.9;
      }
      const s = 0.85 * (1 + 0.15 * b.h);
      // the higher it flies, the further its shadow falls (light from the top left, like the balls)
      drawButterfly(ctx, BOX / 2 + 4 + 26 * b.h, BOX / 2 + 6 + 32 * b.h, b.heading, s * 0.95, span, null);
      drawButterfly(ctx, BOX / 2, BOX / 2, b.heading, s, span, b.kind);
    },
  };

  function updateWing(slot, dt) {
    const w = slot.w;
    w.t += dt;
    if (w.away) {
      // carried off: keeps tumbling in the air, drifts away and leaves the screen
      w.x += (w.vx + Math.sin(w.t * 7) * 70) * dt;
      w.y += (w.vy + Math.cos(w.t * 5) * 40) * dt;
      w.heading += w.spin * dt;
      if (w.x < -100 || w.x > W + 100 || w.y < -100 || w.y > H + 100) { slot.w = null; slot.el.hidden = true; }
    } else if (w.h > 0) {
      // falling like a leaf: side to side, spinning, slower than a stone
      w.h = Math.max(0, w.h - dt * 0.45);
      w.vx *= Math.exp(-dt * 1.2); // air drag
      w.vy *= Math.exp(-dt * 1.2);
      w.x += (w.vx + Math.sin(w.t * 7) * 70) * dt;
      w.y += (w.vy + Math.cos(w.t * 5) * 40) * dt;
      w.heading += w.spin * dt;
      if (!w.h) w.lay = w.t;
    } else if (w.t - w.lay > WING_LIES) {
      slot.w = null;
      slot.el.hidden = true;
    }
  }

  function drawFallen({ w, el: wel, ctx: wctx }) {
    const fade = w.h || w.away ? 1 : Math.min(1, Math.max(0, (WING_LIES - (w.t - w.lay)) / WING_FADE));
    wel.style.transform = `translate(${Math.round(w.x - BOX / 2)}px, ${Math.round(w.y - BOX / 2)}px)`;
    wel.style.opacity = fade;
    wctx.setTransform(1, 0, 0, 1, 0, 0);
    wctx.clearRect(0, 0, BOX, BOX);
    // while falling it tumbles: seen from above it narrows and widens
    const tumble = 0.6 + 0.4 * Math.abs(Math.cos(w.t * 9 * Math.min(1, w.h * 3)));
    for (const kind of [null, w.kind]) {
      wctx.save();
      wctx.translate(BOX / 2 + (kind ? 0 : 3 + 40 * w.h), BOX / 2 + (kind ? 0 : 4 + 50 * w.h));
      wctx.scale(tumble, 1);
      drawWing(wctx, 0, 0, w.heading, 0.85, kind, w.side);
      wctx.restore();
    }
  }

  return api;
}
