// Splash before the tournament starts: the bar logo in the middle, flat pool balls roll by.
// Rules (docs/requirements.md, «Анимация заглушки»):
// - many balls at once (up to MAX_BALLS, the cue ball included), they collide with each other;
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
const SHADOW_DX = 24; // cast shadow offset: light from the top left, so it falls to the bottom right
const SHADOW_DY = 32;
const MASK_SCALE = 0.5; // the mask is kept at half resolution
const FRICTION_FAST = 50; // px/s², balls that roll by
const FRICTION_SLOW = 260; // px/s², balls that stop near the logo
const RESTITUTION = 0.85;
const CUSHION = 0.8; // speed kept after bouncing off a screen edge
const CUSHION_CHANCE = 0.4; // a rolling ball, or each ball after the cue shot, may bounce off an edge once
const MAX_BALLS = 8; // a safety ceiling for the TV: every moving ball is redrawn each frame
const RALLY_CHANCE = 0.15; // now and then a rolling ball goes round the table: 3-4 bounces off the edges
const RALLY_SPEED = 1.5; // it is sent faster, each bounce keeps only CUSHION of the speed
const MAX_STEP = 8; // px per physics sub-step, prevents tunnelling at low frame rates

const COLORS = ['#F2C200', '#1F4FBF', '#D21034', '#5B2A86', '#F07A1A', '#11804A', '#7A1F1F', '#111111'];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const len = (x, y) => Math.hypot(x, y);
const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/** Mounts the animation into `root` (a 1920×1080 box). Returns { stop }. */
// Every time a ball hits the logo the background turns a random other colour (it starts white). The logo's lettering
// follows only when the colour needs it: black on light backgrounds, white on dark ones. The figure never changes.
// Hits push the logo: it floats off in the direction of the blow and slows down within a second; between hits it
// glides back home very slowly (no spring, no swinging back and forth).
const LOGO_PUSH = 0.12; // logo speed per ball speed into it
const LOGO_DAMP = 1.2; // 1/s, like floating on water
const LOGO_RETURN = 0.2; // 1/s: the way home shrinks ~18% a second, ~15-20 s to get back
const LOGO_MAX = [220, 120]; // never further than this from the centre, px
// Off-centre hits also spin it (torque = lever × push); the spin dies down, then it slowly turns back straight.
const LOGO_SPIN = 7.5e-7; // rad/s per (px × px/s)
const LOGO_SPIN_DAMP = 1.5;
const LOGO_SPIN_RETURN = 0.2; // 1/s, as LOGO_RETURN
const LOGO_MAX_ANGLE = 0.21; // ~12°

const HIT_COLOR_GAP_MS = 700; // one hit can touch the logo over several frames: one change per hit
const SPLASH_COLORS = [
  ['White', '#ffffff'], ['Ivory', '#fbf6ea'], ['Cream', '#f3e7c9'], ['Sand', '#e6d3a8'], ['Pale mint', '#dff3e8'],
  ['Sky', '#d9ecfb'], ['Lavender', '#e7e0f6'], ['Blush', '#f8dfe2'], ['Peach', '#fbd9bf'], ['Lemon', '#fbf0a6'],
  ['Honda Monkey orange', '#f47b20'], ['Coral', '#ff6f5e'], ['Cuba red', '#c8102e'], ['Brick', '#9c3b2b'], ['Burgundy', '#5e1224'],
  ['Pool felt green', '#0f6b3a'], ['Emerald', '#1a8f5a'], ['Lime', '#b5d33d'], ['Olive', '#5f6b2a'], ['Deep teal', '#0e4d4a'],
  ['Turquoise', '#1fb5ac'], ['Cuba blue', '#1d4fbf'], ['Navy', '#0f2147'], ['Royal purple', '#4b2a86'], ['Plum', '#6d2d5c'],
  ['Hot pink', '#e83e8c'], ['Mustard', '#d9a81e'], ['Tobacco', '#6b4a2b'], ['Graphite', '#2b2f36'], ['Night', '#0b0d14'],
];

/** Relative luminance (WCAG), 0..1. */
function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
/** Below ~0.35 the background counts as dark. */
const isDark = (hex) => luminance(hex) < 0.35;
/** Perceived lightness L*, 0..100: equal steps look equal to the eye. */
const lightness = (hex) => { const y = luminance(hex); return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y; };

// No harsh jumps (white straight to black): the next colour is picked at random only among those whose lightness is
// within MAX_STEP_L of the current one; the bigger the change, the longer the fade.
const MAX_STEP_L = 35;
const fadeMs = (dl) => 600 + Math.min(900, Math.abs(dl) * 26); // 0.6 s .. 1.5 s

// The logo for dark backgrounds: only the lettering turns white («CUBA», «LIBRE», «el sabor de havana», ®, the
// «The Original» arc); the figure keeps her black outlines and hair. Paths are told apart by where they are in the
// 4080×1720 drawing: lettering is left of x 1400, right of x 2500, or the arc above y 360 left of x 2050.
function isLettering(attrs) {
  const fill = /fill="#([0-9A-Fa-f]{6})"/.exec(attrs);
  if (!fill || parseInt(fill[1].slice(0, 2), 16) >= 0x30) return false; // not black
  const tr = /translate\(([-\d.]+),([-\d.]+)\)/.exec(attrs);
  const [tx, ty] = tr ? [Number(tr[1]), Number(tr[2])] : [0, 0];
  const nums = (/ d="([^"]*)"/.exec(attrs)?.[1].match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  let x0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    x0 = Math.min(x0, tx + nums[i]); x1 = Math.max(x1, tx + nums[i]); y1 = Math.max(y1, ty + nums[i + 1]);
  }
  return x1 < 1400 || x0 > 2500 || (y1 < 360 && x1 < 2050);
}

const logoUrls = new Map(); // colour -> object URL, made once each
let logoSvg = null;
async function logoWithLettering(color) {
  if (!color) return LOGO_SRC;
  if (!logoUrls.has(color)) {
    logoSvg ??= await (await fetch(LOGO_SRC)).text();
    const svg = logoSvg.replace(/<path [^>]*>/g, (tag) => (isLettering(tag) ? tag.replace(/fill="#[0-9A-Fa-f]{6}"/, `fill="${color}"`) : tag));
    logoUrls.set(color, URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })));
  }
  return logoUrls.get(color);
}

export function startSplash(root) {
  root.innerHTML = '';
  root.style.setProperty('--ball', `${2 * R}px`); // ball size for style.css
  // Performance on a TV: nothing big is ever repainted while the splash runs.
  // - Background: two full-screen colour layers; a new colour fades in by opacity (the compositor's work) instead of
  //   a background-color transition that repaints 1920×1080 every frame.
  // - Logo: a box that moves, turns and squashes (transform only), holding two pictures on their own layers, as drawn
  //   and with white lettering; switching is a change of opacity, so the 110-path SVG is drawn once per picture.
  const bgBack = document.createElement('div');
  const bgFront = document.createElement('div');
  bgBack.className = bgFront.className = 'splash-bg';
  bgFront.style.opacity = '0';
  const logoEl = document.createElement('div');
  logoEl.className = 'splash-logo';
  const logo = new Image(); // as drawn: also the source of the collision mask
  logo.src = LOGO_SRC;
  logo.alt = 'Cuba Libre';
  const logoLight = new Image(); // white lettering, for dark backgrounds
  logoLight.alt = '';
  logoLight.style.opacity = '0';
  logoWithLettering('#FFFFFF').then((url) => { logoLight.src = url; });
  logoEl.append(logo, logoLight);
  root.append(bgBack, bgFront, logoEl);

  let mask = null; // { data: Uint8Array, w, h, x0, y0 } in stage pixels / MASK_SCALE
  let logoBox = null; // { x, y, w, h } on the stage (moves with the drift)
  let logoHome = null; // where it stands at rest
  const drift = { x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, cos: 1, sin: 0 }; // offset from home, angle (rad), their speeds
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
    logoHome = { x: logoBox.x, y: logoBox.y };
    logoEl.style.width = `${LOGO_W}px`;
    logoEl.style.height = `${h}px`; // a real box: it turns and squashes around its centre
    logoEl.style.left = `${logoBox.x}px`;
    logoEl.style.top = `${logoBox.y}px`;
    try {
      mask ??= buildMask(logo, logoBox); // the recoloured logo has the same shape: build once
    } catch {
      mask = null; // without a mask the balls only roll by
    }
    if (!raf) { // a second load (the image swapped) must not start a second animation loop
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
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
    if (drift.a) { // the logo is turned around its centre: turn the point back into the drawing's own frame
      const cx = logoBox.x + logoBox.w / 2;
      const cy = logoBox.y + logoBox.h / 2;
      const c = drift.cos; // cos/sin of -angle, worked out once per frame in moveLogo()
      const s = drift.sin;
      const dx = x - cx;
      const dy = y - cy;
      x = cx + dx * c - dy * s;
      y = cy + dx * s + dy * c;
    }
    const mx = Math.floor((x - logoBox.x) * MASK_SCALE);
    const my = Math.floor((y - logoBox.y) * MASK_SCALE);
    if (mx < 0 || my < 0 || mx >= mask.w || my >= mask.h) return false;
    return mask.data[my * mask.w + mx] === 1;
  }

  const RING = Array.from({ length: 20 }, (_, i) => [Math.cos((i / 20) * Math.PI * 2), Math.sin((i / 20) * Math.PI * 2)]);

  /** Contact of a ball at (x, y) with the logo: outward normal, or null. */
  function logoContact(x, y, r = R) {
    if (!mask) return null;
    const m = r + 140; // a turned logo reaches beyond its box (12° on 1260 px: ~130 px)
    if (x + m < logoBox.x || x - m > logoBox.x + logoBox.w || y + m < logoBox.y || y - m > logoBox.y + logoBox.h) return null;
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

  // ---------- 3D look: every ball is a tiny canvas, shaded pixel by pixel ----------
  // Orientation: n = the number (or the cue's red dot), t = the number's «up» on the surface, q = the stripe's axis.
  // Rolling by d turns them around the axis perpendicular to the motion by d / R, like a real ball on a table
  // (screen x right, y down, z towards the viewer). Each pixel of the visible half gets its surface normal; what is
  // there (number circle with the digit, white cap or the stripe, plain colour) comes from the angle to n and q,
  // then diffuse light from the top left, a specular highlight and an anti-aliased edge. Marks slide over the edge
  // without any jumps. Redrawn only while the ball moves.
  const RES = 80; // canvas pixels across the ball, stretched to 118 px by CSS
  const DISC = Math.cos(0.42); // number circle, ~24° around n
  const DOT = Math.cos(0.17); // cue ball red dot
  const BAND = Math.sin(0.56); // stripe: |N·q| below this (~32° to each side of the equator) is coloured, above is white
  const DISC_R = Math.sin(0.42);
  const LIGHT = (() => { const l = [-0.45, -0.6, 0.66]; const k = Math.hypot(...l); return l.map((v) => v / k); })();
  const HALF = [(LIGHT[0]) / 2, (LIGHT[1]) / 2, (LIGHT[2] + 1) / 2]; // light + view, for the highlight
  const HALF_N = (() => { const k = Math.hypot(...HALF); return HALF.map((v) => v / k); })();

  const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const randomDir = () => unit([rand(-1, 1), rand(-1, 1), rand(-1, 1)]);
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

  function rotate(p, k, c, s) { // Rodrigues: p turned around unit axis k by an angle with cos c, sin s
    const kp = cross(k, p);
    const d = dot(k, p) * (1 - c);
    return [p[0] * c + kp[0] * s + k[0] * d, p[1] * c + kp[1] * s + k[1] * d, p[2] * c + kp[2] * s + k[2] * d];
  }

  function roll(b, dx, dy) {
    const d = Math.hypot(dx, dy);
    if (!d) return;
    const k = [-dy / d, dx / d, 0];
    const c = Math.cos(d / R);
    const s = Math.sin(d / R);
    b.n = unit(rotate(b.n, k, c, s));
    b.t = unit(rotate(b.t, k, c, s));
    b.q = unit(rotate(b.q, k, c, s));
    b.dirty = true;
  }

  // Per pixel: the surface normal of the front half (same for every ball), computed once.
  const NORMALS = (() => {
    const out = [];
    for (let py = 0; py < RES; py++) {
      for (let px = 0; px < RES; px++) {
        const x = ((px + 0.5) / RES) * 2 - 1;
        const y = ((py + 0.5) / RES) * 2 - 1;
        const r2 = x * x + y * y;
        if (r2 >= 1) continue;
        const z = Math.sqrt(1 - r2);
        const edge = Math.min(1, (1 - Math.sqrt(r2)) * RES * 0.5); // anti-aliased rim
        const diffuse = 0.6 + 0.45 * Math.max(0, x * LIGHT[0] + y * LIGHT[1] + z * LIGHT[2]); // soft: the dark side stays fairly light
        const spec = Math.pow(Math.max(0, x * HALF_N[0] + y * HALF_N[1] + z * HALF_N[2]), 60) * 0.5;
        out.push({ i: (py * RES + px) * 4, x, y, z, edge, diffuse, spec });
      }
    }
    return out;
  })();

  // The digit as a small black-on-white picture, sampled through the number circle's own coordinates.
  const digits = new Map();
  function digitTexture(num) {
    if (digits.has(num)) return digits.get(num);
    const S = 48;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, S, S);
    g.fillStyle = '#111';
    g.font = `800 ${num > 9 ? 25 : 30}px Inter, system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(num), S / 2, S / 2 + 2);
    const tex = { S, data: g.getImageData(0, 0, S, S).data };
    digits.set(num, tex);
    return tex;
  }

  // Hot loop: plain numbers only, no arrays per pixel (garbage collection pauses look like glitches on a TV).
  function drawBall(b) {
    if (!b.dirty) return;
    b.dirty = false;
    const out = b.img.data;
    const [nx, ny, nz] = b.n;
    const [tx, ty, tz] = b.t;
    const [qx, qy, qz] = b.q;
    const sx = ny * tz - nz * ty; // the number's «right» = n × t
    const sy = nz * tx - nx * tz;
    const sz = nx * ty - ny * tx;
    const [cr, cg, cb] = b.color;
    const tex = b.tex;
    const S = tex ? tex.S : 0;
    const td = tex ? tex.data : null;
    const cue = b.num === 0;
    const striped = b.num > 8;
    for (let j = 0; j < NORMALS.length; j++) {
      const p = NORMALS[j];
      const dn = p.x * nx + p.y * ny + p.z * nz;
      let r = cr;
      let g = cg;
      let bl = cb;
      if (cue) {
        if (dn > DOT) { r = 210; g = 16; bl = 52; }
      } else if (dn > DISC) {
        // inside the number circle: local coordinates on the surface -> the digit picture
        const u = (p.x * sx + p.y * sy + p.z * sz) / DISC_R;
        const v = (p.x * tx + p.y * ty + p.z * tz) / DISC_R;
        let ix = ((u * 0.5 + 0.5) * S) | 0;
        let iy = ((0.5 - v * 0.5) * S) | 0;
        ix = ix < 0 ? 0 : ix >= S ? S - 1 : ix;
        iy = iy < 0 ? 0 : iy >= S ? S - 1 : iy;
        const k = (iy * S + ix) * 4;
        r = td[k]; g = td[k + 1]; bl = td[k + 2];
      } else if (striped) {
        const dq = p.x * qx + p.y * qy + p.z * qz;
        if (dq > BAND || dq < -BAND) { r = 246; g = 246; bl = 240; } // white caps
      }
      const lit = p.diffuse;
      const sp = p.spec * 255;
      const o = p.i;
      out[o] = r * lit + sp;
      out[o + 1] = g * lit + sp;
      out[o + 2] = bl * lit + sp;
      out[o + 3] = p.edge * 255;
    }
    b.ctx.putImageData(b.img, 0, 0);
  }

  function makeBall(num, x, y, vx, vy, friction) {
    const el = document.createElement('canvas');
    el.className = 'ball';
    el.width = RES;
    el.height = RES;
    const shadow = document.createElement('div');
    shadow.className = 'ball-shadow';
    root.append(shadow, el);
    const ctx = el.getContext('2d');
    // The number sits on the stripe: q ⟂ n, and the digit reads along the stripe (t = q).
    const n = randomDir();
    const q = unit(cross(n, randomDir()));
    const t = num > 8 ? q : unit(cross(n, randomDir()));
    const b = {
      num, el, shadow, ctx, img: ctx.createImageData(RES, RES), color: num ? rgb(COLORS[(num - 1) % 8]) : [246, 246, 240],
      tex: num ? digitTexture(num) : null, n, t, q, dirty: true,
      x, y, vx, vy, friction, resting: false, restAt: 0, entered: false,
    };
    balls.push(b);
    place(b);
    return b;
  }

  function place(b) {
    b.el.style.transform = `translate(${b.x - R}px, ${b.y - R}px)`;
    // the shadow box is 1.4R × 1R larger than the ball's (see .ball-shadow), centred on the offset point, stretched along the light
    b.shadow.style.transform = `translate(${b.x - R * 1.4 + SHADOW_DX}px, ${b.y - R + SHADOW_DY}px) rotate(37deg)`;
    drawBall(b);
  }

  function removeBall(b) {
    b.el.remove();
    b.shadow.remove();
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
      const rally = Math.random() < RALLY_CHANCE;
      const v = Math.max(vMin, hit ? rand(650, 1000) : rand(420, 760)) * (rally ? RALLY_SPEED : 1);
      const b = makeBall(freeNumber(), sx, sy, dx * v, dy * v, FRICTION_FAST);
      b.cushions = rally ? 3 + (Math.random() < 0.5 ? 1 : 0) : Math.random() < CUSHION_CHANCE ? 1 : 0;
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
    const shot = findShot(target.x, target.y, 600);
    if (shot) {
      const v = rand(1300, 1700);
      makeBall(0, shot.sx, shot.sy, shot.vx * v, shot.vy * v, 0);
      return true;
    }
    // No clean shot this time (the search is random): wait a little and try again, up to 3 times.
    target.cueTries = (target.cueTries || 0) + 1;
    if (target.cueTries < 3) {
      target.restAt = performance.now();
      target.restDelay = 1500;
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
          b.cueSent = false; // a fresh wait: the cue will come for it
          b.cueTries = 0;
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
    roll(b, b.vx * dt, b.vy * dt);
    if (b.cushions) bounceOffEdge(b);

    const n = logoContact(b.x, b.y);
    if (n) {
      const vn = b.vx * n[0] + b.vy * n[1];
      if (vn < 0) {
        b.vx -= (1 + RESTITUTION) * vn * n[0];
        b.vy -= (1 + RESTITUTION) * vn * n[1];
        wobble(n[0], n[1], -vn);
        drift.vx -= n[0] * -vn * LOGO_PUSH; // n points out of the logo, the push goes the other way
        drift.vy -= n[1] * -vn * LOGO_PUSH;
        // spin: lever from the logo centre to the contact point × the push
        const rx = b.x - n[0] * R - (logoBox.x + logoBox.w / 2);
        const ry = b.y - n[1] * R - (logoBox.y + logoBox.h / 2);
        drift.va += (rx * (-n[1] * -vn) - ry * (-n[0] * -vn)) * LOGO_SPIN;
        onLogoHit();
      }
      // Push out of the logo.
      for (let k = 0; k < 20 && logoContact(b.x, b.y); k++) {
        b.x += n[0] * 2;
        b.y += n[1] * 2;
      }
    }
  }

  /**
   * Screen edges are open, except for the bounces a ball has left (b.cushions: usually 0 or 1, 3-4 for a rally): it
   * bounces off the edge it reaches only when it is fast enough to cross the screen again and the way is clear of the
   * logo; otherwise it rolls off and has no bounces left.
   */
  function bounceOffEdge(b) {
    const nx = b.x < R && b.vx < 0 ? 1 : b.x > W - R && b.vx > 0 ? -1 : 0;
    const ny = b.y < R && b.vy < 0 ? 1 : b.y > H - R && b.vy > 0 ? -1 : 0;
    if (!nx && !ny) return;
    const vx = nx ? -b.vx * CUSHION : b.vx;
    const vy = ny ? -b.vy * CUSHION : b.vy;
    const sp = len(vx, vy);
    const dx = vx / sp;
    const dy = vy / sp;
    const dist = exitDistance(b.x, b.y, dx, dy);
    if ((b.friction && sp * sp < 2 * b.friction * (dist + 150)) || pathHitsLogo(b.x, b.y, b.x + dx * dist, b.y + dy * dist, R)) {
      b.cushions = 0; // no clean bounce: it leaves
      return;
    }
    b.cushions--;
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
      for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) collide(balls[i], balls[j]);
    }

    for (const b of [...balls]) {
      if (onScreen(b.x, b.y, -R)) b.entered = true;
      const away = !onScreen(b.x, b.y, R + 40);
      const stuck = !b.resting && b.vx === 0 && b.vy === 0; // stopped off screen
      if (stuck || (away && (b.entered || !onScreen(b.x + b.vx, b.y + b.vy, R + 40)))) removeBall(b);
      else place(b);
    }

    schedule(now);
    moveLogo(dt);
    drawLogo(now);
    raf = requestAnimationFrame(frame);
  }

  function schedule(now) {
    // The cue comes for a resting ball once its wait is over, whatever else is rolling; one cue per wait.
    const resting = balls.find((b) => b.resting);
    if (resting && !resting.cueSent && now - resting.restAt > resting.restDelay && balls.length < MAX_BALLS) {
      const tries = resting.cueTries;
      spawnCue(resting);
      if (resting.cueTries === tries) resting.cueSent = true; // a cue is on its way (a retry only resets the wait)
    }
    if (now < nextSpawn || balls.length >= MAX_BALLS) return;
    // Only one slow ball at a time: on its way or waiting by the logo.
    const slowBusy = balls.some((b) => b.resting || b.friction === FRICTION_SLOW);
    const r = Math.random();
    let ok;
    if (!slowBusy && r < 0.25) ok = spawnSlow();
    else if (r < 0.65) ok = spawnRoll(true);
    else ok = spawnRoll(false);
    nextSpawn = now + (ok ? rand(800, 2500) : 400);
  }

  // Elastic squash of the logo: squeezed along the hit direction, stretched across, damped spring back.
  function moveLogo(dt) {
    if (!logoHome) return;
    // While a slow ball rolls in or waits by the logo for the cue, the logo holds still: its resting spot and the
    // cue's shot were worked out for this position (moving on, the logo would bump the ball away).
    if (balls.some((b) => b.resting || b.friction === FRICTION_SLOW)) {
      drift.vx = drift.vy = drift.va = 0;
      return;
    }
    const k = Math.exp(-LOGO_DAMP * dt);
    const back = Math.exp(-LOGO_RETURN * dt);
    drift.vx *= k;
    drift.vy *= k;
    drift.x = (drift.x + drift.vx * dt) * back;
    drift.y = (drift.y + drift.vy * dt) * back;
    drift.va *= Math.exp(-LOGO_SPIN_DAMP * dt);
    drift.a = (drift.a + drift.va * dt) * Math.exp(-LOGO_SPIN_RETURN * dt);
    if (Math.abs(drift.a) > LOGO_MAX_ANGLE) { drift.a = Math.sign(drift.a) * LOGO_MAX_ANGLE; drift.va = 0; }
    if (Math.abs(drift.a) < 0.0005 && Math.abs(drift.va) < 0.0005) drift.a = drift.va = 0;
    drift.cos = Math.cos(-drift.a);
    drift.sin = Math.sin(-drift.a);
    for (const [axis, v, max] of [['x', 'vx', LOGO_MAX[0]], ['y', 'vy', LOGO_MAX[1]]]) {
      if (Math.abs(drift[axis]) > max) { drift[axis] = Math.sign(drift[axis]) * max; drift[v] = 0; }
    }
    if (Math.abs(drift.vx) < 0.5 && Math.abs(drift.vy) < 0.5 && Math.abs(drift.x) < 0.5 && Math.abs(drift.y) < 0.5) {
      drift.x = drift.y = drift.vx = drift.vy = 0;
    }
    logoBox.x = logoHome.x + drift.x; // the collision mask is relative to logoBox: it moves along
    logoBox.y = logoHome.y + drift.y;
    // A resting ball the logo floats into gets nudged away instead of ending up inside the drawing.
    for (const b of balls) {
      if (!b.resting) continue;
      const n = logoContact(b.x, b.y);
      if (n) { b.resting = false; b.friction = FRICTION_FAST; b.vx = n[0] * 160; b.vy = n[1] * 160; }
    }
  }

  let logoStill = true;
  function drawLogo(now) {
    if (wobbles.length) wobbles = wobbles.filter((w) => now - w.t0 < 900);
    const still = !wobbles.length && !drift.x && !drift.y && !drift.a;
    if (still) {
      if (!logoStill) logoEl.style.transform = '';
      logoStill = true;
      return;
    }
    logoStill = false;
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
    logoEl.style.transform = `translate(${drift.x}px, ${drift.y}px) rotate(${drift.a}rad) matrix(${a}, ${b}, ${c}, ${d}, ${tx}, ${ty})`;
  }

  // ---------- colour changes on hits ----------
  let colorIndex = 0; // white
  let lastColorChange = 0;
  function onLogoHit() {
    const now = performance.now();
    if (now - lastColorChange < HIT_COLOR_GAP_MS) return;
    lastColorChange = now;
    const fromL = lightness(SPLASH_COLORS[colorIndex][1]);
    const near = SPLASH_COLORS.map((_, i) => i).filter((i) => i !== colorIndex && Math.abs(lightness(SPLASH_COLORS[i][1]) - fromL) <= MAX_STEP_L);
    const k = near[Math.floor(Math.random() * near.length)];
    if (k === undefined) return;
    colorIndex = k;
    const hex = SPLASH_COLORS[k][1];
    const ms = fadeMs(lightness(hex) - fromL);
    // fade the new colour in on the front layer, then make it the back one
    fade?.finish();
    bgFront.style.backgroundColor = hex;
    fade = bgFront.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: 'ease-in-out' });
    fade.onfinish = () => { bgBack.style.backgroundColor = hex; bgFront.style.opacity = '0'; fade = null; };
    bgFront.style.opacity = '1';
    const dark = isDark(hex); // the lettering cross-fades together with the background
    logo.style.transitionDuration = logoLight.style.transitionDuration = `${ms}ms`;
    logo.style.opacity = dark ? '0' : '1';
    logoLight.style.opacity = dark ? '1' : '0';
  }
  let fade = null;

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      root.innerHTML = '';
    },
  };
}
