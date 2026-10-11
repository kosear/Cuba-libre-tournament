// A tokay gecko (the Bali one: blue-grey with orange spots) darts across the splash now and then.
// Drawn procedurally on a small canvas that moves with a CSS transform: a spine of points follows a curved path,
// the body bends and the tail waves in step with a trot (diagonal legs together), feet stay planted while on the
// ground. It runs in dashes with short stops, one of them a longer sit (1-45 s, mostly short), looks around while stopped, then leaves.
// The canvas is redrawn only while the gecko is on screen (a few seconds every PERIOD_MIN..PERIOD_MAX).
// Every run it comes in a different colour (the Bali one, blue, red, green...).
// A sit over 4 s may turn into a hunt (15% catch, 70% a funny miss): a butterfly (butterfly.js) lands in front of
// it, the gecko turns to it, freezes with a twitching tail tip, creeps closer in small steps and lunges. A catch:
// the butterfly struggles in its jaws, a head shake tears a wing off (it flutters down and lies there), the gecko
// works the prey in with a few bites, swallows with its eyes squeezed shut (lizards push food down with their eyes)
// and licks its lips. A miss: a snap at the air, a look after the butterfly and a lick over the eye (geckos do that).
// The butterfly also just flies by on its own now and then.

import { createButterfly, drawButterfly } from '/board/butterfly.js';

const W = 1920;
const H = 1080;
const PERIOD_MIN = 7 * 60 * 1000;
const PERIOD_MAX = 13 * 60 * 1000;
const BUTTERFLY_MIN = 3 * 60 * 1000; // a butterfly just flying by
const BUTTERFLY_MAX = 8 * 60 * 1000;
// Demo for watching on the TV: a gecko every 10 s, every run a hunt, every second hunt a miss,
// a butterfly flying by every 10 s. Normally false.
const DEMO = false;
const REACH = 64; // px, how far the head shoots forward in a lunge
const SEG = 12; // px between spine points
const N = 26; // spine points: 0-3 head, 4 neck, 5 shoulders, 11 hips, 12-25 tail
const SHOULDER = 5;
const HIP = 11;
const STRIDE = 100; // px travelled per full gait cycle
const BOX = 600; // canvas size, the gecko is drawn around its middle
// colours: body, outline, spots, tail bands; the first is the real Bali tokay
const COLORS = [
  ['#7d95b5', '#3e4f66', '#f07a3a', '#c9d6e6'],
  ['#2f6fd6', '#173a73', '#ffb13b', '#a9c9ff'], // blue
  ['#c8372d', '#6e1813', '#ffd23f', '#f2a59c'], // red
  ['#4f9a3a', '#24501a', '#f05a3a', '#bfe6a8'], // green
  ['#7a4fc0', '#3d2366', '#f6c33a', '#cdb8f0'], // violet
  ['#e0b52a', '#6f5510', '#d8432a', '#fff0b0'], // yellow
  ['#3b3d44', '#141518', '#f07a3a', '#8e929c'], // black
  ['#e9e3d4', '#8d8371', '#f08a3a', '#ffffff'], // albino
  ['#1fa59c', '#0d524d', '#ff7a4a', '#a8ece6'], // turquoise
];

const rand = (a, b) => a + Math.random() * (b - a);
const smooth = (x) => x * x * (3 - 2 * x);

// half-width of the body at each spine point: big head, thin neck, round belly, long tapering tail
const WIDTH = Array.from({ length: N }, (_, i) => {
  if (i <= 4) return [9, 16, 19, 17, 12][i];
  if (i <= HIP) return [16, 20, 21, 21, 21, 20, 16][i - 5];
  return 11 * (1 - (i - 12) / 14) ** 0.8 + 1.5;
});

/**
 * Mounts the gecko layer into `root`. Returns { stop }.
 * Testing: `?lizard` in the page address runs the gecko every 15 s and a butterfly every 20 s;
 * `?lizard=hunt` also makes every run a hunt.
 * `?lizard=fast`: the normal behaviour, only 10 times more often (a gecko about once a minute), for one screen.
 */
export function startLizard(root) {
  const mode = new URLSearchParams(location.search).get('lizard');
  const fast = mode === 'fast' ? 10 : 1;
  const test = mode !== null && fast === 1;
  const huntTest = mode === 'hunt';
  const huntAll = huntTest || DEMO;
  const period = () => (DEMO ? 10000 : test ? 15000 : rand(PERIOD_MIN, PERIOD_MAX) / fast); // random, so it is never expected
  const bPeriod = () => (DEMO ? 10000 : test ? 20000 : rand(BUTTERFLY_MIN, BUTTERFLY_MAX) / fast);
  const el = document.createElement('canvas');
  el.className = 'lizard';
  el.width = el.height = BOX;
  el.hidden = true;
  root.append(el);
  const ctx = el.getContext('2d');
  const bf = createButterfly(root);
  let timer = setTimeout(run, test ? 2000 : period());
  let bTimer = setTimeout(flyBy, test ? 8000 : bPeriod());
  let raf = 0;
  let last = 0;
  let g = null; // the current run
  let lastColor = -1;
  let hunts = 0;

  function run() {
    timer = setTimeout(run, period());
    if (g) return;
    g = makeRun();
    el.hidden = false;
    wake();
  }
  function flyBy() {
    bTimer = setTimeout(flyBy, bPeriod());
    if (bf.active || g?.hunt) return;
    bf.wander();
    wake();
  }
  // one loop for both, running only while one of them is on screen
  function wake() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (g && !advance(g, dt)) {
      g = null;
      el.hidden = true;
    }
    if (g) draw(g);
    const flying = bf.update(dt);
    if (flying) bf.draw();
    raf = g || flying ? requestAnimationFrame(frame) : 0;
  }

  // ---------- the path: a cubic curve from one edge to the opposite one, sampled by arc length ----------
  function makeRun() {
    const m = 120;
    let a;
    let b;
    if (Math.random() < 0.7) { // across, the long way
      a = [-m, rand(150, H - 150)];
      b = [W + m, rand(150, H - 150)];
    } else {
      a = [rand(300, W - 300), -m];
      b = [rand(300, W - 300), H + m];
    }
    if (Math.random() < 0.5) [a, b] = [b, a];
    const c1 = [rand(300, W - 300), rand(200, H - 200)];
    const c2 = [rand(300, W - 300), rand(200, H - 200)];
    const pts = [];
    const lens = [0];
    for (let k = 0; k <= 200; k++) {
      const t = k / 200;
      const u = 1 - t;
      const p = [0, 1].map((j) => u * u * u * a[j] + 3 * u * u * t * c1[j] + 3 * u * t * t * c2[j] + t * t * t * b[j]);
      if (k) lens.push(lens[k - 1] + Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]));
      pts.push(p);
    }
    const spots = [];
    for (let i = SHOULDER; i < 22; i += rand(1.2, 2.2)) spots.push([i, rand(-0.6, 0.6), rand(3, 5.5) * (i < HIP + 2 ? 1 : 0.75)]);
    const stops = Math.floor(rand(1, 4));
    lastColor = (lastColor + 1 + Math.floor(Math.random() * (COLORS.length - 1))) % COLORS.length; // never twice in a row
    return {
      pts, lens, total: lens[200], s: 0, v: 0,
      mode: 'run', until: rand(0.6, 1.3), top: rand(550, 750), stops,
      col: COLORS[lastColor],
      sit: huntAll ? stops : 1 + Math.floor(Math.random() * stops), // which stop (counting down) is the longer sit
      t: 0, yaw: 0, yawTo: 0, spots, hunt: null, reach: 0, twitch: 0, chew: 0, gulp: 0, lick: 0, squint: 0, lips: 0, creep: 0,
    };
  }

  /** Point and unit direction at arc length s; straight lines continue past both ends. */
  function at(g, s) {
    const { pts, lens, total } = g;
    const k0 = s <= 0 ? 0 : s >= total ? 199 : Math.min(199, lowerIndex(lens, s));
    const [p, q] = [pts[k0], pts[k0 + 1]];
    const d = lens[k0 + 1] - lens[k0] || 1;
    const dx = (q[0] - p[0]) / d;
    const dy = (q[1] - p[1]) / d;
    const f = s - lens[k0];
    return [p[0] + dx * f, p[1] + dy * f, dx, dy];
  }
  function lowerIndex(lens, s) {
    let lo = 0;
    let hi = lens.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lens[mid] <= s) lo = mid; else hi = mid;
    }
    return lo;
  }

  // ---------- behaviour: dash, stop and look around, dash again ----------
  function advance(g, dt) {
    g.t += dt;
    g.until -= dt;
    const [hx, hy] = at(g, g.s);
    const inside = hx > 250 && hx < W - 250 && hy > 200 && hy < H - 200;
    if (g.mode === 'run' && g.until <= 0 && g.stops > 0 && inside) {
      g.mode = 'stop';
      const long = g.stops === g.sit;
      g.stops--;
      // the sit: 1 + 44·u⁴, so short is common, long is rare: half under ~4 s, 1 in 10 over 30 s, 1 in 30 over 40 s
      g.until = long ? 1 + 44 * Math.random() ** 4 : rand(0.7, 1.8);
      g.look = long ? g.until - rand(1, 2) : g.until * rand(0.3, 0.6); // when the head turns again
      g.yawTo = rand(-0.4, 0.4);
      if (long && huntAll) g.until = rand(6, 10);
      const r = Math.random();
      if (long && g.until > 4 && (huntAll || r < 0.85)) startHunt(g, DEMO ? hunts++ % 2 === 0 : huntTest ? Math.random() < 0.15 : r < 0.15);
    } else if (g.mode === 'stop') {
      const busy = g.hunt && !['wait', 'call'].includes(g.hunt.phase); // eyes on the butterfly
      if (!busy && g.look > 0 && g.until < g.look) { g.look -= rand(1.5, 4); g.yawTo = rand(-0.4, 0.4); } // a long sit: several looks
      if (g.hunt) hunt(g, dt);
      if (g.until <= 0 && !g.hunt) { g.mode = 'run'; g.until = rand(0.5, 1.2); g.top = rand(550, 750); g.yawTo = 0; }
    }
    const target = g.mode === 'run' ? g.top : g.creep;
    g.v += (target - g.v) * (1 - Math.exp(-dt * 14)); // geckos start and stop almost at once
    g.s += g.v * dt;
    g.yaw += (g.yawTo - g.yaw) * (1 - Math.exp(-dt * 10));
    return g.s < g.total + N * SEG + 60;
  }

  // ---------- the hunt ----------
  const CREEP = 36; // px the gecko creeps up before the lunge
  const clampYaw = (a) => Math.max(-0.6, Math.min(0.6, a));

  /** Angle between where the unturned head points and `target`, seen from the neck. */
  function aim(g, target, s = g.s) {
    const [nx, ny] = at(g, s - 4 * SEG);
    const [hx, hy] = at(g, s);
    const [fx, fy] = unit(hx - nx, hy - ny);
    const [tx, ty] = unit(target[0] - nx, target[1] - ny);
    return Math.atan2(fx * ty - fy * tx, fx * tx + fy * ty);
  }

  function startHunt(g, caught) {
    // the butterfly sits a little to one side, just within reach of the nose once the gecko has crept up
    const a = rand(-0.4, 0.4);
    const s = g.s + CREEP;
    const [nx, ny] = at(g, s - 4 * SEG);
    const [hx, hy] = at(g, s);
    const [fx, fy] = unit(hx - nx, hy - ny);
    const d = 4 * SEG + 7 + REACH - 4;
    const target = [nx + (fx * Math.cos(a) - fy * Math.sin(a)) * d, ny + (fx * Math.sin(a) + fy * Math.cos(a)) * d];
    if (target[0] < 60 || target[0] > W - 60 || target[1] < 60 || target[1] > H - 60) return;
    // a long sit: the butterfly comes later, so the hunt ends well before the sit does
    g.hunt = { caught, target, phase: 'wait', t: 0, start: g.until > 12 ? rand(0, g.until - 9) : 0 };
  }

  function hunt(g, dt) {
    const h = g.hunt;
    h.t += dt;
    const t = h.t;
    const next = (phase) => { h.phase = phase; h.t = 0; };
    if (h.phase === 'wait' && t >= h.start) {
      next('call');
      bf.summon(h.target, () => { next('watch'); h.watch = rand(0.8, 1.8); });
    } else if (h.phase === 'watch') {
      // head turned to it, frozen, only the tail tip twitches
      g.yawTo = clampYaw(aim(g, h.target));
      g.twitch = 1;
      if (t > h.watch) { next('creep'); h.s0 = g.s; }
    } else if (h.phase === 'creep') {
      // slow steps with pauses, head locked on the butterfly
      g.yawTo = clampYaw(aim(g, h.target));
      const done = g.s - h.s0 >= CREEP;
      g.creep = done ? 0 : Math.sin(t * 3.5) > -0.2 ? 40 : 0;
      if (done && g.v < 2 && Math.abs(g.yaw - g.yawTo) < 0.04) {
        next('lunge');
        if (!h.caught) bf.flee(at(g, g.s - 4 * SEG)); // it takes off just as the gecko moves
      }
    } else if (h.phase === 'lunge') {
      g.reach = t < 0.08 ? smooth(t / 0.08) : t < 0.16 ? 1 : t < 0.5 ? 1 - smooth((t - 0.16) / 0.34) : 0;
      if (h.caught && !h.prey && t >= 0.08) {
        h.prey = bf.grab();
        if (!h.prey) h.caught = false;
        else Object.assign(h.prey, { depth: 0, span: 1, crumple: 0, torn: 0 });
      }
      if (t >= 0.5) { g.twitch = 0; h.base = g.yaw; next('after'); }
    } else if (h.phase !== 'after') {
      // waiting for the butterfly to come
    } else if (h.caught) {
      eat(g, h, t);
    } else {
      // missed: freeze, look after it, lick the eye
      const p = bf.pos;
      if (p && t > 0.25) g.yawTo = clampYaw(aim(g, p));
      g.lick = t > 1 && t < 1.6 ? Math.sin(((t - 1) / 0.6) * Math.PI) : 0;
      if (t >= 2.2) { g.hunt = null; g.look = g.until - rand(1, 2); }
    }
  }

  /** The catch, `t` seconds after the lunge. */
  function eat(g, h, t) {
    const prey = h.prey;
    g.chew = 0;
    g.reach = 0;
    if (t < 1) {
      // the butterfly beats its wings in the jaws, the gecko whips its head side to side to stun it
      g.yaw = g.yawTo = h.base + 0.4 * Math.sin(t * 26) * (1 - t) ** 0.6;
      prey.span = 0.2 + 0.8 * Math.abs(Math.sin(t * 43 + Math.sin(t * 11)));
      if (t > 0.55 && !prey.torn) {
        // a whip tears one wing off: it flies off to the side the head is swinging to
        prey.torn = Math.cos(t * 26) > 0 ? 1 : -1;
        const [x, y, heading, s] = preyPlace(g, prey);
        const [sx, sy] = [-Math.sin(heading) * prey.torn, Math.cos(heading) * prey.torn]; // that wing's side
        bf.dropWing(x + sx * 24 * s, y + sy * 24 * s, heading, prey.kind, prey.torn, [sx * 190, sy * 190]);
      }
    } else if (t < 1.6) {
      // a pause: the prey still twitches now and then
      g.yawTo = h.base * 0.5;
      prey.span = 0.6 + 0.4 * Math.max(0, Math.sin(t * 34)) * (Math.sin(t * 5) > 0.3 ? 1 : 0);
    } else if (t < 4) {
      // four bites, each one jerks the prey further in; the wings crumple and fold
      const k = Math.floor((t - 1.6) / 0.6);
      const u = (t - 1.6) / 0.6 - k;
      g.chew = u < 0.3 ? Math.sin((u / 0.3) * Math.PI) : 0;
      g.reach = 0.08 * g.chew;
      prey.depth = (k + smooth(Math.min(1, u / 0.25))) / 4;
      prey.crumple = prey.depth;
      prey.span = (0.65 + 0.3 * Math.max(0, Math.sin(t * 27)) * (1 - prey.depth)) * (1 - prey.depth * 0.5);
    } else {
      h.prey = null;
      g.yawTo = 0;
      // swallowing: a bulge goes down the throat, the eyes squeezed shut push the food down
      g.gulp = t < 4.9 ? 3 + ((t - 4) / 0.9) * 6 : 0;
      g.squint = t < 5 ? Math.sin(Math.min(1, (t - 4) / 1) * Math.PI) : 0;
      // then the tongue flicks over the lips, left and right
      g.lips = t > 5.1 && t < 6 ? (t - 5.1) / 0.9 : 0;
      if (t >= 6.3) { g.hunt = null; g.look = g.until - rand(1, 2); }
    }
  }

  /** Where the prey is drawn: centre, heading (pointing out of the mouth), scale. */
  function preyPlace(g, prey, p = spine(g)) {
    const [hx, hy] = unit(p[0][0] - p[3][0], p[0][1] - p[3][1]);
    // held by the thorax, the abdomen in the mouth, head and wings outside; each bite pulls it in under the head
    const s = 0.85 * (1 - 0.35 * prey.depth);
    const out = 6 + 2 - 3 * s - prey.depth * 40;
    return [p[0][0] + hx * out, p[0][1] + hy * out, Math.atan2(hy, hx), s];
  }

  function unit(x, y) {
    const d = Math.hypot(x, y) || 1;
    return [x / d, y / d];
  }

  // ---------- drawing ----------
  function spine(g) {
    const phi = (2 * Math.PI * g.s) / STRIDE;
    const pace = Math.min(1, g.v / 500);
    const p = [];
    for (let i = 0; i < N; i++) {
      const [x, y, dx, dy] = at(g, g.s - i * SEG);
      let off = 0;
      if (i >= 3 && i <= 13) off = 13 * pace * Math.sin(phi) * Math.sin((Math.PI * (i - 3)) / 10); // the body's S-bend
      if (i > 13) off = (18 * pace + 5) * Math.sin(phi - (i - 13) * 0.45 + g.t * (1 - pace) * 2) * ((i - 13) / 12);
      if (i > 20 && g.twitch) off += 5 * Math.sin(g.t * 16) * ((i - 20) / 5); // the tail tip twitches while it stalks
      p.push([x - dy * off, y + dx * off]);
    }
    // looking around: the head turns on the neck
    const [nx, ny] = p[4];
    const c = Math.cos(g.yaw);
    const sn = Math.sin(g.yaw);
    for (let i = 0; i < 4; i++) {
      const rx = p[i][0] - nx;
      const ry = p[i][1] - ny;
      p[i] = [nx + rx * c - ry * sn, ny + rx * sn + ry * c];
    }
    // the lunge: the head shoots forward, the neck stretches
    if (g.reach) {
      const [hx, hy] = unit(p[0][0] - p[4][0], p[0][1] - p[4][1]);
      for (let i = 0; i < 6; i++) {
        const k = g.reach * REACH * Math.min(1, (6 - i) / 2.5);
        p[i] = [p[i][0] + hx * k, p[i][1] + hy * k];
      }
    }
    return p;
  }

  /** Forward direction and left normal at spine point i. */
  function frameAt(p, i) {
    const a = p[Math.max(0, i - 1)];
    const b = p[Math.min(N - 1, i + 1)];
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const d = Math.hypot(dx, dy) || 1;
    return [dx / d, dy / d, -dy / d, dx / d];
  }

  function legs(g, p) {
    const out = [];
    for (const [i, side, phase, fwd, lat] of [
      [SHOULDER, 1, 0, 8, 34], [SHOULDER, -1, 0.5, 8, 34], [HIP, 1, 0.5, -4, 38], [HIP, -1, 0, -4, 38],
    ]) {
      const [dx, dy, nx, ny] = frameAt(p, i);
      const u = (((g.s / STRIDE + phase) % 1) + 1) % 1;
      // on the ground for half a cycle (moves back as fast as the body goes forward), then swings ahead
      const o = u < 0.5 ? STRIDE / 4 - u * STRIDE : -STRIDE / 4 + smooth((u - 0.5) * 2) * (STRIDE / 2);
      const [ax, ay] = p[i];
      const foot = [ax + nx * side * lat + dx * (fwd + o), ay + ny * side * lat + dy * (fwd + o)];
      const front = i === SHOULDER;
      const mx = (ax + foot[0]) / 2;
      const my = (ay + foot[1]) / 2;
      // elbows point back, knees forward
      const knee = front
        ? [mx + nx * side * 6 - dx * 10, my + ny * side * 6 - dy * 10]
        : [mx + nx * side * 4 + dx * 12, my + ny * side * 4 + dy * 12];
      out.push({ hip: [ax + nx * side * WIDTH[i] * 0.6, ay + ny * side * WIDTH[i] * 0.6], knee, foot });
    }
    return out;
  }

  /** Half-width at point i: chewing works the jaws, a gulp is a bulge going down the throat. */
  function width(g, i) {
    let w = WIDTH[i];
    if (g.chew && i <= 3) w *= 1 + 0.1 * g.chew; // the jaws open for a bite
    if (g.gulp) w += 5 * Math.exp(-((i - g.gulp) ** 2) / 1.2);
    return w;
  }

  function outline(g, p) {
    const left = [];
    const right = [];
    for (let i = 0; i < N; i++) {
      const [, , nx, ny] = frameAt(p, i);
      const w = width(g, i);
      left.push([p[i][0] + nx * w, p[i][1] + ny * w]);
      right.push([p[i][0] - nx * w, p[i][1] - ny * w]);
    }
    const [dx, dy] = frameAt(p, 0);
    const [tx, ty] = frameAt(p, N - 1);
    const nose = [p[0][0] + dx * 7, p[0][1] + dy * 7];
    const tip = [p[N - 1][0] - tx * 8, p[N - 1][1] - ty * 8];
    return [nose, ...left, tip, ...right.reverse()];
  }

  function closedCurve(pts) {
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    ctx.beginPath();
    const s = mid(pts[pts.length - 1], pts[0]);
    ctx.moveTo(s[0], s[1]);
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k];
      const m = mid(a, pts[(k + 1) % pts.length]);
      ctx.quadraticCurveTo(a[0], a[1], m[0], m[1]);
    }
    ctx.closePath();
  }

  function drawLegs(ls, color, wide) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = ctx.lineJoin = 'round';
    for (const l of ls) {
      ctx.lineWidth = 9 + wide;
      ctx.beginPath();
      ctx.moveTo(l.hip[0], l.hip[1]);
      ctx.lineTo(l.knee[0], l.knee[1]);
      ctx.stroke();
      ctx.lineWidth = 7 + wide;
      ctx.beginPath();
      ctx.moveTo(l.knee[0], l.knee[1]);
      ctx.lineTo(l.foot[0], l.foot[1]);
      ctx.stroke();
      // five toes with sticky pads, fanned out
      const base = Math.atan2(l.foot[1] - l.knee[1], l.foot[0] - l.knee[0]);
      ctx.lineWidth = 3 + wide;
      for (let k = -2; k <= 2; k++) {
        const a = base + k * 0.5;
        const ex = l.foot[0] + Math.cos(a) * 10;
        const ey = l.foot[1] + Math.sin(a) * 10;
        ctx.beginPath();
        ctx.moveTo(l.foot[0], l.foot[1]);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ex, ey, 2.6 + wide / 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }

  function draw(g) {
    const [BODY, OUTLINE, SPOT, LIGHT] = g.col;
    const p = spine(g);
    const ls = legs(g, p);
    const body = outline(g, p);
    const cx = Math.round(p[8][0]);
    const cy = Math.round(p[8][1]);
    el.style.transform = `translate(${cx - BOX / 2}px, ${cy - BOX / 2}px)`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, BOX, BOX);
    ctx.setTransform(1, 0, 0, 1, BOX / 2 - cx, BOX / 2 - cy);

    // shadow on the table, light from the top left like the balls
    ctx.save();
    ctx.translate(6, 9);
    drawLegs(ls, 'rgba(0,0,0,0.16)', 0);
    closedCurve(body);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fill();
    ctx.restore();

    // the prey in the jaws, drawn under the head so the part already inside is hidden
    const prey = g.hunt?.prey;
    if (prey) {
      const [x, y, heading, s] = preyPlace(g, prey, p);
      const o = { missing: prey.torn, crumple: prey.crumple };
      drawButterfly(ctx, x + 5, y + 7, heading, s, prey.span, null, o);
      drawButterfly(ctx, x, y, heading, s, prey.span, prey.kind, o);
    }

    drawLegs(ls, OUTLINE, 3);
    drawLegs(ls, BODY, 0);
    closedCurve(body);
    ctx.fillStyle = BODY;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();

    // light bands across the tail, orange spots on the back
    ctx.lineCap = 'round';
    ctx.strokeStyle = LIGHT;
    for (let i = 14; i < N - 1; i += 3) {
      const [, , nx, ny] = frameAt(p, i);
      const w = WIDTH[i] * 0.7;
      ctx.lineWidth = Math.max(2, WIDTH[i] * 0.45);
      ctx.beginPath();
      ctx.moveTo(p[i][0] + nx * w, p[i][1] + ny * w);
      ctx.lineTo(p[i][0] - nx * w, p[i][1] - ny * w);
      ctx.stroke();
    }
    ctx.fillStyle = SPOT;
    for (const [fi, side, r] of g.spots) {
      const i = Math.floor(fi);
      const f = fi - i;
      const [, , nx, ny] = frameAt(p, i);
      const x = p[i][0] + (p[i + 1][0] - p[i][0]) * f + nx * side * WIDTH[i];
      const y = p[i][1] + (p[i + 1][1] - p[i][1]) * f + ny * side * WIDTH[i];
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
    }

    // big bulging eyes with slit pupils
    const [dx, dy, nx, ny] = frameAt(p, 1);
    const ex = (p[1][0] + p[2][0]) / 2;
    const ey = (p[1][1] + p[2][1]) / 2;
    // swallowing, they are squeezed shut and pulled into the head
    const open = 1 - 0.9 * g.squint;
    const ang = Math.atan2(dy, dx);
    for (const side of [1, -1]) {
      const x = ex + nx * side * (15 - 3 * g.squint);
      const y = ey + ny * side * (15 - 3 * g.squint);
      ctx.beginPath();
      ctx.ellipse(x, y, 6.5, 6.5 * open, ang, 0, 2 * Math.PI);
      ctx.fillStyle = open > 0.3 ? '#d9c94a' : BODY;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke();
      if (open > 0.3) {
        ctx.beginPath();
        ctx.moveTo(x - dx * 4.5 * open, y - dy * 4.5 * open);
        ctx.lineTo(x + dx * 4.5 * open, y + dy * 4.5 * open);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#111';
        ctx.stroke();
      }
    }

    const [hx, hy] = unit(p[0][0] - p[3][0], p[0][1] - p[3][1]);
    const nose = [p[0][0] + hx * 6, p[0][1] + hy * 6];
    // after eating: the tongue flicks out and sweeps over the lips, left and right
    if (g.lips > 0) {
      const len = 16 * Math.sin(g.lips * Math.PI);
      const sw = Math.sin(g.lips * 2 * Math.PI) * 0.9;
      const tx = hx * Math.cos(sw) - hy * Math.sin(sw);
      const ty = hx * Math.sin(sw) + hy * Math.cos(sw);
      ctx.beginPath();
      ctx.moveTo(nose[0] - hx * 4, nose[1] - hy * 4);
      ctx.lineTo(nose[0] + tx * len, nose[1] + ty * len);
      ctx.lineCap = 'round';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#e8708f';
      ctx.stroke();
    }
    // after a miss: the tongue comes out and wipes over the eye
    if (g.lick > 0) {
      const eye = [ex + nx * 15, ey + ny * 15];
      const tip = [nose[0] + (eye[0] - nose[0]) * g.lick, nose[1] + (eye[1] - nose[1]) * g.lick];
      ctx.beginPath();
      ctx.moveTo(nose[0], nose[1]);
      ctx.quadraticCurveTo(nose[0] + nx * 14 * g.lick + hx * 8, nose[1] + ny * 14 * g.lick + hy * 8, tip[0], tip[1]);
      ctx.lineCap = 'round';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#e8708f';
      ctx.stroke();
    }
  }

  return {
    stop() {
      clearTimeout(timer);
      clearTimeout(bTimer);
      bf.eaten();
      cancelAnimationFrame(raf);
      raf = 0;
      el.remove();
    },
  };
}
