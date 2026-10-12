// Podium after the final: a bright full-screen «poster» (docs/requirements.md, «После финала», variant C).
// Neon gradient, slow rays behind a big golden trophy, the champion's name in huge 3D gold letters,
// a caption with the date. The champion as big as ever; 2nd and 3rd place stand left and right of the trophy, a silver
// and a bronze small cup over their names (back on 2026-10-11, the champion's size unchanged). The entrance plays once per appearance; after it only
// calm motion is left: the rays turn, the glow breathes, a firework now and then.
// Light for the TV: transforms and opacity only, one small rays picture, a handful of firework sparks.

import { mascotHTML, emojify, burstHTML } from '/board/call.js';

const W = 1920;
const ENTRANCE = { trophy: 500, flash: 1150, champion: 1250, label: 1500, mascot: 1600, second: 1750, third: 1950, caption: 2200 };
const FIREWORK_EVERY = [18000, 32000]; // ms between idle fireworks
const COLORS = ['#ffd84a', '#ff9500', '#ffffff', '#8fc1ff', '#ff6b4a'];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rand = (a, b) => a + Math.random() * (b - a);
// TEMPORARY: reports to the server what happens to the props (a bug seen on the TV only): POST /api/client-log
const report = (what, data = {}) => {
  try {
    const body = JSON.stringify({ t: Date.now(), what, ua: report.ua ? undefined : (report.ua = navigator.userAgent), vv: [innerWidth, innerHeight, visualViewport?.width | 0, visualViewport?.scale], ...data });
    if (!navigator.sendBeacon?.('/api/client-log', new Blob([body], { type: 'application/json' }))) fetch('/api/client-log', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true });
  } catch (e) { /* never in the way */ }
};
window.addEventListener('error', (e) => report('error', { msg: String(e.message), src: `${e.filename}:${e.lineno}` }));
window.addEventListener('unhandledrejection', (e) => report('rejection', { msg: String(e.reason && e.reason.message || e.reason) }));

// The evening of the tournament in Bali: a final played after midnight still belongs to the evening before.
const DATE = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Makassar', day: 'numeric', month: 'short', year: 'numeric' });
const eveningDate = () => DATE.format(new Date(Date.now() - 6 * 3600e3)).toUpperCase();

function raysSvg() {
  // 18 wedges around the centre of a 1700 px square.
  const n = 18;
  const c = 850;
  const r = 1200;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a1 = (i / n) * Math.PI * 2;
    const a2 = a1 + (Math.PI * 2) / n / 2.2;
    d += `M${c} ${c}L${(c + r * Math.cos(a1)).toFixed(1)} ${(c + r * Math.sin(a1)).toFixed(1)}L${(c + r * Math.cos(a2)).toFixed(1)} ${(c + r * Math.sin(a2)).toFixed(1)}Z`;
  }
  // The wedges fade out towards the square's edge (radial gradient), so its borders never show.
  return `<svg viewBox="0 0 1700 1700" aria-hidden="true"><defs><radialGradient id="pzRayFade" gradientUnits="userSpaceOnUse" cx="850" cy="850" r="850">
    <stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".6" stop-color="#fff" stop-opacity=".14"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><path d="${d}" fill="url(#pzRayFade)"/></svg>`;
}

const TROPHY = `<svg class="pz-cup" viewBox="0 0 320 340" aria-hidden="true">
  <defs>
    <linearGradient id="pzGold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff6c2"/><stop offset=".35" stop-color="#ffd84a"/>
      <stop offset=".7" stop-color="#e3a400"/><stop offset="1" stop-color="#9a6500"/>
    </linearGradient>
    <linearGradient id="pzGoldDark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e3a400"/><stop offset="1" stop-color="#7a4f00"/>
    </linearGradient>
  </defs>
  <path d="M70 60 C10 60 10 150 85 165" fill="none" stroke="url(#pzGold)" stroke-width="22" stroke-linecap="round"/>
  <path d="M250 60 C310 60 310 150 235 165" fill="none" stroke="url(#pzGold)" stroke-width="22" stroke-linecap="round"/>
  <path d="M60 30 H260 V95 C260 170 215 210 160 214 C105 210 60 170 60 95 Z" fill="url(#pzGold)"/>
  <rect x="140" y="212" width="40" height="44" fill="url(#pzGoldDark)"/>
  <path d="M105 256 H215 L230 290 H90 Z" fill="url(#pzGold)"/>
  <rect x="75" y="290" width="170" height="38" rx="6" fill="url(#pzGoldDark)"/>
  <path d="M88 48 C92 120 110 160 140 186" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="10" stroke-linecap="round"/>
  <text x="160" y="140" text-anchor="middle" font-size="96" font-weight="900" fill="#9a6500" fill-opacity=".55" font-family="Inter, system-ui, sans-serif">1</text>
</svg>`;

/** A small cup like the champion's, in silver or bronze, with the place number. kind: 'silver' | 'bronze'. */
function smallCup(kind, n) {
  const [hi, mid, lo, dark] = kind === 'silver' ? ['#ffffff', '#dfe4ec', '#a3adbb', '#6b7685'] : ['#ffe2c2', '#e0975a', '#a35f2a', '#6e3a14'];
  return `<svg class="pz-medal" viewBox="0 0 320 340" aria-hidden="true">
    <defs>
      <linearGradient id="pzC${n}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".4" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></linearGradient>
      <linearGradient id="pzD${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lo}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
    </defs>
    <path d="M70 60 C10 60 10 150 85 165" fill="none" stroke="url(#pzC${n})" stroke-width="22" stroke-linecap="round"/>
    <path d="M250 60 C310 60 310 150 235 165" fill="none" stroke="url(#pzC${n})" stroke-width="22" stroke-linecap="round"/>
    <path d="M60 30 H260 V95 C260 170 215 210 160 214 C105 210 60 170 60 95 Z" fill="url(#pzC${n})"/>
    <rect x="140" y="212" width="40" height="44" fill="url(#pzD${n})"/>
    <path d="M105 256 H215 L230 290 H90 Z" fill="url(#pzC${n})"/>
    <rect x="75" y="290" width="170" height="38" rx="6" fill="url(#pzD${n})"/>
    <path d="M88 48 C92 120 110 160 140 186" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="10" stroke-linecap="round"/>
    <text x="160" y="140" text-anchor="middle" font-size="96" font-weight="900" fill="${dark}" fill-opacity=".6" font-family="Inter, system-ui, sans-serif">${n}</text>
  </svg>`;
}

export function createPoster(root) {
  let shown = null; // id of the champion on screen
  let fireTimer = null;
  let anims = [];

  function build([p1, p2, p3], players = []) {
    // each player's mascot of the tournament (the same as on the call screen) by their cup
    const masc = (p, cls) => {
      if (!p) return '';
      const m = mascotHTML(p, players);
      return `<div class="pz-m ${cls}" style="--k:${m.scale}" data-facing="${m.facing}"><span class="mv"><span class="face"><span class="dn"><span class="hop">${m.html}</span></span></span></span></div>`; // --k: a mascot drawn a little bigger or smaller
    };
    const side = (p, n, kind, label) => (p ? `<div class="pz-side pz-p${n} ${kind}">${smallCup(kind, n)}<div class="pz-slabel">${label}</div>
      <div class="pz-sname"><span>${esc(p.name)}</span></div></div>` : '');
    root.innerHTML = `<div class="pz-bg"></div>
      <div class="pz-rays">${raysSvg()}</div>
      <div class="pz-glow"></div>
      <div class="pz-sparks"></div>
      <div class="pz-trophy">${TROPHY}</div>${masc(p1, 'm1')}${masc(p2, 'm2')}${masc(p3, 'm3')}
      <div class="pz-label">Champion</div>
      <div class="pz-name"><span>${esc(p1?.name ?? '')}</span></div>
      ${side(p2, 2, 'silver', '2nd place')}${side(p3, 3, 'bronze', '3rd place')}
      <div class="pz-caption">Cuba Libre · Pool Tournament · ${eveningDate()}</div>
      <div class="pz-flash"></div>`;
    fitName();
    // 2nd and 3rd: one line each, 115 px down to 40, within their side of the trophy
    root.querySelectorAll('.pz-sname span').forEach((node) => {
      let size = 115;
      node.style.fontSize = `${size}px`;
      while (size > 40 && node.offsetWidth > 660) node.style.fontSize = `${(size -= 2)}px`;
    });
  }

  /** The champion's name on one line, as big as fits: 240 px down to 90. */
  function fitName() {
    const node = root.querySelector('.pz-name span');
    let size = 240;
    node.style.fontSize = `${size}px`;
    while (size > 90 && node.offsetWidth > W - 160) node.style.fontSize = `${(size -= 3)}px`;
  }

  const q = (sel) => root.querySelector(sel);
  const run = (sel, frames, opts) => {
    const node = typeof sel === 'string' ? q(sel) : sel;
    if (!node) return;
    anims.push(node.animate(frames, { fill: 'backwards', easing: 'cubic-bezier(.2,.8,.2,1)', ...opts }));
  };

  function entrance() {
    run('.pz-bg', [{ opacity: 0 }, { opacity: 1 }], { duration: 500 });
    run('.pz-rays', [{ opacity: 0 }, { opacity: 1 }], { duration: 1200, delay: 200 });
    run('.pz-trophy', [
      { transform: 'translateY(-700px) scale(.6)', opacity: 0 },
      { transform: 'translateY(30px) scale(1.08)', opacity: 1, offset: 0.7 },
      { transform: 'translateY(-10px) scale(.98)', offset: 0.85 },
      { transform: 'none', opacity: 1 },
    ], { duration: 900, delay: ENTRANCE.trophy, easing: 'ease-in' });
    run('.pz-flash', [{ opacity: 0 }, { opacity: 0.75 }, { opacity: 0 }], { duration: 600, delay: ENTRANCE.flash, fill: 'none' });
    run('.pz-name', [{ transform: 'scale(2.6)', opacity: 0 }, { transform: 'scale(.94)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }],
      { duration: 520, delay: ENTRANCE.champion, easing: 'cubic-bezier(.3,0,.3,1)' });
    run(root, [
      { transform: 'none' }, { transform: 'translate(-14px, 8px)' }, { transform: 'translate(12px, -6px)' },
      { transform: 'translate(-6px, 4px)' }, { transform: 'none' },
    ], { duration: 360, delay: ENTRANCE.champion + 330, easing: 'linear', fill: 'none' });
    run('.pz-label', [{ transform: 'translateY(20px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500, delay: ENTRANCE.label });
    for (const [sel, at] of [['.pz-m.m1', ENTRANCE.mascot], ['.pz-m.m2', ENTRANCE.second + 150], ['.pz-m.m3', ENTRANCE.third + 150]]) {
      run(sel, [{ transform: 'scale(0) rotate(-30deg)', opacity: 0 }, { transform: 'scale(1.15) rotate(6deg)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 500, delay: at });
    }
    for (const [sel, at] of [['.pz-p2', ENTRANCE.second], ['.pz-p3', ENTRANCE.third]]) {
      run(sel, [{ transform: 'translateY(60px) scale(.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 600, delay: at });
    }
    run('.pz-caption', [{ opacity: 0 }, { opacity: 1 }], { duration: 800, delay: ENTRANCE.caption });
    setTimeout(() => {
      if (!shown) return;
      firework(420, 330);
      setTimeout(() => shown && firework(1500, 300), 250);
      setTimeout(() => shown && firework(300, 860), 520);
      setTimeout(() => shown && firework(1620, 880), 780);
    }, ENTRANCE.champion + 200);
  }

  /** One burst of sparks from (x, y): out, then they droop and fade. */
  /**
   * The mascots wander about their cups at random: each stands a while (sometimes bounces on the spot or looks round), or
   * hops to a random place within --d px, crossing the cup or not; standing about it dances on the spot, now and then
   * tosses its prop up and catches it. A couple of times a minute one hops over to another and gives it a beating:
   * first its prop goes, tossed aside behind it or hurled at the other (a hit, the other reels, the prop bounces off
   * and lies by it); punches with comic «POW» bursts, the other's prop flies out of its hands, it spins off and sits
   * dazed under circling stars; the bully hops back home picking its prop up on the way, the victim gets up and goes
   * for its own. Meanwhile the third one stands and watches them. A hop that would pass through another mascot leaps
   * right over its head. Only transforms (cheap for the TV).
   */
  function mascots(key) {
    const alive = () => shown === key;
    const later = (fn, ms) => setTimeout(() => alive() && fn(), ms);
    const list = [...root.querySelectorAll('.pz-m')].map((el) => ({
      el, mv: el.querySelector('.mv'), face: el.querySelector('.face'), dn: el.querySelector('.dn'), hop: el.querySelector('.hop'), item: el.querySelector('.item'),
      d: parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 300, x: 0, y: 0, busy: false, prop: null, trip: null,
      dir: +el.dataset.facing || 1, // as drawn: an animal side-on looks left, the rest count as looking right
      size: parseFloat(getComputedStyle(el).fontSize) || 110,
    }));
    const place = (m) => { m.mv.style.transform = `translate(${m.x}px, ${m.y}px)`; };
    // look the `to` way (1 right, -1 left): turned round when the picture looks the other way
    const turn = (m, to) => { m.dir = to; m.face.style.transform = to * (+m.el.dataset.facing || 1) < 0 ? 'scaleX(-1)' : ''; };
    /** Where a mascot stands on the stage: its box (left, top, right) and the floor under its feet. */
    const box = (m) => {
      const left = m.el.offsetLeft + m.x;
      const top = m.el.offsetTop + m.y;
      return { left, top, right: left + m.size * 1.25, mid: left + m.size * 0.62, floor: top + m.size * 1.02 };
    };
    // standing about, it dances on the spot, each in its own way, on a wrapper of its own (.dn), so a bounce, a punch or
    // a toss (on .hop) plays over the dance instead of cutting it off. Every cycle starts and ends standing straight:
    // before a hop the dance is let run to the end of its cycle (settle), no jump cut
    const DANCES = [
      [[{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)', offset: 0.25 }, { transform: 'rotate(0)', offset: 0.5 }, { transform: 'rotate(6deg)', offset: 0.75 }, { transform: 'rotate(0)' }], 1500], // sways
      [[{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-12px) scale(.97, 1.04)', offset: 0.4 }, { transform: 'translateY(0) scale(1.05, .95)', offset: 0.8 },
        { transform: 'translateY(0) scale(1)' }], 560], // bounces to the beat
      [[{ transform: 'translateX(0) rotate(0)' }, { transform: 'translateX(-5px) rotate(-4deg)', offset: 0.25 }, { transform: 'translateX(0) rotate(0)', offset: 0.5 },
        { transform: 'translateX(5px) rotate(4deg)', offset: 0.75 }, { transform: 'translateX(0) rotate(0)' }], 800], // wiggles its hips
      [[{ transform: 'scale(1)' }, { transform: 'scale(1.06, .92)', offset: 0.5 }, { transform: 'scale(1)' }], 520], // springs
      [[{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-8px) rotate(-7deg)', offset: 0.25 }, { transform: 'translateY(0) rotate(0)', offset: 0.5 },
        { transform: 'translateY(-8px) rotate(7deg)', offset: 0.75 }, { transform: 'translateY(0) rotate(0)' }], 1300], // grooves side to side
    ];
    function dance(m, style = Math.floor(Math.random() * DANCES.length)) {
      m.dance?.cancel();
      const [frames, ms] = DANCES[style];
      m.dance = m.dn.animate(frames, { duration: ms * rand(0.9, 1.15), iterations: Infinity, easing: 'ease-in-out' });
    }
    /** Lets the dance run to the end of its cycle (standing straight), then fn(); at once when it is not dancing. */
    function settle(m, fn) {
      const a = m.dance;
      if (!a || a.playState !== 'running') { m.dance = null; fn(); return; }
      const dur = a.effect.getComputedTiming().duration;
      const n = Math.ceil((a.currentTime + 1) / dur);
      a.effect.updateTiming({ iterations: n });
      m.dance = null;
      later(fn, Math.max(0, n * dur - a.currentTime) + 20);
    }
    /** A bounce on the spot: a crouch, up, a squash on landing. */
    const jump = (m, h, ms) => m.hop.animate([
      { transform: 'scale(1)', easing: 'ease-out' }, { transform: 'scale(1.12, .86)', offset: 0.14, easing: 'ease-out' },
      { transform: `translateY(${-h}px) scale(.94, 1.08)`, offset: 0.5, easing: 'ease-in' },
      { transform: 'translateY(0) scale(1.14, .84)', offset: 0.84, easing: 'ease-out' }, { transform: 'scale(1)' }], { duration: ms });
    /**
     * Hop from where it is to (tx, ty) in its own coordinates, then done(): a few long hops, each a proper arc (a crouch,
     * up slowing, down speeding, a squash on landing). A hop over another mascot goes high enough to clear its head.
     */
    /** The stretch of the stage (x from, to) a hop from fx to nx sweeps, the body's width and some room included. */
    const sweep = (m, fx, nx) => [Math.min(fx, nx) + m.el.offsetLeft - 40, Math.max(fx, nx) + m.el.offsetLeft + m.size * 1.25 + 40];
    /** Another one in the air across this stretch: never two crossing in the air (the ones far apart hop at once). */
    const blocked = (m, l, r) => list.some((o) => o !== m && o.hopping && o.hopping[0] < r && o.hopping[1] > l);
    /** Stops a mascot's trip where it is (a newer trip takes over; its `done` never comes). */
    const halt = (m) => { m.trip = null; m.hopping = null; m.el.style.zIndex = ''; };
    function hopTo(m, tx, ty, done, stepPx = 170) {
      const trip = (m.trip = {}); // one trip at a time: a new one takes over, the old one's steps stop
      m.hopping = null;
      if (Math.abs(tx - m.x) > 1) turn(m, tx > m.x ? 1 : -1);
      const step = () => {
        if (m.trip !== trip) return; // taken over
        const [fx, fy] = [m.x, m.y];
        const dist = Math.hypot(tx - fx, ty - fy);
        if (dist < 1) { [m.x, m.y] = [tx, ty]; place(m); halt(m); done(); return; } // there, exactly
        // a hop of about stepPx, the last one shared out evenly; never landing on another one: then on past it
        let f = Math.min(1, stepPx / dist);
        if (f < 1) f = 1 / Math.ceil(dist / stepPx);
        while (f < 1 && crowded(m, fx + (tx - fx) * f, fy + (ty - fy) * f)) f = Math.min(1, f + 20 / dist);
        const [nx, ny] = [fx + (tx - fx) * f, fy + (ty - fy) * f];
        const [l, r] = sweep(m, fx, nx);
        if (blocked(m, l, r)) { m.hopping = null; later(step, rand(150, 450)); return; } // waits on the spot for the other to land (a random while: two waiting never go together)
        m.hopping = [l, r];
        // the others under this hop, where they stand right now: clear the highest head with room to spare
        const oy = m.el.offsetTop;
        let h = rand(45, 65);
        let over = false;
        for (const o of list) {
          if (o === m) continue;
          const b = box(o);
          if (b.right < l || b.left > r) continue;
          over = true;
          h = Math.max(h, Math.min(fy, ny) + oy + m.size - b.top + 40); // its feet at the top of the arc above that head
        }
        const ms = 480 + h;
        m.el.style.zIndex = over ? 5 : ''; // drawn over the one it leaps
        m.mv.animate([{ transform: `translate(${fx}px, ${fy}px)` }, { transform: `translate(${fx}px, ${fy}px)`, offset: 0.14 },
          { transform: `translate(${nx}px, ${ny}px)`, offset: 0.84 }, { transform: `translate(${nx}px, ${ny}px)` }], { duration: ms });
        [m.x, m.y] = [nx, ny];
        place(m);
        jump(m, h, ms);
        later(step, ms + 40);
      };
      settle(m, step); // the dance runs out first
    }
    /** Would a mascot standing at (x, y) (its own coordinates) be on top of another one? */
    const crowded = (m, x, y = 0) => list.some((o) => {
      if (o === m) return false;
      const b = box(o);
      const left = m.el.offsetLeft + x;
      const top = m.el.offsetTop + y;
      return left < b.right + 10 && left + m.size * 1.25 > b.left - 10 && top < b.floor && top + m.size > b.top;
    });

    // ---------- the props ----------
    const SAFE = 150; // px from the stage's edge a prop never lies closer than: TVs crop the edges of the picture (overscan)
    const k = () => root.getBoundingClientRect().width / root.offsetWidth; // the stage is scaled to the screen
    /** The prop out of the mascot's hands as a copy on the stage, where it was: { el, x, y } (its middle). */
    function detach(m) {
      const it = m.item;
      if (!it || m.prop || !it.firstElementChild) return null;
      const R = root.getBoundingClientRect();
      const r = it.getBoundingClientRect();
      const s = k();
      const [w, h] = [it.offsetWidth, it.offsetHeight];
      const [x, y] = [(r.left + r.width / 2 - R.left) / s, (r.top + r.height / 2 - R.top) / s];
      const mat = new DOMMatrix(getComputedStyle(it).transform);
      const flip = m.face.style.transform.includes('scaleX(-1)');
      const deg = (Math.atan2(mat.b, mat.a) * 180) / Math.PI; // its own tilt; the copy is mirrored like the mascot
      const el = document.createElement('div');
      el.className = 'pz-prop';
      Object.assign(el.style, { left: `${x - w / 2}px`, top: `${y - h / 2}px`, width: `${w}px`, height: `${h}px`, fontSize: getComputedStyle(it).fontSize });
      Object.assign(it.style, { width: `${w}px`, height: `${h}px` }); // the empty hand keeps its place
      el.append(it.firstElementChild); // the picture itself goes along
      root.append(el);
      report('detach', { m: m.el.className, x: Math.round(x), y: Math.round(y), w, h, s: +s.toFixed(3), R: [Math.round(R.left), Math.round(R.top), Math.round(R.width)], ow: root.offsetWidth, deg: Math.round(deg), flip, tf: getComputedStyle(it).transform });
      const flipS = flip ? ' scaleX(-1)' : '';
      return { el, x0: x, y0: y, x, y, h, deg, flipS, tf: (dx, dy, a) => `translate(${dx}px, ${dy}px)${flipS} rotate(${a}deg)` };
    }
    /** The picture back in the hand, as a fresh node (the TV's WebView would not draw it again otherwise), the copy gone. */
    function restore(m, p) {
      const pic = p.el.firstElementChild;
      p.el.remove();
      if (pic) m.item.append(pic.cloneNode(true));
      Object.assign(m.item.style, { width: '', height: '' });
      if (m.prop === p) m.prop = null;
    }
    /** Put down at its feet, on its side, and left there. */
    function putDown(m, toss = 0) {
      const p = detach(m);
      if (!p) return;
      const floor = box(m).floor - p.h * 0.4;
      const dx = toss ? (Math.max(SAFE, Math.min(root.offsetWidth - SAFE, p.x0 + toss * 1.1)) - p.x0) / 1.1 : 0; // never near the edge
      const lie = p.deg + (toss ? Math.sign(toss) * rand(70, 120) : (Math.random() < 0.5 ? -1 : 1) * rand(60, 90));
      p.el.animate(toss
        ? [{ transform: p.tf(0, 0, p.deg), easing: 'ease-out' }, { transform: p.tf(dx * 0.45, -90, (p.deg + lie) / 2), offset: 0.4, easing: 'ease-in' },
          { transform: p.tf(dx, floor - p.y0, lie), offset: 0.8, easing: 'ease-out' }, { transform: p.tf(dx * 1.08, floor - p.y0 - 10, lie), offset: 0.9 },
          { transform: p.tf(dx * 1.1, floor - p.y0, lie) }]
        : [{ transform: p.tf(0, 0, p.deg), easing: 'ease-in' }, { transform: p.tf(0, floor - p.y0, lie), offset: 0.75, easing: 'ease-out' },
          { transform: p.tf(0, floor - p.y0 - 10, lie), offset: 0.88 }, { transform: p.tf(0, floor - p.y0, lie) }],
      { duration: toss ? 620 : 420, fill: 'forwards' });
      Object.assign(p, { x: p.x0 + (toss ? dx * 1.1 : 0), y: floor, lie });
      m.prop = p;
      report('putDown', { m: m.el.className, toss: Math.round(toss), x: Math.round(p.x), y: Math.round(p.y), anims: p.el.getAnimations ? p.el.getAnimations().length : -1 });
    }
    /** Hurled at v: flies spinning, hits it (a burst, it reels), bounces off away from it and lies on the floor there. */
    function throwAt(m, v, done) {
      turn(m, box(v).mid > box(m).mid ? 1 : -1);
      later(() => {
        const p = detach(m);
        if (!p) { done(); return; }
        const b = box(v);
        const dir = Math.sign(b.mid - p.x0) || 1;
        const [tx, ty] = [b.mid - p.x0, b.top + v.size * 0.45 - p.y0];
        const spin = p.deg + dir * rand(540, 720);
        const lie = spin + dir * rand(60, 120);
        const fx = Math.max(SAFE, Math.min(root.offsetWidth - SAFE, b.mid + dir * rand(120, 220))) - p.x0; // on past it, off its side
        const fy = Math.min(root.offsetHeight - 140, b.floor + rand(10, 50)) - p.h * 0.4 - p.y0;
        const FLY = 1150;
        const HIT = 0.32;
        p.el.animate([{ transform: p.tf(0, 0, p.deg), easing: 'ease-out' },
          { transform: p.tf(tx / 2, Math.min(0, ty) / 2 - 110, (p.deg + spin) / 2), offset: HIT / 2, easing: 'ease-in' },
          { transform: p.tf(tx, ty, spin), offset: HIT, easing: 'ease-out' },
          { transform: p.tf(tx + (fx - tx) * 0.45, ty - 120, (spin + lie) / 2), offset: 0.55, easing: 'ease-in' },
          { transform: p.tf(fx, fy, lie), offset: 0.78, easing: 'ease-out' },
          { transform: p.tf(fx + (fx - tx) * 0.06, fy - 28, lie - dir * 20), offset: 0.88, easing: 'ease-in' },
          { transform: p.tf(fx + (fx - tx) * 0.12, fy, lie - dir * 35) }], { duration: FLY, fill: 'forwards' });
        later(() => { // the burst a touch before the prop's middle gets there: it has to grow, and the edge hits first
          burst(b.mid, b.top + v.size * 0.4);
          turn(v, -dir); // turns round at once to who threw it
          v.hop.animate([{ transform: 'none' }, { transform: `translateX(${dir * 22}px) rotate(${dir * 12}deg)`, offset: 0.3 }, { transform: 'none' }], { duration: 420, easing: 'ease-out' });
        }, FLY * HIT - 110);
        Object.assign(p, { x: p.x0 + fx + (fx - tx) * 0.12, y: p.y0 + fy, lie: lie - dir * 35 });
        m.prop = p;
        report('throw', { m: m.el.className, at: v.el.className, x: Math.round(p.x), y: Math.round(p.y) });
        later(done, FLY);
      }, 250);
    }
    /** Goes over to its prop, picks it up, then done(). */
    function fetch(m, done) {
      const p = m.prop;
      let side = p.x > box(m).mid ? -1 : 1; // stops on the side it comes from, or the other if someone stands there
      const ty = Math.max(-80, Math.min(140, p.y + p.h * 0.4 - m.el.offsetTop - m.size * 1.02));
      const at = (sd, far = 0) => p.x - m.el.offsetLeft - m.size * 0.62 + sd * (m.size * 0.45 + far);
      if (crowded(m, at(side), ty)) side = -side;
      let far = 0;
      while (far < 300 && crowded(m, at(side, far), ty)) far += 20;
      const tx = at(side, far);
      hopTo(m, tx, ty, () => {
        turn(m, -side);
        later(() => {
          const R = root.getBoundingClientRect();
          const r = m.item.getBoundingClientRect();
          const s = k();
          const [hx, hy] = [(r.left + r.width / 2 - R.left) / s - p.x0, (r.top + r.height / 2 - R.top) / s - p.y0];
          p.el.animate([{ transform: p.tf(p.x - p.x0, p.y - p.y0, p.lie) }, { transform: p.tf((p.x - p.x0 + hx) / 2, Math.min(p.y - p.y0, hy) - 50, p.deg), offset: 0.5 },
            { transform: p.tf(hx, hy, p.deg) }], { duration: 360, easing: 'ease-out', fill: 'forwards' });
          later(() => { report('pickup', { m: m.el.className, rect: (() => { const r = p.el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)]; })() }); restore(m, p); done(); }, 370);
        }, 200);
      });
    }

    function next(m) {
      if (m.busy) return; // in a fight: the fight goes on with it
      const home = () => later(() => { if (!m.busy) hopTo(m, Math.max(0, Math.min(m.d, m.x)), 0, () => { later(() => dance(m), rand(200, 600)); later(() => next(m), rand(400, 1400)); }); }, rand(300, 800));
      if (Math.abs(m.y) > 0.5 || m.x < -1 || m.x > m.d + 1) { home(); return; } // off its patch (after a fetch): back first
      if (m.watch) { // a fight is on: it stands and watches, turning after them, now and then a bounce of excitement
        turn(m, box(m.watch).mid > box(m).mid ? 1 : -1);
        if (Math.random() < 0.25) jump(m, 30, 420);
        later(() => next(m), rand(500, 900));
        return;
      }
      const r = Math.random();
      if (m.prop && r < 0.5) { m.busy = true; fetch(m, () => { m.busy = false; home(); }); return; } // goes for its prop
      if (r < 0.3) { // stands there dancing; now and then another dance, or one at all
        if (!m.dance) dance(m);
        else if (Math.random() < 0.3) settle(m, () => dance(m));
        later(() => next(m), rand(900, 2600));
        return;
      }
      if (r < 0.42) { turn(m, -m.dir); later(() => next(m), rand(600, 1400)); return; } // look the other way
      if (r >= 0.55 && r < 0.68 && m.item && !m.prop) { // tosses its prop up and catches it, like a snowball, a few times
        const n = 2 + Math.floor(Math.random() * 3);
        const h = rand(100, 160) * (m.size / 104);
        const ms = 760;
        const one = (i) => {
          if (m.busy || m.prop || i === n) { later(() => next(m), rand(300, 900)); return; }
          const p = detach(m); // the picture leaves the hand as a copy on the stage (never animated in the hand: the TV)
          if (!p) { later(() => next(m), rand(300, 900)); return; }
          report('toss', { m: m.el.className, h: Math.round(h) });
          // a real throw: up slowing down, down speeding up (a parabola, sampled), turning over once at a steady rate
          const turn = Math.random() < 0.5 ? -360 : 360;
          const frames = [];
          for (let k = 0; k <= 12; k++) {
            const t = k / 12;
            frames.push({ transform: p.tf(0, -h * (1 - (2 * t - 1) ** 2), p.deg + turn * t), easing: 'linear' });
          }
          p.el.animate(frames, { duration: ms, fill: 'forwards' });
          m.hop.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04, .95)', offset: 0.1 }, { transform: 'scale(1)', offset: 0.3 },
            { transform: 'scale(1)', offset: 0.9 }, { transform: 'scale(1.04, .95)', offset: 0.97 }, { transform: 'scale(1)' }], { duration: ms }); // the throw, the catch
          later(() => { restore(m, p); later(() => one(i + 1), 60); }, ms);
        };
        one(0);
        return;
      }
      if (r < 0.55) { // a couple of bounces on the spot
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) later(() => jump(m, 35, 460), i * 480);
        later(() => next(m), n * 480 + rand(200, 900));
        return;
      }
      // hop to a new place, at least a quarter of the way off, never on top of another one
      let to = null;
      for (let i = 0; i < 12 && to === null; i++) {
        const x = rand(0, m.d);
        if (Math.abs(x - m.x) >= m.d / 4 && !crowded(m, x)) to = x;
      }
      if (to === null) { later(() => next(m), rand(600, 1500)); return; } // nowhere free: stays
      hopTo(m, to, 0, () => { later(() => dance(m), rand(200, 600)); later(() => next(m), rand(400, 1400)); });
    }
    /** A comic burst at (x, y) on the stage: POW!, BAM!… on a white spiky cloud. */
    function burst(x, y) {
      const b = document.createElement('div');
      b.className = 'pz-pow';
      b.innerHTML = burstHTML(['POW!', 'BAM!', 'WHAM!', 'BOOM!'][Math.floor(Math.random() * 4)]);
      b.style.left = `${Math.max(150, Math.min(root.offsetWidth - 150, x + rand(-40, 40)))}px`; // whole on the stage, somewhere else each time
      b.style.top = `${Math.max(60, y + rand(-30, 30))}px`;
      b.style.setProperty('--tilt', `${rand(-14, 8).toFixed(0)}deg`);
      const k = rand(0.85, 1.1);
      const tilt = rand(-10, 10);
      root.append(b);
      b.animate([{ transform: 'translate(-50%, -50%) scale(.2) rotate(-20deg)', opacity: 1 }, { transform: `translate(-50%, -50%) scale(${k * 1.2}) rotate(${tilt + 8}deg)`, opacity: 1, offset: 0.12 },
        { transform: `translate(-50%, -50%) scale(${k * 1.05}) rotate(${tilt + 2}deg)`, opacity: 1, offset: 0.7 }, { transform: `translate(-50%, -50%) scale(${k}) rotate(${tilt}deg)`, opacity: 0 }], { duration: 950, easing: 'ease-out', fill: 'forwards' });
      setTimeout(() => b.remove(), 1000);
    }
    function fight() {
      const free = list.filter((m) => !m.busy);
      if (free.length < 2) { later(fight, 5000); return; }
      const a = free[Math.floor(Math.random() * free.length)];
      const others = free.filter((m) => m !== a);
      const v = others[Math.floor(Math.random() * others.length)];
      a.busy = v.busy = true;
      halt(a); // whatever they were up to
      halt(v);
      for (const w of list) if (w !== a && w !== v) w.watch = v; // the others watch
      const [hx, hy] = [a.x, a.y];
      const side0 = box(v).mid > box(a).mid ? -1 : 1;
      settle(a, () => {
        // its prop first: half the time hurled at the other (it lies by the victim, picked up on the way back),
        // otherwise tossed aside behind it (picked up when back home)
        if (a.item && !a.prop && Math.random() < 0.5) throwAt(a, v, () => later(go, 300));
        else { putDown(a, side0 * (a.size * 0.9 + rand(20, 80))); later(go, a.prop ? 700 : 0); }
      });
      function go() {
        // where the victim stands, in the bully's own coordinates (both boxes are placed on the stage)
        const vx = v.el.offsetLeft + v.x - a.el.offsetLeft;
        const vy = v.el.offsetTop + v.y - a.el.offsetTop + (v.size - a.size);
        const side = vx > a.x ? -1 : 1; // stop on the side it comes from
        hopTo(a, vx + side * v.size * 0.9, vy, () => {
          turn(a, -side);
          turn(v, side); // the victim looks at the bully
          const punches = 3 + Math.floor(Math.random() * 3);
          for (let i = 0; i < punches; i++) {
            later(() => {
              if (i === 0) { v.dance?.cancel(); v.dance = null; }
              a.hop.animate([{ transform: 'none' }, { transform: `translateX(${-side * a.size * 0.25}px) rotate(${-side * 8}deg)`, offset: 0.4 }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
              v.hop.animate([{ transform: 'none' }, { transform: `translateX(${-side * 14}px) rotate(${-side * 6}deg)`, offset: 0.5 }, { transform: 'none' }], { duration: 260, delay: 90 });
              burst((box(a).mid + box(v).mid) / 2, Math.min(box(a).top, box(v).top) + 10); // between the two, above their heads
            }, i * 330);
          }
          later(() => {
            putDown(v, -side * (v.size * 0.9 + rand(40, 100))); // knocked out of its hands
            // knocked away: a spin and a slide, then dazed under circling stars
            const [fx, fy] = [v.x, v.y];
            v.x = Math.max(-60, Math.min(v.d + 60, v.x - side * 90));
            v.mv.animate([{ transform: `translate(${fx}px, ${fy}px)` }, { transform: `translate(${v.x}px, ${v.y}px)` }], { duration: 500, easing: 'ease-out' });
            place(v);
            v.hop.animate([{ transform: 'rotate(0)' }, { transform: `translateY(-50px) rotate(${-side * 360}deg)` }, { transform: `rotate(${-side * 720}deg)` }], { duration: 600, easing: 'ease-out' });
            const stars = document.createElement('span');
            stars.className = 'pz-daze';
            stars.innerHTML = emojify('💫');
            v.face.append(stars);
            stars.animate([{ transform: 'translateX(-50%) rotate(0)' }, { transform: 'translateX(-50%) rotate(360deg)' }], { duration: 700, iterations: 4 });
            later(() => stars.remove(), 2800);
            // the bully hops back home (picking its prop up on the way), the victim gets up a bit later and goes for its own
            const back = () => hopTo(a, hx, hy, () => {
              a.busy = false;
              for (const w of list) w.watch = null; // the show is over
              dance(a);
              later(() => next(a), rand(400, 1200));
            });
            later(() => (a.prop ? fetch(a, back) : back()), 500);
            later(() => {
              hopTo(v, Math.max(0, Math.min(v.d, v.x)), 0, () => {
                const up = () => { v.busy = false; dance(v); later(() => next(v), rand(400, 1200)); };
                if (v.prop) later(() => fetch(v, up), rand(300, 900)); else up();
              });
            }, 3000);
            later(fight, rand(22000, 38000)); // the next beating: a couple a minute
          }, punches * 330 + 150);
        });
      }
    }
    report('mascots', { n: list.length, items: list.map((m) => !!m.item), sizes: list.map((m) => m.size) });
    // TEMPORARY: every 10 s, where everyone's prop is (in hand, lying at x,y and how big it shows, or hidden with no copy)
    const pulse = () => {
      if (!alive()) return;
      report('pulse', { ms: list.map((m) => {
        if (!m.item) return '-';
        const hidden = !m.item.firstElementChild;
        const p = m.prop;
        const r = p && p.el.isConnected ? p.el.getBoundingClientRect() : null;
        return `${m.busy ? 'B' : ''}${m.watch ? 'W' : ''}${hidden ? 'H' : 'h'}${p ? `@${Math.round(p.x)},${Math.round(p.y)}` : ''}${r ? `[${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)}x${Math.round(r.height)}]` : ''}:${Math.round(m.x)},${Math.round(m.y)}`;
      }), props: root.querySelectorAll('.pz-prop').length });
      later(pulse, 10000);
    };
    later(pulse, 5000);
    for (const m of list) {
      m.x = rand(0, m.d);
      for (let i = 0; i < 12 && crowded(m, m.x); i++) m.x = rand(0, m.d); // not on top of another one
      place(m);
      later(() => dance(m), rand(2000, 3000)); // after the entrance
      later(() => next(m), rand(2600, 4200)); // after the entrance
    }
    if (list.length > 1) later(fight, rand(9000, 16000));
  }

  function firework(x, y) {
    const box = q('.pz-sparks');
    if (!box) return;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const n = 40;
    const burst = document.createElement('div');
    burst.className = 'pz-burst';
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      s.style.background = Math.random() < 0.25 ? '#fff' : color;
      burst.append(s);
      const a = (i / n) * Math.PI * 2 + rand(-0.1, 0.1);
      const r = rand(190, 320);
      const dx = Math.cos(a) * r;
      const dy = Math.sin(a) * r;
      s.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(.9)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx * 1.08}px, ${dy * 1.08 + 70}px) scale(.4)`, opacity: 0 },
      ], { duration: 2100, easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'forwards' });
    }
    // a bright core flashing at the start of the burst
    const core = document.createElement('b');
    burst.append(core);
    core.animate([{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1.6)', opacity: 0 }], { duration: 500, easing: 'ease-out', fill: 'forwards' });
    box.append(burst);
    setTimeout(() => burst.remove(), 2200);
  }

  function idleFireworks() {
    clearTimeout(fireTimer);
    fireTimer = setTimeout(() => {
      if (!shown) return;
      const left = Math.random() < 0.5;
      firework(left ? rand(260, 640) : rand(1280, 1660), rand(140, 340));
      idleFireworks();
    }, rand(...FIREWORK_EVERY));
  }

  return {
    /** podium = [1st, 2nd, 3rd] from the snapshot; players: all, in join order (for the mascots). The entrance plays only when the poster appears. */
    show(podium, players = []) {
      const [p1] = podium || [];
      const key = (podium || []).map((p) => p?.id ?? '').join('|');
      if (key === shown) return;
      const first = shown === null;
      root.hidden = false; // visible before building: the names are measured to fit
      build(podium || [], players);
      shown = key;
      if (first) entrance(); // a corrected final only redraws the name
      mascots(key);
      idleFireworks();
    },
    hide() {
      if (shown === null) return;
      shown = null;
      clearTimeout(fireTimer);
      anims.forEach((a) => a.cancel());
      anims = [];
      root.hidden = true;
      root.innerHTML = '';
    },
  };
}
