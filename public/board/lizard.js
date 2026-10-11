// A tokay gecko (the Bali one: blue-grey with orange spots) darts across the splash now and then.
// Drawn procedurally on a small canvas that moves with a CSS transform: a spine of points follows a curved path,
// the body bends and the tail waves in step with a trot (diagonal legs together), feet stay planted while on the
// ground. It runs in dashes with short stops, one of them a longer sit (1-45 s, mostly short), looks around while stopped, then leaves.
// The canvas is redrawn only while the gecko is on screen (a few seconds every PERIOD_MIN..PERIOD_MAX).
// Every run it comes in a different colour (the Bali one, blue, red, green...) and one of five sizes.
// Sizes: the gecko lives in its own units (world px / k), so its shape, gait and hunt need no changes; only what it
// shares with the screen and the butterflies is converted (path, targets, the canvas, the prey's size).
// A sit over 4 s may turn into a hunt (15% catch, 70% a funny miss): a butterfly (butterfly.js) lands in front of
// it, the gecko turns to it, freezes with a twitching tail tip, creeps closer in small steps and lunges.
// A catch is eaten one of five ways (never the same twice in a row):
// - classic: the butterfly struggles in its jaws, a head shake tears a wing off (it flutters down and lies there),
//   a few bites, a swallow with the eyes squeezed shut (lizards push food down with their eyes), a lip lick;
// - gulp: swallowed whole in three quick jerks, then a content blink;
// - escape: it slips out of the jaws, flutters a few centimetres and lands; at the second snap it mostly gets away
//   (ESCAPE), otherwise the gecko eats it the classic way;
// - slam: beaten against the table left and right (tokays stun big prey so), both wings come off, one lies there and
//   the other is carried off the screen; many small bites, a lick over both eyes;
// - run-off: the gecko dashes off with the butterfly flapping in its mouth.
// A miss: a snap at the air, a look after the butterfly and a lick over the eye (geckos do that).
// A wing left lying brings the next gecko within a minute: it comes to eat the wing.
// «Gecko hour»: once in every two hours, at a random minute, for RUSH_MS the geckos come much more often (RUSH, like the
// fast mode). The minute comes from the clock, so all screens in the bar start together and a reload changes nothing.
// The butterfly also just flies by on its own now and then.
// A torn-off wing stays where it fell until the next gecko: its path then leads over the wing, it stops in front of
// it, snaps it up and eats it.
// A glutton (GLUTTON of the geckos) does not stop at one: after a catch it sits on and hunts again, 2-3 butterflies
// in all. Every butterfly eaten makes the belly visibly rounder (FAT, a cartoonish bit more than real);
// the bigger the gecko, the less one butterfly shows on it (fatter()).
// A wing torn off and left lying: WING_EAT of the time the same gecko eats it itself, walking over to it.
// Now and then (DUO) two geckos come and meet, one of four scenes:
// - rivals: both stalk the same butterfly from two sides and snap together; one gets it and the other bites air,
//   or both miss and it flies off; they stare at each other and go their ways;
// - steal: one catches a butterfly, another dashes in from the side, snatches it from its jaws and runs off with it,
//   the robbed one looks after it, licks its eye and gives chase;
// - fight: they meet head-on, puff up, open their mouths, lash their tails and bob their heads; of two sizes the
//   small one wins in SMALL_WINS (the other flees, the winner chases it off), of one size it is a scuffle and both
//   run off;
// - family: a mother and her baby of the same colour, the baby trotting after her on her path; she catches a butterfly,
//   the baby runs up alongside, tears off a wing for itself and eats it.
// The gecko and the butterflies live «on the glass»: above the whole board (splash, tournament slides, the call
// screen), never touching what is shown. A gecko hour happens only when `rush()` allows (not during a tournament).

import { createButterfly, drawButterfly, drawWing } from '/board/butterfly.js';

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
const BOX = 600; // canvas size at size 1, the gecko is drawn around its middle
// size (scale) and how often: 0.6 a baby ... 1.5 a big one, rare
const SLOT_MS = 2 * 60 * 60 * 1000; // one gecko hour in every slot
const RUSH_MS = 5 * 60 * 1000;
const RUSH = 12; // how many times more often during it: a gecko every 35-65 s, 4-5 of them
/** Is a gecko hour on now? Its start in each slot is a hash of the slot number: random, but the same on every screen. */
function rushOn(now = Date.now()) {
  const slot = Math.floor(now / SLOT_MS);
  let x = (slot * 2654435761) >>> 0; // integer hash (xorshift-multiply)
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  const start = slot * SLOT_MS + (x % (SLOT_MS - RUSH_MS));
  return now >= start && now < start + RUSH_MS;
}

const GLUTTON = 0.25; // share of geckos that eat 2-3 butterflies in a row
const WING_EAT = 0.2; // a wing torn off during the meal, within reach: share eaten by the same gecko at once
const FAT = 0.22; // how much rounder the belly of the smallest gecko gets per butterfly
/** The belly after a meal worth `part` of a butterfly: a big gecko barely shows it (1.5 gets a quarter of what 0.6 gets). */
function fatter(g, part = 1) {
  const step = FAT * (SIZES[0][0] / g.k) ** 1.5;
  g.fatTo = Math.min(step * 3, g.fatTo + step * part);
}
const NEXT_CATCH = 0.75; // a glutton's next hunt ends in a catch so often
// TEMPORARY, for testing on dev2: every screen plays the four scenes in turn at the fast pace, as with ?lizard=duo
const DUO_LOOP = 'fight';
const DUO = 1 / 15; // share of runs where two geckos meet (a gecko hour or the fast mode: 1 in 5)
const SMALL_WINS = 0.75; // a standoff of two sizes: the small one wins so often

const STYLES = ['classic', 'gulp', 'escape', 'slam', 'runoff']; // how a catch is eaten
const SIZES = [[0.6, 0.15], [0.8, 0.25], [1, 0.3], [1.2, 0.2], [1.5, 0.1]];
function pickSize() {
  let r = Math.random();
  for (const [k, p] of SIZES) if ((r -= p) < 0) return k;
  return 1;
}
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
 * `?lizard=fast`: the normal behaviour, only 40 times more often (a gecko every 10-20 s) and with 70% catches
 *   instead of 15%, for one screen.
 * `?lizard=glutton`: the fast mode where every gecko is a glutton and eats every wing within its reach.
 * `?lizard=duo`: the fast mode where every run is a scene of two geckos, one after another;
 *   `?lizard=duo-rivals`, `duo-steal`, `duo-fight`, `duo-family`: only that scene.
 */
export function startLizard(root, { rush = () => true, swarm = () => false } = {}) {
  const mode = new URLSearchParams(location.search).get('lizard');
  const glutton = mode === 'glutton'; // the fast mode with every gecko a glutton that always eats the wing it can reach
  // ?lizard=duo: the fast pace with every run a scene of two, in turn; ?lizard=duo-fight (rivals, steal, family): only that one
  const duo = mode?.startsWith('duo') ? mode.split('-')[1] || true : DUO_LOOP || null;
  const duoP = () => (often() > 1 ? 0.2 : DUO); // share of runs that are a scene of two
  const fast = mode === 'fast' || glutton || duo ? 40 : 1;
  const test = mode !== null && fast === 1;
  // the fast mode and a gecko hour: many geckos, catches are the rule
  // ?lizard=fast, «lots of geckos» from the admin page (as often as the fast mode), or a gecko hour
  const often = () => (fast > 1 ? fast : test || DEMO ? 1 : swarm() ? 40 : rush() && rushOn() ? RUSH : 1);
  const escapeP = () => (often() > 1 ? 0 : 0.8); // after slipping out of the jaws, the share that gets away at the second snap
  const catchP = () => (often() > 1 ? 0.7 : 0.15); // share of long sits that end in a catch
  const huntTest = mode === 'hunt';
  const huntAll = huntTest || DEMO;
  const period = () => (DEMO ? 10000 : test ? 15000 : rand(PERIOD_MIN, PERIOD_MAX) / often()); // random, so it is never expected
  const bPeriod = () => (DEMO ? 10000 : test ? 20000 : rand(BUTTERFLY_MIN, BUTTERFLY_MAX) / often());
  // two canvases, one per gecko on screen; made before the butterfly's, so a wing on the table lies above the gecko as before
  const pool = [0, 1].map(() => {
    const el = document.createElement('canvas');
    el.className = 'lizard';
    el.width = el.height = BOX;
    el.hidden = true;
    root.append(el);
    return { el, ctx: el.getContext('2d'), busy: false };
  });
  let ctx = null; // the canvas being drawn on, set by draw()
  const bf = createButterfly(root);
  let timer = setTimeout(run, test ? 2000 : period());
  let bTimer = setTimeout(flyBy, test ? 8000 : bPeriod());
  // a gecko hour starting: the long waits of the normal pace are cut short
  let rushing = false;
  const rushCheck = setInterval(() => {
    const on = often() > 1 && fast === 1;
    if (on && !rushing) {
      clearTimeout(timer);
      timer = setTimeout(run, rand(1000, 5000));
      clearTimeout(bTimer);
      bTimer = setTimeout(flyBy, bPeriod());
    }
    rushing = on;
  }, 3000);
  let raf = 0;
  let last = 0;
  const gs = []; // the geckos on screen: one, or two in a scene
  let scene = null; // two geckos meeting (scenes below)
  let lastColor = -1;
  let lastStyle = -1;
  let hunts = 0;

  function run() {
    timer = setTimeout(run, period());
    if (gs.length) return;
    // now and then two of them (not while a wing waits for the cleaner)
    if (!bf.wing && (duo || Math.random() < duoP()) && startScene()) return;
    show(makeRun());
  }
  /** Puts a gecko on screen on a free canvas. */
  function show(g) {
    const c = pool.find((x) => !x.busy);
    if (!c) return;
    c.busy = true;
    g.cv = c;
    // a bigger gecko needs a bigger canvas; a new size also resets the context, draw() sets it up every frame
    if (c.el.width !== g.box) {
      c.el.width = c.el.height = g.box;
      c.el.style.width = c.el.style.height = `${g.box}px`;
    }
    c.el.hidden = false;
    gs.push(g);
    wake();
  }
  function drop(g) {
    gs.splice(gs.indexOf(g), 1);
    g.cv.busy = false;
    g.cv.el.hidden = true;
    // a wing left on the table: the next gecko comes for it within a minute, not in 7-13 minutes
    if (!gs.length && bf.wing && !test && !DEMO) {
      clearTimeout(timer);
      timer = setTimeout(run, fast > 1 ? period() : rand(20000, 60000));
    }
  }
  function flyBy() {
    bTimer = setTimeout(flyBy, bPeriod());
    if (bf.active || scene || gs.some((g) => g.hunt)) return;
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
    if (scene) {
      scene.t += dt;
      if (scene.later && (scene.later[0] -= dt) <= 0) { const f = scene.later[1]; scene.later = null; f(); }
      scene.update(dt);
    }
    for (const g of [...gs]) if (!advance(g, dt)) drop(g);
    if (scene && !gs.length) scene = null;
    for (const g of gs) draw(g);
    const flying = bf.update(dt);
    if (flying) bf.draw();
    raf = gs.length || flying ? requestAnimationFrame(frame) : 0;
  }

  // ---------- the path: a cubic curve from one edge to the opposite one, sampled by arc length ----------
  function makeRun() {
    const m = 120;
    const meal = bf.wing; // a wing left on the table: this run goes over it
    let a;
    let b;
    let c1;
    let c2;
    if (meal) {
      // a straight-ish line through the wing, edge to edge; one control point for both makes the curve pass through
      // the wing at t = 0.5: B(0.5) = (a + 6c + b) / 8
      const th = rand(0, 2 * Math.PI);
      const [dx, dy] = [Math.cos(th), Math.sin(th)];
      const out = (sx, sy) => Math.min(...[[dx, -meal[0] - m, W + m - meal[0]], [dy, -meal[1] - m, H + m - meal[1]]]
        .map(([d, lo, hi]) => (Math.abs(d) < 1e-6 ? Infinity : (d * sx > 0 ? hi : lo) / (d * sx))));
      const ka = out(-1);
      const kb = out(1);
      a = [meal[0] - dx * ka, meal[1] - dy * ka];
      b = [meal[0] + dx * kb, meal[1] + dy * kb];
      c1 = c2 = [0, 1].map((j) => (8 * meal[j] - a[j] - b[j]) / 6);
    } else if (Math.random() < 0.7) { // across, the long way
      a = [-m, rand(150, H - 150)];
      b = [W + m, rand(150, H - 150)];
    } else {
      a = [rand(300, W - 300), -m];
      b = [rand(300, W - 300), H + m];
    }
    if (!meal) {
      if (Math.random() < 0.5) [a, b] = [b, a];
      c1 = [rand(300, W - 300), rand(200, H - 200)];
      c2 = [rand(300, W - 300), rand(200, H - 200)];
    }
    const g = newGecko(cubic(a, c1, c2, b), pickSize());
    if (meal) g.meal = { at: [meal[0] / g.k, meal[1] / g.k], s: g.lens[100] };
    g.stops = meal ? 0 : Math.floor(rand(1, 4)); // a wing run: its only stop is the meal
    g.sit = huntAll ? g.stops : 1 + Math.floor(Math.random() * g.stops); // which stop (counting down) is the longer sit
    return g;
  }

  /** 201 points of a cubic curve. */
  function cubic(a, c1, c2, b) {
    const pts = [];
    for (let i = 0; i <= 200; i++) {
      const t = i / 200;
      const u = 1 - t;
      pts.push([0, 1].map((j) => u * u * u * a[j] + 3 * u * u * t * c1[j] + 3 * u * t * t * c2[j] + t * t * t * b[j]));
    }
    return pts;
  }
  function nextColor() {
    lastColor = (lastColor + 1 + Math.floor(Math.random() * (COLORS.length - 1))) % COLORS.length; // never twice in a row
    return COLORS[lastColor];
  }

  /** A gecko of size `k` on a path given in screen px; from here on everything about it is in its own units. */
  function newGecko(world, k, col = nextColor()) {
    const pts = world.map((p) => [p[0] / k, p[1] / k]);
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const spots = [];
    for (let i = SHOULDER; i < 22; i += rand(1.2, 2.2)) spots.push([i, rand(-0.6, 0.6), rand(3, 5.5) * (i < HIP + 2 ? 1 : 0.75)]);
    return {
      // the canvas only as big as the gecko needs (bent tail, lunge)
      k, box: Math.ceil((BOX * Math.max(1, k * 0.8)) / 2) * 2,
      pts, lens, total: lens[lens.length - 1], s: 0, v: 0, meal: null,
      mode: 'run', until: rand(0.6, 1.3), top: rand(550, 750), stops: 0, sit: 0, col,
      limit: glutton || Math.random() < GLUTTON ? 2 + (Math.random() < 0.5 ? 1 : 0) : 1, eaten: 0, fat: 0, fatTo: 0,
      t: 0, yaw: 0, yawTo: 0, spots, hunt: null, reach: 0, twitch: 0, chew: 0, gulp: 0, lick: 0, squint: 0, lips: 0, creep: 0,
      gape: 0, puff: 0, wave: 0,
    };
  }

  /**
   * A new way on from where the head is: a curve to `p` arriving along the unit vector `e`, then straight on along `e`
   * off the screen. Gecko units; the body behind keeps the old path. `bend` pulls the start of the curve sideways,
   * `lead` is how far it keeps going the old way first (a share of the distance). Returns the arc length at `p`.
   */
  function reroute(g, p, e, bend = [0, 0], lead = 0.6) {
    const [hx, hy, dx, dy] = at(g, g.s);
    const R = Math.hypot(p[0] - hx, p[1] - hy);
    const back = N * SEG + 60;
    const pts = [];
    for (let s = g.s - back; s < g.s; s += 4) pts.push(at(g, s).slice(0, 2));
    const head = pts.length; // index of the point where the head is now
    const c1 = [hx + dx * R * lead + bend[0], hy + dy * R * lead + bend[1]];
    const c2 = [p[0] - e[0] * R * 0.4, p[1] - e[1] * R * 0.4];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const u = 1 - t;
      pts.push([0, 1].map((j) => u * u * u * [hx, hy][j] + 3 * u * u * t * c1[j] + 3 * u * t * t * c2[j] + t * t * t * p[j]));
    }
    const far = (Math.hypot(W, H) + 400) / g.k;
    for (let i = 1; i <= 40; i++) pts.push([p[0] + e[0] * far * (i / 40), p[1] + e[1] * far * (i / 40)]);
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    Object.assign(g, { pts, lens, total: lens[lens.length - 1], s: lens[head] });
    return lens[head + 40];
  }

  /** Off it goes along its path at `speed` screen px/s, no more stops. */
  function go(g, speed) {
    Object.assign(g, { mode: 'run', until: 99, stops: 0, top: speed / g.k, yawTo: 0, hold: false, creep: 0 });
  }

  /**
   * Turns off by angle `a` (+ is clockwise on screen) and runs off the screen at `speed` px/s. `tight`: turns where it
   * stands, without a step the old way first (next to another gecko). Keeps where the turn ends (`g.exit`, screen px).
   */
  function turnOff(g, a, speed, tight = false) {
    const [hx, hy, dx, dy] = at(g, g.s);
    const e = [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
    const R = 150;
    const f = tight ? 0.05 : 0.5;
    const p = [hx + dx * R * f + e[0] * R, hy + dy * R * f + e[1] * R];
    reroute(g, p, e, [0, 0], tight ? 0.12 : 0.6);
    g.exit = { p: [p[0] * g.k, p[1] * g.k], e };
    go(g, speed);
  }
  /** +1 or -1: the way to turn that leads away from the other gecko's body. */
  function awayFrom(g, o) {
    const [hx, hy, dx, dy] = at(g, g.s);
    const q = spine(o)[8];
    const cross = dx * (q[1] * o.k / g.k - hy) - dy * (q[0] * o.k / g.k - hx);
    return cross > 0 ? -1 : 1;
  }
  /** Turn signs for two face to face: one off to one side of the screen, the other to the opposite side. */
  function apart(a, b) {
    const [dx, dy] = dirOf(a);
    const side = Math.random() < 0.5 ? 1 : -1;
    const n = [-dy * side, dx * side];
    const sign = (g, v) => { const [ex, ey] = dirOf(g); return ex * v[1] - ey * v[0] > 0 ? 1 : -1; };
    return [sign(a, n), sign(b, [-n[0], -n[1]])];
  }
  /** Runs after another along the way it went off (its `exit`), at `speed` px/s. */
  function chase(g, o, speed) {
    const { p, e } = o.exit;
    reroute(g, [p[0] / g.k, p[1] / g.k], e);
    go(g, speed);
  }

  /** Point and unit direction at arc length s; straight lines continue past both ends. */
  function at(g, s) {
    const { pts, lens, total } = g;
    const last = pts.length - 2;
    const k0 = s <= 0 ? 0 : s >= total ? last : Math.min(last, lowerIndex(lens, s));
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
    if (g.delay > 0) { g.delay -= dt; return true; } // waiting off the screen for its cue
    g.t += dt;
    g.until -= dt;
    const hx = at(g, g.s)[0] * g.k;
    const hy = at(g, g.s)[1] * g.k;
    const inside = hx > 250 && hx < W - 250 && hy > 200 && hy < H - 200;
    if (g.mode === 'run' && g.goal && g.s + g.v / 14 >= g.goal.s) {
      // a scene's mark reached: stop there and wait for the scene
      const then = g.goal.then;
      g.goal = null;
      g.mode = 'stop';
      g.until = 999;
      g.yawTo = 0;
      then(g);
    } else if (g.mode === 'run' && g.meal && !g.meal.done && g.s + g.v / 14 >= g.meal.s - REACH - 10) {
      // the wing just ahead (it stops within ~v/14 px): stop, look, snap
      g.meal.done = true;
      g.mode = 'stop';
      g.until = 0;
      g.hunt = { meal: true, target: g.meal.at, phase: 'spot', t: 0, watch: rand(0.6, 1.3) };
    } else if (g.mode === 'run' && g.until <= 0 && g.stops > 0 && inside) {
      g.mode = 'stop';
      const long = g.stops === g.sit;
      g.stops--;
      // the sit: 1 + 44·u⁴, so short is common, long is rare: half under ~4 s, 1 in 10 over 30 s, 1 in 30 over 40 s
      g.until = long ? 1 + 44 * Math.random() ** 4 : rand(0.7, 1.8);
      g.look = long ? g.until - rand(1, 2) : g.until * rand(0.3, 0.6); // when the head turns again
      g.yawTo = rand(-0.4, 0.4);
      if (long && huntAll) g.until = rand(6, 10);
      const r = Math.random();
      if (long && g.force) {
        // a scene wants this sit to be a catch
        g.until = rand(9, 12); // not one of the long sits: the scene is about what comes next
        startHunt(g, true);
        if (g.hunt) Object.assign(g.hunt, g.force);
      } else if (long && g.until > 4 && (huntAll || r < 0.85)) startHunt(g, DEMO ? hunts++ % 2 === 0 : huntTest ? Math.random() < 0.15 : r < catchP());
    } else if (g.mode === 'stop') {
      const busy = g.hunt && !['wait', 'call'].includes(g.hunt.phase); // eyes on the butterfly
      if (!busy && g.look > 0 && g.until < g.look) { g.look -= rand(1.5, 4); g.yawTo = rand(-0.4, 0.4); } // a long sit: several looks
      if (g.hunt) hunt(g, dt);
      if (g.until <= 0 && !g.hunt && !g.hold) { g.mode = 'run'; g.until = rand(0.5, 1.2); g.top = g.carry ? rand(850, 1000) : rand(550, 750); g.yawTo = 0; }
    }
    let target = g.mode === 'run' ? g.top : g.creep;
    if (g.follow) {
      // the baby keeps `gap` px behind its mother on the same path: her speed, plus a pull to close the gap
      const m = g.follow;
      const lag = (m.s * m.k - g.gap) / g.k - g.s;
      target = Math.max(0, Math.min(2400, (m.v * m.k) / g.k + lag * 3));
    }
    g.v += (target - g.v) * (1 - Math.exp(-dt * 14)); // geckos start and stop almost at once
    g.s += g.v * dt;
    g.yaw += (g.yawTo - g.yaw) * (1 - Math.exp(-dt * 10));
    g.fat += (g.fatTo - g.fat) * (1 - Math.exp(-dt * 1.5)); // the belly fills out over a second or two
    if (g.scene) {
      // a scene sets where these should be; they get there smoothly
      const e = 1 - Math.exp(-dt * 8);
      g.puff += ((g.puffTo || 0) - g.puff) * e;
      g.wave += ((g.waveTo || 0) - g.wave) * e;
    }
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

  /** The lunge, now; a butterfly it is not going to catch takes off just as the gecko moves. */
  function lungeNow(g) {
    const h = g.hunt;
    if (!h) return;
    h.phase = 'lunge';
    h.t = 0;
    g.creep = 0;
    if (!h.caught && !h.noFlee) { const [nx, ny] = at(g, g.s - 4 * SEG); bf.flee([nx * g.k, ny * g.k]); }
  }

  function startHunt(g, caught, delay = null) {
    // the butterfly sits a little to one side, just within reach of the nose once the gecko has crept up
    const a = rand(-0.4, 0.4);
    const s = g.s + CREEP;
    const [nx, ny] = at(g, s - 4 * SEG);
    const [hx, hy] = at(g, s);
    const [fx, fy] = unit(hx - nx, hy - ny);
    const d = 4 * SEG + 7 + REACH - 4;
    const target = [nx + (fx * Math.cos(a) - fy * Math.sin(a)) * d, ny + (fx * Math.sin(a) + fy * Math.cos(a)) * d];
    const [wx, wy] = [target[0] * g.k, target[1] * g.k];
    if (wx < 60 || wx > W - 60 || wy < 60 || wy > H - 60) return;
    // a long sit: the butterfly comes later, so the hunt ends well before the sit does
    lastStyle = (lastStyle + 1 + Math.floor(Math.random() * (STYLES.length - 1))) % STYLES.length; // never twice in a row
    const start = delay ?? (g.until > 12 ? rand(0, g.until - 9) : 0);
    g.hunt = { caught, style: STYLES[lastStyle], target, phase: 'wait', t: 0, start };
  }

  function hunt(g, dt) {
    const h = g.hunt;
    h.t += dt;
    const t = h.t;
    if (h.meal) { meal(g, h, t); return; }
    if (h.steal) { steal(g, h, t); return; }
    if (h.robbed) { robbed(g, h, t); return; }
    if (h.tug) { tug(g, h, t); return; }
    const next = (phase) => { h.phase = phase; h.t = 0; };
    if (h.phase === 'wait' && t >= h.start) {
      next('call');
      bf.summon([h.target[0] * g.k, h.target[1] * g.k], () => { next('watch'); h.watch = rand(0.8, 1.8); });
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
        if (h.sync) h.ready = true; // two after one butterfly: the scene says when to snap
        else lungeNow(g);
      }
    } else if (h.phase === 'lunge') {
      g.reach = t < 0.08 ? smooth(t / 0.08) : t < 0.16 ? 1 : t < 0.5 ? 1 - smooth((t - 0.16) / 0.34) : 0;
      if (h.caught && !h.prey && t >= 0.08) {
        h.prey = bf.grab();
        if (!h.prey) h.caught = false;
        else Object.assign(h.prey, { depth: 0, span: 1, crumple: 0, torn: 0 });
      }
      if (t >= 0.5) {
        g.twitch = 0;
        h.base = g.yaw;
        if (h.caught && h.style === 'runoff') {
          // off at once, the butterfly flapping in its mouth; no more stops on the way
          g.carry = h.prey;
          g.hunt = null;
          g.until = 0;
          g.stops = 0;
          return;
        }
        next('after');
      }
    } else if (h.phase === 'lunge2') {
      // escape: the second snap, at the spot where it landed
      g.reach = h.k * (t < 0.08 ? smooth(t / 0.08) : t < 0.16 ? 1 : t < 0.5 ? 1 - smooth((t - 0.16) / 0.34) : 0);
      if (!h.prey && !h.lost && t >= 0.08) {
        h.prey = h.escaped ? null : bf.grab();
        if (h.prey) Object.assign(h.prey, { depth: 0, span: 1, crumple: 0, torn: 0 });
        else h.lost = true;
      }
      if (t >= 0.5) {
        h.base = g.yaw;
        if (h.lost) h.caught = false; // flew off meanwhile: it ends like a miss
        h.style = 'classic';
        next('after');
      }
    } else if (h.phase !== 'after') {
      // waiting for the butterfly to come
    } else if (h.caught) {
      eat(g, h, t);
    } else {
      // missed: freeze, look after it (or at the one that got it), lick the eye
      const p = h.rival ? headW(h.rival) : bf.pos;
      if (p && t > 0.25) g.yawTo = clampYaw(aim(g, [p[0] / g.k, p[1] / g.k]));
      g.lick = t > 1 && t < 1.6 ? Math.sin(((t - 1) / 0.6) * Math.PI) : 0;
      if (t >= 2.2) { g.hunt = null; g.look = g.until - rand(1, 2); }
    }
  }

  /** The catch, `t` seconds after the lunge, eaten the hunt's way. */
  function eat(g, h, t) {
    g.chew = 0;
    g.reach = 0;
    if (h.style === 'gulp') gulp(g, h, t);
    else if (h.style === 'escape') escape(g, h, t);
    else if (h.style === 'slam') slam(g, h, t);
    else classic(g, h, t);
  }

  /** Tears the prey's `side` wing off: it falls to the table, or with `away` is carried off the screen. */
  function tearWing(g, prey, side, speed, away = false) {
    const [x, y, heading, s] = preyPlace(g, prey);
    const [sx, sy] = [-Math.sin(heading) * side, Math.cos(heading) * side]; // that wing's side
    const k = g.k;
    const v = away ? [sx * speed + rand(-80, 80), sy * speed + rand(-80, 80)] : [sx * speed, sy * speed];
    bf.dropWing((x + sx * 24 * s) * k, (y + sy * 24 * s) * k, heading, prey.kind, side, v, away);
  }

  /** Bites `n` over [t0, t1): each jerks the prey further in, the wings crumple. */
  function bites(g, prey, t, t0, t1, n) {
    const len = (t1 - t0) / n;
    const k = Math.min(n - 1, Math.floor((t - t0) / len));
    const u = (t - t0) / len - k;
    g.chew = u < 0.3 ? Math.sin((u / 0.3) * Math.PI) : 0;
    g.reach = 0.08 * g.chew;
    prey.depth = (k + smooth(Math.min(1, u / 0.25))) / n;
    prey.crumple = prey.depth;
  }

  /** Swallow from `t0`: the bulge down the throat with eyes squeezed shut, then a lip lick; true when done. */
  function swallow(g, h, t, t0) {
    h.prey = null;
    g.yawTo = 0;
    const u = t - t0;
    g.gulp = u < 0.9 ? 3 + (u / 0.9) * 6 : 0;
    g.squint = u < 1 ? Math.sin(Math.min(1, u) * Math.PI) : 0;
    g.lips = u > 1.1 && u < 2 ? (u - 1.1) / 0.9 : 0;
    return u >= 2.3;
  }

  /** A catch eaten: rounder; then the wing it dropped, another hunt for a glutton, or on with the sit. */
  function finish(g) {
    g.hunt = null; g.lick = 0; g.squint = 0; g.gulp = 0; g.lips = 0;
    g.eaten++;
    fatter(g);
    if (!g.scene && bf.wing && toWing(g, bf.wing, glutton ? 1 : WING_EAT)) return;
    if (g.scene || !huntMore(g)) g.look = g.until - rand(1, 2);
  }

  /** A glutton with room left: sits on and calls the next butterfly. */
  function huntMore(g) {
    if (g.scene || g.eaten >= g.limit) return false;
    g.mode = 'stop';
    g.until = Math.max(g.until, rand(8, 11));
    g.look = g.until - rand(0.5, 1);
    startHunt(g, Math.random() < NEXT_CATCH, rand(1, 2.5));
    return !!g.hunt;
  }

  /**
   * Turns the gecko towards a wing lying nearby: a new path from where it is, through the wing, on to the edge.
   * The body behind keeps the old path. Goes only with `chance`, and only for a wing it can reach without
   * turning round; false otherwise.
   */
  function toWing(g, wing, chance) {
    const w = [wing[0] / g.k, wing[1] / g.k];
    const [hx, hy, dx, dy] = at(g, g.s);
    const D = Math.hypot(w[0] - hx, w[1] - hy);
    const [ux, uy] = unit(w[0] - hx, w[1] - hy);
    const ahead = dx * ux + dy * uy;
    const near = D < 100 && ahead > 0.55;
    if (!near && (ahead < -0.2 || D < 100)) return false; // behind it: a U-turn folds the body, leave it
    if (Math.random() >= chance) return false;
    if (near) {
      // right in front of the nose: no walk, just turn the head and snap it up
      g.mode = 'stop';
      g.hunt = { meal: true, target: w, phase: 'spot', t: 0, watch: rand(0.5, 1) };
      return true;
    }
    // the last stretch before the wing is straight, so the head points at it when it stops
    // its direction there: between where it looks now and the wing, a gentle bend
    const [ex, ey] = unit(ux + dx * 0.6, uy + dy * 0.6);
    const run = Math.min(REACH + 40, D * 0.5);
    const p = [w[0] - ex * run, w[1] - ey * run];
    const sP = reroute(g, p, [ex, ey]);
    g.meal = { at: w, s: sP + run };
    go(g, rand(300, 420) * g.k); // a few unhurried steps
    return true;
  }

  function gulp(g, h, t) {
    const prey = h.prey;
    if (t < 0.25) {
      prey.span = 0.3 + 0.7 * Math.abs(Math.sin(t * 40));
    } else if (t < 1.15) {
      // three quick jerks and it is gone, wings and all
      bites(g, prey, t, 0.25, 1.15, 3);
      g.reach = 0.12 * g.chew;
      prey.span = (0.4 + 0.4 * Math.abs(Math.sin(t * 35))) * (1 - prey.depth);
    } else {
      h.prey = null;
      const u = t - 1.15;
      g.gulp = u < 0.7 ? 3 + (u / 0.7) * 6 : 0;
      // eyes shut on the gulp, then a slow content blink
      g.squint = u < 0.8 ? Math.sin((u / 0.8) * Math.PI) : u > 1.1 && u < 1.45 ? Math.sin(((u - 1.1) / 0.35) * Math.PI) : 0;
      if (u >= 1.7) finish(g);
    }
  }

  function escape(g, h, t) {
    const prey = h.prey;
    if (t < 0.7) {
      // it fights hard in the jaws
      g.yaw = g.yawTo = h.base + 0.22 * Math.sin(t * 30);
      prey.span = 0.2 + 0.8 * Math.abs(Math.sin(t * 47 + Math.sin(t * 13)));
      return;
    }
    if (!h.to) {
      // slips out and flutters a few centimetres away, off to one side
      const [x, y, heading] = preyPlace(g, prey);
      const k = g.k;
      const a = heading + (Math.random() < 0.5 ? -1 : 1) * rand(0.5, 0.9);
      const d = rand(70, 110);
      const to = [Math.max(80, Math.min(W - 80, x * k + Math.cos(a) * d)), Math.max(80, Math.min(H - 80, y * k + Math.sin(a) * d))];
      h.to = to;
      h.prey = null;
      h.t0 = t;
      bf.release(x * k, y * k, heading, prey.kind, to, () => { h.landed = true; });
      return;
    }
    // follows it with the head; once it sits, snaps again
    g.yawTo = clampYaw(aim(g, [h.to[0] / g.k, h.to[1] / g.k]));
    if (h.landed && t - h.t0 > 0.5 && Math.abs(g.yaw - g.yawTo) < 0.05) {
      const p = spine(g);
      const d = Math.hypot(h.to[0] / g.k - p[0][0], h.to[1] / g.k - p[0][1]);
      h.k = Math.max(0.3, Math.min(1.8, (d - 6) / REACH));
      h.phase = 'lunge2';
      h.t = 0;
      if (Math.random() < escapeP()) { // off just in time: the snap closes on air
        h.escaped = true;
        const [nx, ny] = at(g, g.s - 4 * SEG);
        bf.flee([nx * g.k, ny * g.k]);
      }
    } else if (t - h.t0 > 4) {
      // never settled: give up, like a miss, and the butterfly goes its way
      const [nx, ny] = at(g, g.s - 4 * SEG);
      bf.flee([nx * g.k, ny * g.k]);
      h.caught = false;
      h.style = 'classic';
      h.t = 0;
    }
  }

  function slam(g, h, t) {
    const prey = h.prey;
    if (t < 2.2) {
      // four blows against the table, left, right, left, right
      const k = Math.floor(t / 0.55);
      const u = t / 0.55 - k;
      const sgn = k % 2 ? -1 : 1;
      const sh = u < 0.15 ? smooth(u / 0.15) : u < 0.3 ? 1 : u < 0.5 ? 1 - smooth((u - 0.3) / 0.2) : 0;
      g.yaw = g.yawTo = h.base * 0.3 + sgn * 0.6 * sh;
      prey.span = u < 0.15 ? 0.3 + 0.7 * Math.abs(Math.sin(t * 50)) : u < 0.3 ? 1 : 0.25 + (k < 2 ? 0.3 * Math.abs(Math.sin(t * 30)) : 0);
      if (k === 1 && u >= 0.15 && !prey.torn) { prey.torn = -sgn; tearWing(g, prey, -sgn, 230); } // flung to the table
      if (k === 3 && u >= 0.15 && prey.torn !== 2) { tearWing(g, prey, sgn, 520, true); prey.torn = 2; } // gone with the air
    } else if (t < 5.2) {
      g.yawTo = 0;
      prey.span = 0;
      bites(g, prey, t, 2.2, 5.2, 6);
    } else if (t < 6.2) {
      h.prey = null;
      const u = t - 5.2;
      g.gulp = u < 0.9 ? 3 + (u / 0.9) * 6 : 0;
      g.squint = Math.sin(Math.min(1, u) * Math.PI);
    } else {
      // a lick over one eye, then the other
      g.squint = 0;
      const u = t - 6.3;
      g.lickSide = u < 0.6 ? 1 : -1;
      g.lick = u > 0 && u < 0.6 ? Math.sin((u / 0.6) * Math.PI) : u > 0.7 && u < 1.3 ? Math.sin(((u - 0.7) / 0.6) * Math.PI) : 0;
      if (u >= 1.5) { g.lickSide = 1; finish(g); }
    }
  }

  function classic(g, h, t) {
    const prey = h.prey;
    if (h.hold && t > 1.5) h.t = t = 1.5; // a scene: keeps struggling with it until another gecko comes
    if (t < 1) {
      // the butterfly beats its wings in the jaws, the gecko whips its head side to side to stun it
      g.yaw = g.yawTo = h.base + 0.4 * Math.sin(t * 26) * (1 - t) ** 0.6;
      prey.span = 0.2 + 0.8 * Math.abs(Math.sin(t * 43 + Math.sin(t * 11)));
      if (t > 0.55 && !prey.torn && !h.noTear) {
        // a whip tears one wing off: it flies off to the side the head is swinging to
        prey.torn = Math.cos(t * 26) > 0 ? 1 : -1;
        tearWing(g, prey, prey.torn, 190);
      }
    } else if (t < 1.6) {
      // a pause: the prey still twitches now and then
      g.yawTo = h.base * 0.5;
      prey.span = 0.6 + 0.4 * Math.max(0, Math.sin(t * 34)) * (Math.sin(t * 5) > 0.3 ? 1 : 0);
    } else if (t < 4) {
      // four bites, each one jerks the prey further in; the wings crumple and fold
      bites(g, prey, t, 1.6, 4, 4);
      prey.span = (0.65 + 0.3 * Math.max(0, Math.sin(t * 27)) * (1 - prey.depth)) * (1 - prey.depth * 0.5);
    } else if (swallow(g, h, t, 4)) {
      finish(g);
    }
  }

  /** A wing left on the table: notice it, snap it up, two bites, swallow, lick the lips. */
  function meal(g, h, t) {
    const next = (phase) => { h.phase = phase; h.t = 0; };
    if (h.phase === 'spot') {
      g.yawTo = clampYaw(aim(g, h.target));
      g.twitch = 1;
      if (t > h.watch && g.v < 2 && Math.abs(g.yaw - g.yawTo) < 0.04) {
        // how far the head has to shoot to get the nose onto the wing
        const p = spine(g);
        const [hx, hy] = unit(p[0][0] - p[3][0], p[0][1] - p[3][1]);
        h.k = Math.max(0.2, Math.min(1.5, (Math.hypot(h.target[0] - p[0][0], h.target[1] - p[0][1]) - 6) / REACH));
        h.dir = [hx, hy];
        next('lunge');
      }
    } else if (h.phase === 'lunge') {
      g.reach = h.k * (t < 0.08 ? smooth(t / 0.08) : t < 0.16 ? 1 : t < 0.5 ? 1 - smooth((t - 0.16) / 0.34) : 0);
      if (!h.piece && t >= 0.08) {
        h.piece = bf.takeWing();
        if (h.piece) h.piece.depth = 0;
      }
      if (t >= 0.5) {
        g.twitch = 0;
        if (!h.piece) { g.hunt = null; g.until = rand(0.3, 0.8); return; } // gone meanwhile: run on
        next('after');
      }
    } else {
      const piece = h.piece;
      g.chew = 0;
      g.reach = 0;
      if (t < 1.4) {
        // two bites, each pulls the wing further in
        const k = Math.floor(t / 0.7);
        const u = t / 0.7 - k;
        g.chew = u < 0.3 ? Math.sin((u / 0.3) * Math.PI) : 0;
        g.reach = 0.06 * g.chew;
        if (piece) piece.depth = (k + smooth(Math.min(1, u / 0.25))) / 2;
      } else {
        h.piece = null;
        g.gulp = t < 2.2 ? 3 + ((t - 1.4) / 0.8) * 6 : 0;
        g.squint = t < 2.3 ? Math.sin(Math.min(1, (t - 1.4) / 0.9) * Math.PI) : 0;
        g.lips = t > 2.4 && t < 3.3 ? (t - 2.4) / 0.9 : 0;
        if (t >= 3.5) { g.hunt = null; g.until = rand(0.3, 0.8); fatter(g, 1 / 3); huntMore(g); }
      }
    }
  }

  /** Where the prey is drawn: centre, heading (pointing out of the mouth), scale. */
  function preyPlace(g, prey, p = spine(g)) {
    const [hx, hy] = unit(p[0][0] - p[3][0], p[0][1] - p[3][1]);
    // held by the thorax, the abdomen in the mouth, head and wings outside; each bite pulls it in under the head
    const s = (0.85 * (1 - 0.35 * prey.depth)) / g.k; // the butterfly keeps its size, whatever the gecko's
    const out = 6 + 2 - 3 * s - prey.depth * 40;
    return [p[0][0] + hx * out, p[0][1] + hy * out, Math.atan2(hy, hx), s];
  }

  function unit(x, y) {
    const d = Math.hypot(x, y) || 1;
    return [x / d, y / d];
  }

  // ---------- two geckos ----------
  const SCENES = ['rivals', 'steal', 'fight', 'family'];
  let lastScene = -1;
  /** Where the head is drawn, in screen px. */
  function headW(g) {
    const p = spine(g)[0];
    return [p[0] * g.k, p[1] * g.k];
  }
  const dirOf = (g) => at(g, g.s).slice(2);
  const lunge = (t) => (t < 0.08 ? smooth(t / 0.08) : t < 0.16 ? 1 : t < 0.5 ? 1 - smooth((t - 0.16) / 0.34) : 0);
  /** Signed angle from direction `a` to direction `b` (+ is clockwise on screen). */
  const turn = (a, b) => Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]);
  /** How far a gecko standing still must shoot its head to put the nose on `p` (screen px), in reaches. */
  function reachTo(g, p, most = 1.6) {
    const q = spine(g);
    return Math.max(0.2, Math.min(most, (Math.hypot(p[0] / g.k - q[0][0], p[1] / g.k - q[0][1]) - 6) / REACH));
  }

  /**
   * A gecko coming in from the edge straight along direction `th` (radians) through the point `m` (screen px).
   * Its head stops `stop` px short of `m`, then `then(g)` runs.
   */
  function comer(m, th, k, stop, then, col) {
    const d = [Math.cos(th), Math.sin(th)];
    const M = 140;
    // how far from m to the edge (plus a margin) going along d·sgn
    const span = (sgn) => Math.min(...[0, 1].map((j) => {
      const v = d[j] * sgn;
      if (Math.abs(v) < 1e-6) return Infinity;
      return (v > 0 ? [W, H][j] + M - m[j] : -M - m[j]) / v;
    }));
    const ka = span(-1);
    const kb = span(1);
    const world = [];
    for (let i = 0; i <= 200; i++) {
      const u = -ka + ((ka + kb) * i) / 200;
      world.push([m[0] + d[0] * u, m[1] + d[1] * u]);
    }
    const g = newGecko(world, k, col);
    g.goal = { s: (ka - stop) / k, then };
    g.top = rand(600, 750);
    return g;
  }
  /** Delays the quicker ones so all arrive at their marks together. */
  function sync(...list) {
    const T = list.map((g) => g.goal.s / g.top);
    const max = Math.max(...T);
    list.forEach((g, i) => { g.delay = max - T[i] + rand(0, 0.3); });
  }
  const middle = () => [rand(560, W - 560), rand(380, H - 330)];
  const STALK = CREEP + REACH + 3; // from where it stops to a butterfly it will catch after creeping up (gecko units)

  function startScene() {
    const name = typeof duo === 'string' ? duo : duo ? SCENES[(lastScene = (lastScene + 1) % SCENES.length)] : SCENES[Math.floor(Math.random() * SCENES.length)];
    const sc = SCENE[name]?.();
    if (!sc) return false;
    sc.t = 0;
    for (const g of [sc.a, sc.b]) {
      g.scene = sc;
      g.limit = 1;
      if (g.hold === undefined) g.hold = true;
    }
    scene = sc;
    show(sc.a);
    show(sc.b);
    return true;
  }

  /** Steal: the snatch from the other one's jaws. */
  function steal(g, h, t) {
    g.reach = h.k * lunge(t);
    if (!h.got && t >= 0.08) {
      h.got = true;
      const v = h.steal;
      const prey = v.hunt?.prey;
      if (prey) {
        v.hunt = { robbed: g, t: 0, base: v.yaw };
        g.carry = prey;
      }
    }
    if (t >= 0.5) g.hunt = null;
  }
  /** Steal: the robbed one jerks, looks after the thief, licks its eye. */
  function robbed(g, h, t) {
    g.chew = 0;
    g.reach = 0;
    g.squint = t < 0.3 ? Math.sin((t / 0.3) * Math.PI) * 0.7 : 0;
    if (t > 0.25) g.yawTo = 0.55 * clampYaw(aim(g, headW(h.robbed).map((c) => c / g.k))); // eyes after the thief, the head barely turns
    else g.yaw = g.yawTo = h.base + 0.06 * Math.sin(t * 40); // a start, the head stays put while the thief's snout is there
    g.lick = t > 1.1 && t < 1.7 ? Math.sin(((t - 1.1) / 0.6) * Math.PI) : 0;
    if (t >= 1.9) g.hunt = null;
  }
  /** Family: the baby grabs a wing of its mother's catch, tears it off and eats it. */
  function tug(g, h, t) {
    g.reach = h.k * (t < 0.08 ? smooth(t / 0.08) : t < 0.5 ? 1 : t < 0.8 ? 1 - smooth((t - 0.5) / 0.3) : 0);
    const m = h.tug;
    const prey = m.hunt?.prey;
    if (t > 0.1 && t < 0.5) {
      g.yaw = g.yawTo = h.base + 0.3 * Math.sin(t * 30); // tugging
      if (prey) prey.span = 0.4 + 0.6 * Math.abs(Math.sin(t * 40));
    }
    if (t >= 0.5 && !h.done) {
      h.done = true;
      if (prey && !prey.torn) {
        prey.torn = h.side;
        m.hunt.hold = false;
        g.yawTo = 0;
        g.hunt = { meal: true, phase: 'after', t: 0, piece: { kind: prey.kind, side: h.side, depth: 0 } };
        return;
      }
    }
    if (t >= 0.8) { g.hunt = null; g.yawTo = 0; }
  }

  const SCENE = {
    rivals() {
      const m = middle();
      const th = rand(0, 2 * Math.PI);
      let arrived = 0;
      const here = () => { arrived++; };
      const a = comer(m, th, pickSize(), 0, here);
      const b = comer(m, th + Math.PI + rand(-0.7, 0.7), pickSize(), 0, here);
      a.goal.s -= STALK;
      b.goal.s -= STALK;
      sync(a, b);
      const r = Math.random();
      const winner = r < 0.4 ? a : r < 0.8 ? b : null; // null: both miss
      const loser = winner && (winner === a ? b : a);
      const style = () => (Math.random() < 0.5 ? 'classic' : 'gulp');
      const sc = { a, b, step: 'come' };
      sc.update = () => {
        if (sc.step === 'come' && arrived === 2) {
          sc.step = 'hunt';
          sc.t0 = sc.t;
          const common = { target: null, t: 0, sync: true, noFlee: true };
          a.hunt = { ...common, caught: winner === a, style: style(), target: [m[0] / a.k, m[1] / a.k], phase: 'wait', start: rand(0.4, 1) };
          b.hunt = { ...common, caught: winner === b, style: style(), target: [m[0] / b.k, m[1] / b.k], phase: 'shadow' };
          if (loser) loser.hunt.rival = winner;
        } else if (sc.step === 'hunt') {
          if (a.hunt?.phase === 'watch' && b.hunt?.phase === 'shadow') Object.assign(b.hunt, { phase: 'watch', t: 0, watch: rand(0.6, 1.4) });
          // both crept up: the snap, the winner a split second first
          if ((a.hunt?.ready && b.hunt?.ready) || sc.t - sc.t0 > 20) {
            sc.step = 'snap';
            const [first, second] = winner === b ? [b, a] : [a, b];
            lungeNow(first);
            if (!winner) bf.flee([m[0] + rand(-50, 50), m[1] + rand(-50, 50)]);
            sc.later = [rand(0.06, 0.14), () => lungeNow(second)];
          }
        } else if (sc.step === 'snap') {
          if (loser && !loser.hunt) loser.yawTo = clampYaw(aim(loser, headW(winner).map((c) => c / loser.k)));
          if (!a.hunt && !b.hunt) { sc.step = 'stare'; sc.t0 = sc.t; }
        } else if (sc.step === 'stare') {
          // a look at each other, then each its own way
          const u = sc.t - sc.t0;
          for (const [g, o] of [[a, b], [b, a]]) {
            g.yawTo = clampYaw(aim(g, headW(o).map((c) => c / g.k)));
            if (!winner) g.reach = u > 0.6 && u < 1.6 ? 0.12 * Math.max(0, Math.sin(u * 14)) : 0; // a nod or two
          }
          if (u > (winner ? 1.2 : 2.2)) {
            sc.step = 'gone';
            const [sa, sb] = apart(a, b);
            a.reach = b.reach = 0;
            turnOff(a, sa * rand(1.3, 1.7), a === loser ? 750 : 560, true);
            turnOff(b, sb * rand(1.3, 1.7), b === loser ? 750 : 560, true);
          }
        }
      };
      return sc;
    },

    steal() {
      const m = middle();
      const th = rand(0, 2 * Math.PI);
      const d = [Math.cos(th), Math.sin(th)];
      const ka = pickSize();
      const kb = pickSize();
      const sc = { step: 'come' };
      const a = comer(m, th, ka, 0, () => {
        sc.step = 'hunt';
        a.hunt = { caught: true, style: 'classic', target: [m[0] / a.k, m[1] / a.k], phase: 'wait', t: 0, start: rand(0.3, 0.8), hold: true };
      });
      a.goal.s -= STALK;
      // the thief comes almost head-on, a little from the side, to where the catch will be in the jaws: all the time
      // it is in front of the other, never across it; an ordinary snap, then it turns off away from the other
      const P = [m[0] - d[0] * (REACH - 4) * ka, m[1] - d[1] * (REACH - 4) * ka];
      const thb = th + Math.PI + (Math.random() < 0.5 ? 1 : -1) * rand(0.4, 0.65);
      const b = comer(P, thb, kb, REACH * 1.05 * kb + 12 * ka, () => {
        sc.step = 'snatch';
        // the head turned straight at the catch first, so the snap lands on it and not on the other's head
        const q = a.hunt?.prey ? preyW(a) : P;
        b.yaw = b.yawTo = clampYaw(aim(b, [q[0] / kb, q[1] / kb]));
        b.hunt = { steal: a, phase: 'lunge', t: 0, k: Math.max(0.3, reachTo(b, q) - 0.3) }; // grabs the near wing, not the middle
      });
      b.delay = Infinity; // off the screen until the catch
      b.top = rand(850, 1000) / kb; // a dash
      Object.assign(sc, { a, b });
      sc.update = () => {
        if (sc.step === 'hunt' && a.hunt?.prey) { sc.step = 'dash'; sc.t0 = sc.t; b.delay = 0; }
        else if (sc.step === 'dash' && sc.t - sc.t0 > 6) { sc.step = 'late'; if (a.hunt) a.hunt.hold = false; b.goal = null; go(b, 900); }
        else if (sc.step === 'snatch' && !b.hunt) {
          sc.step = 'run';
          // turning where it stands, away from the robbed one, and off
          turnOff(b, awayFrom(b, a) * rand(1.2, 1.5), b.carry ? 1050 : 700, true);
          if (!a.hunt?.robbed && a.hunt) a.hunt.hold = false; // too late, it was swallowed: just goes
        } else if (sc.step === 'run' && !a.hunt && a.mode === 'stop') {
          sc.step = 'chase';
          chase(a, b, 900); // along the thief's track, long after it has passed
          a.hold = false;
        } else if (sc.step === 'late' && !a.hunt && a.mode === 'stop') {
          sc.step = 'gone';
          go(a, 650);
        }
      };
      return sc;
    },

    fight() {
      const m = middle();
      const th = rand(0, 2 * Math.PI);
      let ka = pickSize();
      let kb = pickSize();
      if (Math.random() < 0.5) kb = ka; // half of them: one size, a scuffle
      const gap = rand(150, 200);
      let arrived = 0;
      const here = () => { arrived++; };
      const a = comer(m, th, ka, gap / 2, here);
      const b = comer(m, th + Math.PI + rand(-0.25, 0.25), kb, gap / 2, here);
      sync(a, b);
      const even = Math.abs(ka - kb) < 0.1;
      const [small, big] = ka < kb ? [a, b] : [b, a];
      const winner = even ? null : Math.random() < SMALL_WINS ? small : big;
      const loser = winner && (winner === a ? b : a);
      const sc = { a, b, step: 'come' };
      const ph = [rand(0, 6), rand(0, 6)];
      sc.update = (dt) => {
        if (sc.step === 'come' && arrived === 2) { sc.step = 'show'; sc.t0 = sc.t; sc.len = rand(2.6, 3.6); }
        const u = sc.t - (sc.t0 || 0);
        if (sc.step === 'show') {
          // the threat display: puffed up, mouths open, tails lashing, heads bobbing
          [a, b].forEach((g, i) => {
            const o = i ? a : b;
            g.yawTo = clampYaw(aim(g, headW(o).map((c) => c / g.k)));
            g.puffTo = 1;
            g.waveTo = 1;
            g.twitch = 1;
            g.gape = Math.max(0, Math.sin(u * 1.9 + ph[i])) ** 0.5;
            g.reach = 0.14 * Math.max(0, Math.sin(u * 11)) * (Math.sin(u * 1.3 + ph[i]) > 0.2 ? 1 : 0);
          });
          if (u > sc.len) {
            sc.step = even ? 'close' : 'flee';
            sc.t0 = sc.t;
            for (const g of [a, b]) { g.gape = 0; g.reach = 0; }
            if (!even) {
              // the loser gives up and runs, the winner after it
              loser.puffTo = 0;
              loser.waveTo = 0;
              loser.twitch = 0;
              turnOff(loser, apart(loser, winner)[0] * rand(1.4, 1.8), 1150, true);
              sc.later = [0.6, () => {
                chase(winner, loser, 1000); // on its track, slower, so it never runs into it
                winner.waveTo = 0;
                winner.twitch = 0;
                winner.puffTo = 0;
              }];
            }
          }
        } else if (sc.step === 'close') {
          // one size: they rush at each other
          const [pa, pb] = [headW(a), headW(b)];
          const near = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) < 85;
          for (const g of [a, b]) g.creep = near ? 0 : 160 / g.k;
          if (near || u > 2) { sc.step = 'scuffle'; sc.t0 = sc.t; sc.base = [a.yaw, b.yaw]; }
        } else if (sc.step === 'scuffle') {
          [a, b].forEach((g, i) => {
            g.creep = 0;
            g.reach = 0.45 * Math.abs(Math.sin(u * 13 + ph[i]));
            g.yaw = g.yawTo = sc.base[i] + 0.35 * Math.sin(u * 21 + ph[i]);
            g.gape = Math.abs(Math.sin(u * 9 + ph[i]));
          });
          if (u > 1.8) {
            sc.step = 'gone';
            // nose to nose: each turns well round, away from the other, one a moment after the other
            const sides = apart(a, b);
            const off = (g, i) => turnOff(g, sides[i] * rand(1.9, 2.2), 1100, true);
            [a, b].forEach((g) => { Object.assign(g, { reach: 0, gape: 0, puffTo: 0, waveTo: 0, twitch: 0 }); g.squint = 0; });
            off(a, 0);
            sc.later = [0.25, () => off(b, 1)];
          }
        }
      };
      return sc;
    },

    family() {
      // the mother on an ordinary run with stops, one of them a catch; the baby on the same path behind her
      const km = Math.random() < 0.5 ? 1.2 : 1.5;
      const kb = 0.6;
      let a0;
      let b0;
      if (Math.random() < 0.7) { a0 = [-120, rand(250, H - 250)]; b0 = [W + 120, rand(250, H - 250)]; }
      else { a0 = [rand(400, W - 400), -120]; b0 = [rand(400, W - 400), H + 120]; }
      if (Math.random() < 0.5) [a0, b0] = [b0, a0];
      const world = cubic(a0, [rand(400, W - 400), rand(300, H - 300)], [rand(400, W - 400), rand(300, H - 300)], b0);
      const col = nextColor();
      const a = newGecko(world, km, col);
      a.stops = Math.floor(rand(2, 4));
      a.sit = 1 + Math.floor(Math.random() * (a.stops - 1)); // not the first stop: the baby has caught up by then
      a.force = { style: 'classic', hold: true, noTear: true };
      a.hold = false;
      a.top = rand(500, 620);
      const b = newGecko(world, kb, col);
      b.follow = a;
      b.gap = (N * SEG + 40) * km;
      b.s = (a.s * km - b.gap) / kb;
      b.hold = false;
      const sc = { a, b, step: 'walk' };
      sc.update = () => {
        if (sc.step === 'walk' && a.hunt?.prey && a.hunt.phase === 'after') {
          // the baby leaves her path: out to one side of her and in to her mouth
          sc.step = 'come';
          const P = preyW(a);
          const dm = dirOf(a);
          const side = (sc.side = Math.random() < 0.5 ? 1 : -1);
          const n = [-dm[1] * side, dm[0] * side];
          const e = unit(-dm[0] * 0.35 - n[0], -dm[1] * 0.35 - n[1]); // past her head, then in from that side, a bit from the front
          const run = REACH * 1.45 * kb;
          const p = [(P[0] - e[0] * run) / kb, (P[1] - e[1] * run) / kb];
          const wide = (WIDTH[8] * km * 1.6 + 50) / kb;
          b.follow = null;
          b.goal = {
            s: reroute(b, p, e, [n[0] * wide, n[1] * wide]),
            then: () => { sc.step = 'tug'; b.hunt = { tug: a, side, phase: 'lunge', t: 0, base: b.yaw, k: reachTo(b, a.hunt?.prey ? preyW(a) : P) }; },
          };
          go(b, 520); // go() keeps the goal
        } else if (sc.step === 'come' && !a.hunt?.prey) {
          sc.step = 'late'; // she ate it all before the baby got there
        } else if ((sc.step === 'tug' || sc.step === 'late') && !b.hunt && b.mode === 'stop') {
          sc.step = 'gone';
          b.hold = false;
          // off ahead of her and out to its side, never on her line: she runs faster than it
          const dm = dirOf(a);
          const side = sc.side;
          const out = unit(dm[0] - dm[1] * side, dm[1] + dm[0] * side);
          turnOff(b, turn(dirOf(b), out), 650, true);
        }
        if (sc.step === 'come' && sc.t > 60) { b.goal = null; go(b, 500); sc.step = 'gone'; }
      };
      return sc;
    },
  };
  /** Where the catch in a gecko's jaws is, in screen px. */
  function preyW(g) {
    const [x, y] = preyPlace(g, g.hunt.prey);
    return [x * g.k, y * g.k];
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
      if (i > 13 && g.wave) off += g.wave * 16 * Math.sin(g.t * 8 - (i - 13) * 0.5) * ((i - 13) / 12); // a threat: the tail lashes
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
    if (g.puff && i <= HIP) w *= 1 + 0.16 * g.puff; // puffed up to look bigger
    if (g.fat && i > 4 && i < 12) w *= 1 + g.fat * Math.sin((Math.PI * (i - 4)) / 8); // the full belly, widest mid-body
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
    ctx = g.cv.ctx;
    const el = g.cv.el;
    const [BODY, OUTLINE, SPOT, LIGHT] = g.col;
    const p = spine(g);
    const ls = legs(g, p);
    const body = outline(g, p);
    const { k, box } = g;
    const cx = Math.round(p[8][0] * k);
    const cy = Math.round(p[8][1] * k);
    el.style.transform = `translate(${cx - box / 2}px, ${cy - box / 2}px)`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, box, box);
    ctx.setTransform(k, 0, 0, k, box / 2 - cx, box / 2 - cy); // gecko units -> canvas px

    // shadow on the table, light from the top left like the balls
    ctx.save();
    ctx.translate(6, 9);
    drawLegs(ls, 'rgba(0,0,0,0.16)', 0);
    closedCurve(body);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fill();
    ctx.restore();

    // the prey in the jaws, drawn under the head so the part already inside is hidden
    const prey = g.hunt?.prey || g.carry;
    if (g.carry) g.carry.span = 0.25 + 0.75 * Math.abs(Math.sin(g.t * 41 + Math.sin(g.t * 9))); // still flapping
    if (prey) {
      const [x, y, heading, s] = preyPlace(g, prey, p);
      const o = { missing: prey.torn, crumple: prey.crumple };
      drawButterfly(ctx, x + 5 / k, y + 7 / k, heading, s, prey.span, null, o);
      drawButterfly(ctx, x, y, heading, s, prey.span, prey.kind, o);
    }

    // a wing picked up from the table, held by its torn end at the corner of the mouth
    const piece = g.hunt?.piece;
    if (piece) {
      const [hx, hy] = unit(p[0][0] - p[3][0], p[0][1] - p[3][1]);
      const back = 2 + piece.depth * 26;
      const x = p[0][0] + hx * (6 - back);
      const y = p[0][1] + hy * (6 - back);
      const sc = (0.85 * (1 - 0.45 * piece.depth)) / k;
      drawWing(ctx, x + 5 / k, y + 7 / k, Math.atan2(hy, hx), sc, null, piece.side, true);
      drawWing(ctx, x, y, Math.atan2(hy, hx), sc, piece.kind, piece.side, true);
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
      const x = p[i][0] + (p[i + 1][0] - p[i][0]) * f + nx * side * width(g, i);
      const y = p[i][1] + (p[i + 1][1] - p[i][1]) * f + ny * side * width(g, i);
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
    if (g.gape > 0.03) {
      // the mouth wide open, a threat: the pink inside between the jaws
      const o = g.gape;
      ctx.beginPath();
      ctx.moveTo(p[2][0], p[2][1]);
      ctx.lineTo(nose[0] + nx * 10 * o, nose[1] + ny * 10 * o);
      ctx.quadraticCurveTo(nose[0] + hx * 5, nose[1] + hy * 5, nose[0] - nx * 10 * o, nose[1] - ny * 10 * o);
      ctx.closePath();
      ctx.fillStyle = '#d2475f';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke();
    }
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
      const side = g.lickSide || 1;
      const eye = [ex + nx * 15 * side, ey + ny * 15 * side];
      const tip = [nose[0] + (eye[0] - nose[0]) * g.lick, nose[1] + (eye[1] - nose[1]) * g.lick];
      ctx.beginPath();
      ctx.moveTo(nose[0], nose[1]);
      ctx.quadraticCurveTo(nose[0] + nx * side * 14 * g.lick + hx * 8, nose[1] + ny * side * 14 * g.lick + hy * 8, tip[0], tip[1]);
      ctx.lineCap = 'round';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#e8708f';
      ctx.stroke();
    }
  }

  return {
    stop() {
      clearInterval(rushCheck);
      clearTimeout(timer);
      clearTimeout(bTimer);
      bf.eaten();
      cancelAnimationFrame(raf);
      raf = 0;
      el.remove();
    },
  };
}
