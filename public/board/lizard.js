// A tokay gecko (the Bali one: blue-grey with orange spots) darts across the splash now and then.
// Drawn procedurally on a small canvas that moves with a CSS transform: a spine of points follows a curved path,
// the body bends and the tail waves in step with a trot (diagonal legs together), feet stay planted while on the
// ground. It runs in dashes with short stops, one of them a longer sit (1-45 s, mostly short), looks around while stopped, then leaves.
// The canvas is redrawn only while the gecko is on screen (a few seconds every PERIOD_MIN..PERIOD_MAX).

const W = 1920;
const H = 1080;
const PERIOD_MIN = 7 * 60 * 1000;
const PERIOD_MAX = 13 * 60 * 1000;
const SEG = 12; // px between spine points
const N = 26; // spine points: 0-3 head, 4 neck, 5 shoulders, 11 hips, 12-25 tail
const SHOULDER = 5;
const HIP = 11;
const STRIDE = 100; // px travelled per full gait cycle
const BOX = 600; // canvas size, the gecko is drawn around its middle
const BODY = '#7d95b5';
const OUTLINE = '#3e4f66';
const SPOT = '#f07a3a';
const LIGHT = '#c9d6e6';

const rand = (a, b) => a + Math.random() * (b - a);
const smooth = (x) => x * x * (3 - 2 * x);

// half-width of the body at each spine point: big head, thin neck, round belly, long tapering tail
const WIDTH = Array.from({ length: N }, (_, i) => {
  if (i <= 4) return [9, 16, 19, 17, 12][i];
  if (i <= HIP) return [16, 20, 21, 21, 21, 20, 16][i - 5];
  return 11 * (1 - (i - 12) / 14) ** 0.8 + 1.5;
});

/** Mounts the gecko layer into `root`. Returns { stop }. `?lizard` in the page address: every 15 s, for testing. */
export function startLizard(root) {
  const test = new URLSearchParams(location.search).has('lizard');
  const period = () => (test ? 15000 : rand(PERIOD_MIN, PERIOD_MAX)); // random, so it is never expected
  const el = document.createElement('canvas');
  el.className = 'lizard';
  el.width = el.height = BOX;
  el.hidden = true;
  root.append(el);
  const ctx = el.getContext('2d');
  let timer = setTimeout(run, test ? 2000 : period());
  let raf = 0;

  function run() {
    timer = setTimeout(run, period());
    if (raf) return;
    const g = makeRun();
    el.hidden = false;
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!advance(g, dt)) {
        el.hidden = true;
        raf = 0;
        return;
      }
      draw(g);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
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
    return {
      pts, lens, total: lens[200], s: 0, v: 0,
      mode: 'run', until: rand(0.6, 1.3), top: rand(550, 750), stops,
      sit: 1 + Math.floor(Math.random() * stops), // which stop (counting down) is the longer sit
      t: 0, yaw: 0, yawTo: 0, spots,
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
    } else if (g.mode === 'stop') {
      if (g.look > 0 && g.until < g.look) { g.look -= rand(1.5, 4); g.yawTo = rand(-0.4, 0.4); } // a long sit: several looks
      if (g.until <= 0) { g.mode = 'run'; g.until = rand(0.5, 1.2); g.top = rand(550, 750); g.yawTo = 0; }
    }
    const target = g.mode === 'run' ? g.top : 0;
    g.v += (target - g.v) * (1 - Math.exp(-dt * 14)); // geckos start and stop almost at once
    g.s += g.v * dt;
    g.yaw += (g.yawTo - g.yaw) * (1 - Math.exp(-dt * 10));
    return g.s < g.total + N * SEG + 60;
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

  function outline(p) {
    const left = [];
    const right = [];
    for (let i = 0; i < N; i++) {
      const [, , nx, ny] = frameAt(p, i);
      const w = WIDTH[i];
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
    const p = spine(g);
    const ls = legs(g, p);
    const body = outline(p);
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
    for (const side of [1, -1]) {
      const x = ex + nx * side * 15;
      const y = ey + ny * side * 15;
      ctx.beginPath();
      ctx.arc(x, y, 6.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#d9c94a';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - dx * 4.5, y - dy * 4.5);
      ctx.lineTo(x + dx * 4.5, y + dy * 4.5);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#111';
      ctx.stroke();
    }
  }

  return {
    stop() {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      raf = 0;
      el.remove();
    },
  };
}
