// Splash before the tournament starts: the bar logo in the middle, flat pool balls roll by.
// Rules (docs/requirements.md, «Анимация заглушки»):
// - at most 2 balls on screen, the cue ball included;
// - some balls hit the logo: it squashes a little and springs back;
// - some balls roll in slowly and stop near the logo; later the cue ball knocks such a ball out and both leave.
// Light for a TV browser: two balls and the logo are DOM elements moved with CSS transforms, no canvas redraw.
// Collisions with the logo use its alpha mask, so balls bounce off the drawing, not off its bounding box.

const W = 1920;
const H = 1080;
const R = 59; // ball radius (diameter 118 px on the 1920×1080 stage)
const LOGO_W = 1260;
const LOGO_SRC = '/assets/cuba-libre-logo.svg';
const LOGO_TEXT_Y = 0.38; // vertical centre of the «CUBA LIBRE» letters, as a share of the logo height
const TEXT_SCREEN_Y = 0.46; // where those letters sit on the screen, as a share of its height (a bit above the middle)
const SHADOW_DX = 9; // ball shadow offset: light from the top left
const SHADOW_DY = 13;
const MASK_SCALE = 0.5; // the mask is kept at half resolution
const FRICTION_FAST = 50; // px/s², balls that roll by
const FRICTION_SLOW = 260; // px/s², balls that stop near the logo
const RESTITUTION = 0.85;
const CUSHION = 0.8; // speed kept after bouncing off a screen edge
const CUSHION_CHANCE = 0.4; // a rolling ball, or each ball after the cue shot, may bounce off an edge once
const MAX_STEP = 8; // px per physics sub-step, prevents tunnelling at low frame rates

const COLORS = ['#F2C200', '#1F4FBF', '#D21034', '#5B2A86', '#F07A1A', '#11804A', '#7A1F1F', '#111111'];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const len = (x, y) => Math.hypot(x, y);
const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/** Mounts the animation into `root` (a 1920×1080 box). Returns { stop }. */
export function startSplash(root) {
  root.innerHTML = '';
  root.style.setProperty('--ball', `${2 * R}px`); // ball size for style.css
  const logo = new Image();
  logo.src = LOGO_SRC;
  logo.alt = 'Cuba Libre';
  logo.className = 'splash-logo';
  root.appendChild(logo);

  let mask = null; // { data: Uint8Array, w, h, x0, y0 } in stage pixels / MASK_SCALE
  let logoBox = null; // { x, y, w, h } on the stage
  let balls = [];
  let wobbles = [];
  let nextSpawn = performance.now() + 1500;
  let raf = 0;
  let last = 0;
  let stopped = false;

  logo.addEventListener('load', () => {
    if (stopped) return;
    const h = LOGO_W * (logo.naturalHeight / logo.naturalWidth || 1147 / 2720);
    // Centre the screen on the bar name, not on the whole drawing (the figure's legs hang far below it).
    logoBox = { x: (W - LOGO_W) / 2, y: H * TEXT_SCREEN_Y - h * LOGO_TEXT_Y, w: LOGO_W, h };
    logo.style.width = `${LOGO_W}px`;
    logo.style.left = `${logoBox.x}px`;
    logo.style.top = `${logoBox.y}px`;
    try {
      mask = buildMask(logo, logoBox);
    } catch {
      mask = null; // without a mask the balls only roll by
    }
    last = performance.now();
    raf = requestAnimationFrame(frame);
  });

  // ---------- logo mask ----------

  function buildMask(img, box) {
    const mw = Math.ceil(box.w * MASK_SCALE);
    const mh = Math.ceil(box.h * MASK_SCALE);
    const c = document.createElement('canvas');
    c.width = mw;
    c.height = mh;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, mw, mh);
    const px = g.getImageData(0, 0, mw, mh).data;
    const data = new Uint8Array(mw * mh);
    for (let i = 0; i < data.length; i++) data[i] = px[i * 4 + 3] > 60 ? 1 : 0;
    return { data, w: mw, h: mh };
  }

  function solid(x, y) {
    if (!mask) return false;
    const mx = Math.floor((x - logoBox.x) * MASK_SCALE);
    const my = Math.floor((y - logoBox.y) * MASK_SCALE);
    if (mx < 0 || my < 0 || mx >= mask.w || my >= mask.h) return false;
    return mask.data[my * mask.w + mx] === 1;
  }

  const RING = Array.from({ length: 20 }, (_, i) => [Math.cos((i / 20) * Math.PI * 2), Math.sin((i / 20) * Math.PI * 2)]);

  /** Contact of a ball at (x, y) with the logo: outward normal, or null. */
  function logoContact(x, y, r = R) {
    if (!mask) return null;
    if (x + r < logoBox.x || x - r > logoBox.x + logoBox.w || y + r < logoBox.y || y - r > logoBox.y + logoBox.h) return null;
    let nx = 0;
    let ny = 0;
    let hits = 0;
    for (const k of [1, 0.6]) {
      for (const [cx, cy] of RING) {
        if (solid(x + cx * r * k, y + cy * r * k)) { nx -= cx; ny -= cy; hits++; }
      }
    }
    if (solid(x, y)) hits++;
    if (!hits) return null;
    const l = len(nx, ny);
    if (l < 1e-6) {
      // Deep inside: push away from the logo centre.
      const dx = x - (logoBox.x + logoBox.w / 2);
      const dy = y - (logoBox.y + logoBox.h / 2);
      const d = len(dx, dy) || 1;
      return [dx / d, dy / d];
    }
    return [nx / l, ny / l];
  }

  /** Does a ball moving along the segment touch the logo? */
  function pathHitsLogo(x1, y1, x2, y2, r = R + 6) {
    const d = len(x2 - x1, y2 - y1);
    const n = Math.max(1, Math.ceil(d / 12));
    for (let i = 0; i <= n; i++) {
      if (logoContact(x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n, r)) return true;
    }
    return false;
  }

  const onScreen = (x, y, pad = 0) => x > -pad && x < W + pad && y > -pad && y < H + pad;

  // ---------- balls ----------

  function makeBall(num, x, y, vx, vy, friction) {
    const el = document.createElement('div');
    if (num === 0) {
      el.className = 'ball cue';
      el.innerHTML = '<i class="dot"></i>';
    } else {
      const color = COLORS[(num - 1) % 8];
      el.className = num > 8 ? 'ball stripe' : 'ball';
      el.style.setProperty('--c', color);
      el.innerHTML = `<span>${num}</span>`;
    }
    const shadow = document.createElement('div');
    shadow.className = 'ball-shadow';
    const shine = document.createElement('div');
    shine.className = 'ball-shine';
    root.append(shadow, el, shine);
    const b = { num, el, shadow, shine, x, y, vx, vy, friction, angle: rand(0, Math.PI * 2), resting: false, restAt: 0, entered: false };
    balls.push(b);
    place(b);
    return b;
  }

  function place(b) {
    b.el.style.transform = `translate(${b.x - R}px, ${b.y - R}px) rotate(${b.angle}rad)`;
    b.shadow.style.transform = `translate(${b.x - R + SHADOW_DX}px, ${b.y - R + SHADOW_DY}px)`;
    b.shine.style.transform = `translate(${b.x - R}px, ${b.y - R}px)`;
  }

  function removeBall(b) {
    b.el.remove();
    b.shadow.remove();
    b.shine.remove();
    balls = balls.filter((x) => x !== b);
  }

  /** A point just outside a random screen edge. */
  function edgePoint() {
    const m = R + 4;
    switch (Math.floor(Math.random() * 4)) {
      case 0: return [rand(0, W), -m];
      case 1: return [W + m, rand(0, H)];
      case 2: return [rand(0, W), H + m];
      default: return [-m, rand(0, H)];
    }
  }

  /** Walk back from (x, y) along -dir until off screen. */
  function backToEdge(x, y, dx, dy) {
    let s = 0;
    while (onScreen(x - dx * s, y - dy * s, R + 4) && s < 5000) s += 10;
    return [x - dx * s, y - dy * s];
  }

  /** Distance from (x, y) along dir until the ball is fully off screen. */
  function exitDistance(x, y, dx, dy) {
    let s = 50;
    while (onScreen(x + dx * s, y + dy * s, R + 4) && s < 5000) s += 10;
    return s;
  }

  const freeNumber = () => {
    const used = new Set(balls.map((b) => b.num));
    let n;
    do n = 1 + Math.floor(Math.random() * 15); while (used.has(n));
    return n;
  };

  // A ball rolls across the screen, missing or hitting the logo.
  function spawnRoll(hit) {
    for (let t = 0; t < 30; t++) {
      const [sx, sy] = edgePoint();
      let tx;
      let ty;
      if (hit) {
        if (!mask) return false;
        // Aim at a random solid point of the logo.
        let k = 0;
        do {
          tx = rand(logoBox.x, logoBox.x + logoBox.w);
          ty = rand(logoBox.y, logoBox.y + logoBox.h);
        } while (!solid(tx, ty) && ++k < 200);
      } else {
        tx = rand(200, W - 200);
        ty = rand(150, H - 150);
      }
      const d = len(tx - sx, ty - sy);
      const dx = (tx - sx) / d;
      const dy = (ty - sy) / d;
      if (!hit && pathHitsLogo(sx, sy, sx + dx * 2600, sy + dy * 2600)) continue;
      // A miss must roll off the far edge: a ball that stops on screen would wait for a cue shot that may not exist.
      const vMin = hit ? 0 : Math.sqrt(2 * FRICTION_FAST * (exitDistance(sx, sy, dx, dy) + 150));
      const v = Math.max(vMin, hit ? rand(650, 1000) : rand(420, 760));
      const b = makeBall(freeNumber(), sx, sy, dx * v, dy * v, FRICTION_FAST);
      b.cushions = Math.random() < CUSHION_CHANCE ? 1 : 0;
      return true;
    }
    return false;
  }

  // A ball rolls in slowly and stops next to the logo.
  function spawnSlow() {
    if (!mask) return false;
    const cx = logoBox.x + logoBox.w / 2;
    const cy = logoBox.y + logoBox.h / 2;
    for (let t = 0; t < 40; t++) {
      // Rest point: march out from the logo centre until the ball is clear, then leave a gap.
      const a = rand(0, Math.PI * 2);
      const ux = Math.cos(a);
      const uy = Math.sin(a) * 0.6;
      const ul = len(ux, uy);
      let s = 0;
      while (logoContact(cx + (ux / ul) * s, cy + (uy / ul) * s, R + 2) && s < 1200) s += 6;
      s += rand(25, 80);
      const qx = cx + (ux / ul) * s;
      const qy = cy + (uy / ul) * s;
      if (!onScreen(qx, qy, -(R + 30))) continue;
      // No clean cue shot from there (e.g. squeezed between the logo and the screen edge): pick another spot.
      if (!findShot(qx, qy, 200)) continue;
      const [sx, sy] = edgePoint();
      if (pathHitsLogo(sx, sy, qx, qy)) continue;
      const d = len(qx - sx, qy - sy);
      const v = Math.sqrt(2 * FRICTION_SLOW * d);
      makeBall(freeNumber(), sx, sy, ((qx - sx) / d) * v, ((qy - sy) / d) * v, FRICTION_SLOW);
      return true;
    }
    return false;
  }

  /**
   * A cue shot at a ball resting at (x, y): the struck ball leaves without running into the logo, and the cue's own
   * path from the screen edge is clear. Returns { sx, sy, vx, vy } (start point, unit direction) or null.
   */
  function findShot(x, y, tries) {
    for (let t = 0; t < tries; t++) {
      // Direction the struck ball will take: must not run into the logo.
      const oa = rand(0, Math.PI * 2);
      const ox = Math.cos(oa);
      const oy = Math.sin(oa);
      if (pathHitsLogo(x + ox * (R + 2), y + oy * (R + 2), x + ox * 700, y + oy * 700, R)) continue;
      // Cut angle keeps the cue moving after the hit, so it leaves the screen too.
      const [vx, vy] = rot(ox, oy, (Math.random() < 0.5 ? -1 : 1) * rand(0.35, 0.95));
      const contactX = x - ox * 2 * R;
      const contactY = y - oy * 2 * R;
      const [sx, sy] = backToEdge(contactX, contactY, vx, vy);
      if (pathHitsLogo(sx, sy, contactX, contactY)) continue;
      return { sx, sy, vx, vy };
    }
    return null;
  }

  // The cue ball comes in and knocks the resting ball away from the logo.
  function spawnCue(target) {
    const shot = findShot(target.x, target.y, 300);
    if (shot) {
      const v = rand(1300, 1700);
      makeBall(0, shot.sx, shot.sy, shot.vx * v, shot.vy * v, 0);
      return true;
    }
    // No clean shot: nudge the ball away instead.
    target.resting = false;
    target.friction = FRICTION_FAST;
    const cx = logoBox.x + logoBox.w / 2;
    const cy = logoBox.y + logoBox.h / 2;
    const d = len(target.x - cx, target.y - cy) || 1;
    target.vx = ((target.x - cx) / d) * 600;
    target.vy = ((target.y - cy) / d) * 600;
    return true;
  }

  // ---------- physics ----------

  function wobble(nx, ny, strength) {
    wobbles.push({ nx, ny, amp: Math.min(0.05, strength / 18000), t0: performance.now() });
  }

  function step(b, dt) {
    if (b.resting) return;
    const speed = len(b.vx, b.vy);
    if (b.friction && speed > 0) {
      const ns = Math.max(0, speed - b.friction * dt);
      if (ns < 6 && !onScreen(b.x, b.y) && onScreen(b.x, b.y, R)) {
        // Stopping half off screen would make it vanish (see frame()): keep it rolling slowly instead.
        b.vx *= 40 / speed;
        b.vy *= 40 / speed;
      } else if (ns < 6) {
        b.vx = 0;
        b.vy = 0;
        if (onScreen(b.x, b.y)) {
          b.resting = true;
          b.restAt = performance.now();
          b.restDelay = rand(1800, 4000);
        }
        return;
      } else {
        b.vx *= ns / speed;
        b.vy *= ns / speed;
      }
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.angle += (len(b.vx, b.vy) * dt) / R * (b.vx >= 0 ? 1 : -1);
    if (b.cushions) bounceOffEdge(b);

    const n = logoContact(b.x, b.y);
    if (n) {
      const vn = b.vx * n[0] + b.vy * n[1];
      if (vn < 0) {
        b.vx -= (1 + RESTITUTION) * vn * n[0];
        b.vy -= (1 + RESTITUTION) * vn * n[1];
        wobble(n[0], n[1], -vn);
      }
      // Push out of the logo.
      for (let k = 0; k < 20 && logoContact(b.x, b.y); k++) {
        b.x += n[0] * 2;
        b.y += n[1] * 2;
      }
    }
  }

  /**
   * Screen edges are open, except once for a rolling ball or after the cue shot (b.cushions): the ball bounces off the edge it reaches,
   * but only when the bounced path still takes it off screen (fast enough, clear of the logo). Otherwise it leaves.
   */
  function bounceOffEdge(b) {
    const nx = b.x < R && b.vx < 0 ? 1 : b.x > W - R && b.vx > 0 ? -1 : 0;
    const ny = b.y < R && b.vy < 0 ? 1 : b.y > H - R && b.vy > 0 ? -1 : 0;
    if (!nx && !ny) return;
    b.cushions = 0; // one chance: bounce now or leave
    const vx = nx ? -b.vx * CUSHION : b.vx;
    const vy = ny ? -b.vy * CUSHION : b.vy;
    const sp = len(vx, vy);
    const dx = vx / sp;
    const dy = vy / sp;
    const dist = exitDistance(b.x, b.y, dx, dy);
    if (b.friction && sp * sp < 2 * b.friction * (dist + 150)) return;
    if (pathHitsLogo(b.x, b.y, b.x + dx * dist, b.y + dy * dist, R)) return;
    b.vx = vx;
    b.vy = vy;
  }

  function collide(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = len(dx, dy);
    if (d >= 2 * R || d === 0) return;
    const nx = dx / d;
    const ny = dy / d;
    const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    // Separate the balls.
    const push = (2 * R - d) / 2;
    a.x -= nx * push;
    a.y -= ny * push;
    b.x += nx * push;
    b.y += ny * push;
    if (rel <= 0) return;
    // Equal masses, elastic: exchange the normal components.
    a.vx -= rel * nx;
    a.vy -= rel * ny;
    b.vx += rel * nx;
    b.vy += rel * ny;
    for (const x of [a, b]) {
      if (x.resting) x.resting = false;
      if (x.num !== 0) x.friction = FRICTION_FAST;
      // Decided once per ball, at the cue shot.
      if ((a.num === 0 || b.num === 0) && x.cushions === undefined) x.cushions = Math.random() < CUSHION_CHANCE ? 1 : 0;
    }
  }

  function frame(now) {
    if (stopped) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const maxSpeed = balls.reduce((m, b) => Math.max(m, len(b.vx, b.vy)), 0);
    const steps = Math.max(1, Math.ceil((maxSpeed * dt) / MAX_STEP));
    for (let i = 0; i < steps; i++) {
      for (const b of balls) step(b, dt / steps);
      if (balls.length === 2) collide(balls[0], balls[1]);
    }

    for (const b of [...balls]) {
      if (onScreen(b.x, b.y, -R)) b.entered = true;
      const away = !onScreen(b.x, b.y, R + 40);
      const stuck = !b.resting && b.vx === 0 && b.vy === 0; // stopped off screen
      if (stuck || (away && (b.entered || !onScreen(b.x + b.vx, b.y + b.vy, R + 40)))) removeBall(b);
      else place(b);
    }

    schedule(now);
    drawLogo(now);
    raf = requestAnimationFrame(frame);
  }

  function schedule(now) {
    const resting = balls.find((b) => b.resting);
    if (resting) {
      // The cue comes only when the resting ball is alone on screen (max 2 balls).
      if (balls.length === 1 && now - resting.restAt > resting.restDelay) spawnCue(resting);
      return;
    }
    if (now < nextSpawn || balls.length >= 2) return;
    if (balls.some((b) => b.friction === FRICTION_SLOW)) return; // a slow ball is on its way
    const r = Math.random();
    let ok;
    if (balls.length === 0 && r < 0.3) ok = spawnSlow();
    else if (r < 0.65) ok = spawnRoll(true);
    else ok = spawnRoll(false);
    nextSpawn = now + (ok ? rand(1500, 5000) : 500);
  }

  // Elastic squash of the logo: squeezed along the hit direction, stretched across, damped spring back.
  function drawLogo(now) {
    if (!wobbles.length) return;
    wobbles = wobbles.filter((w) => now - w.t0 < 900);
    if (!wobbles.length) {
      logo.style.transform = '';
      return;
    }
    let a = 1;
    let b = 0;
    let c = 0;
    let d = 1;
    let tx = 0;
    let ty = 0;
    for (const w of wobbles) {
      const t = (now - w.t0) / 1000;
      const s = w.amp * Math.exp(-t / 0.13) * Math.cos(2 * Math.PI * 5.5 * t);
      // S = I + s·(−n nᵀ + 0.5 m mᵀ), m ⟂ n
      const [nx, ny] = [w.nx, w.ny];
      const [mx, my] = [-ny, nx];
      a += s * (-nx * nx + 0.5 * mx * mx);
      b += s * (-nx * ny + 0.5 * mx * my);
      c += s * (-ny * nx + 0.5 * my * mx);
      d += s * (-ny * ny + 0.5 * my * my);
      tx -= nx * s * 120;
      ty -= ny * s * 120;
    }
    logo.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, ${tx}, ${ty})`;
  }

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      root.innerHTML = '';
    },
  };
}
