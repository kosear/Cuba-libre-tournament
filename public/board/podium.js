// Podium after the final: a bright full-screen «poster» (docs/requirements.md, «После финала», variant C).
// Neon gradient, slow rays behind a big golden trophy, the champion's name in huge 3D gold letters,
// a caption with the date. The champion as big as ever; 2nd and 3rd place stand left and right of the trophy, a silver
// and a bronze small cup over their names (back on 2026-10-11, the champion's size unchanged). The entrance plays once per appearance; after it only
// calm motion is left: the rays turn, the glow breathes, a firework now and then.
// Light for the TV: transforms and opacity only, one small rays picture, a handful of firework sparks.

import { mascotHTML, emojify } from '/board/call.js';

const W = 1920;
const ENTRANCE = { trophy: 500, flash: 1150, champion: 1250, label: 1500, mascot: 1600, second: 1750, third: 1950, caption: 2200 };
const FIREWORK_EVERY = [18000, 32000]; // ms between idle fireworks
const COLORS = ['#ffd84a', '#ff9500', '#ffffff', '#8fc1ff', '#ff6b4a'];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rand = (a, b) => a + Math.random() * (b - a);

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
      return `<div class="pz-m ${cls}" style="--k:${m.scale}" data-facing="${m.facing}"><span class="mv"><span class="face"><span class="hop">${m.html}</span></span></span></div>`; // --k: a mascot drawn a little bigger or smaller
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
   * hops to a random place within --d px, crossing the cup or not. Their props live a life of their own: now and then one
   * puts its prop down and wanders off without it, or hurls it at another (a hit, the other reels, the prop bounces off
   * and lies there); later it goes and picks it up. A couple of times a minute one hops over to another and gives it a
   * beating (its prop tossed aside first): punches with comic «POW» bursts, the other's prop flies out of its hands, it
   * spins off and sits dazed under circling stars, the bully hops back home. A hop that would pass through another
   * mascot leaps right over its head. Only transforms (cheap for the TV).
   */
  function mascots(key) {
    const alive = () => shown === key;
    const later = (fn, ms) => setTimeout(() => alive() && fn(), ms);
    const list = [...root.querySelectorAll('.pz-m')].map((el) => ({
      el, mv: el.querySelector('.mv'), face: el.querySelector('.face'), hop: el.querySelector('.hop'), item: el.querySelector('.item'),
      d: parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 300, x: 0, y: 0, busy: false, prop: null,
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
    /** A bounce on the spot: a crouch, up, a squash on landing. */
    const jump = (m, h, ms) => m.hop.animate([
      { transform: 'scale(1)', easing: 'ease-out' }, { transform: 'scale(1.12, .86)', offset: 0.14, easing: 'ease-out' },
      { transform: `translateY(${-h}px) scale(.94, 1.08)`, offset: 0.5, easing: 'ease-in' },
      { transform: 'translateY(0) scale(1.14, .84)', offset: 0.84, easing: 'ease-out' }, { transform: 'scale(1)' }], { duration: ms });
    /**
     * Hop from where it is to (tx, ty) in its own coordinates, then done(): a few long hops, each a proper arc (a crouch,
     * up slowing, down speeding, a squash on landing). A hop over another mascot goes high enough to clear its head.
     */
    function hopTo(m, tx, ty, done, stepPx = 150) {
      if (Math.abs(tx - m.x) > 1) turn(m, tx > m.x ? 1 : -1);
      const n = Math.max(1, Math.round(Math.hypot(tx - m.x, ty - m.y) / stepPx));
      const [sx, sy] = [(tx - m.x) / n, (ty - m.y) / n];
      let t = 0;
      for (let i = 0; i < n; i++) {
        const [fx, fy] = [m.x + sx * i, m.y + sy * i];
        const [nx, ny] = [fx + sx, fy + sy];
        // the others under this hop: clear the highest head with some room to spare
        const ox = m.el.offsetLeft;
        const oy = m.el.offsetTop;
        const [l, r] = [Math.min(fx, nx) + ox, Math.max(fx, nx) + ox + m.size * 1.25];
        let h = rand(45, 65);
        for (const o of list) {
          if (o === m) continue;
          const b = box(o);
          if (b.right < l || b.left > r) continue;
          const feet = Math.min(fy, ny) + oy + m.size; // its feet at the lowest point of the hop's ends
          h = Math.max(h, feet - b.top + 30);
        }
        const ms = 520 + h * 1.1;
        const high = h > 90;
        later(() => {
          if (high) m.el.style.zIndex = 5; // over the one it leaps
          m.mv.animate([{ transform: `translate(${fx}px, ${fy}px)` }, { transform: `translate(${fx}px, ${fy}px)`, offset: 0.14 },
            { transform: `translate(${nx}px, ${ny}px)`, offset: 0.84 }, { transform: `translate(${nx}px, ${ny}px)` }], { duration: ms });
          [m.x, m.y] = [nx, ny];
          place(m);
          jump(m, h, ms);
          if (high) later(() => { m.el.style.zIndex = ''; }, ms);
        }, t);
        t += ms + 40;
      }
      later(done, t);
    }

    // ---------- the props ----------
    const k = () => root.getBoundingClientRect().width / root.offsetWidth; // the stage is scaled to the screen
    /** The prop out of the mascot's hands as a copy on the stage, where it was: { el, x, y } (its middle). */
    function detach(m) {
      const it = m.item;
      if (!it || m.prop || it.style.visibility === 'hidden') return null;
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
      el.innerHTML = it.innerHTML;
      Object.assign(el.style, { left: `${x - w / 2}px`, top: `${y - h / 2}px`, width: `${w}px`, height: `${h}px`, fontSize: getComputedStyle(it).fontSize });
      root.append(el);
      it.style.visibility = 'hidden';
      const flipS = flip ? ' scaleX(-1)' : '';
      return { el, x0: x, y0: y, x, y, h, deg, flipS, tf: (dx, dy, a) => `translate(${dx}px, ${dy}px)${flipS} rotate(${a}deg)` };
    }
    /** Put down at its feet, on its side, and left there. */
    function putDown(m, toss = 0) {
      const p = detach(m);
      if (!p) return;
      const floor = box(m).floor - p.h * 0.4;
      const dx = toss;
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
        const fx = Math.max(60, Math.min(root.offsetWidth - 60, b.mid + dir * rand(120, 220))) - p.x0; // on past it, off its side
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
        later(() => {
          burst(b.mid, b.top + v.size * 0.4);
          if (!v.busy) turn(v, -dir); // looks at who threw it
          v.hop.animate([{ transform: 'none' }, { transform: `translateX(${dir * 22}px) rotate(${dir * 12}deg)`, offset: 0.3 }, { transform: 'none' }], { duration: 420, easing: 'ease-out' });
        }, FLY * HIT);
        Object.assign(p, { x: p.x0 + fx + (fx - tx) * 0.12, y: p.y0 + fy, lie: lie - dir * 35 });
        m.prop = p;
        later(done, FLY);
      }, 250);
    }
    /** Goes over to its prop, picks it up, then done(). */
    function fetch(m, done) {
      const p = m.prop;
      const side = p.x > box(m).mid ? -1 : 1; // stops on the side it comes from
      const tx = p.x - m.el.offsetLeft - m.size * 0.62 + side * m.size * 0.45;
      const ty = Math.max(-80, Math.min(140, p.y + p.h * 0.4 - m.el.offsetTop - m.size * 1.02));
      hopTo(m, tx, ty, () => {
        turn(m, -side);
        later(() => {
          const R = root.getBoundingClientRect();
          const r = m.item.getBoundingClientRect();
          const s = k();
          const [hx, hy] = [(r.left + r.width / 2 - R.left) / s - p.x0, (r.top + r.height / 2 - R.top) / s - p.y0];
          p.el.animate([{ transform: p.tf(p.x - p.x0, p.y - p.y0, p.lie) }, { transform: p.tf((p.x - p.x0 + hx) / 2, Math.min(p.y - p.y0, hy) - 50, p.deg), offset: 0.5 },
            { transform: p.tf(hx, hy, p.deg) }], { duration: 360, easing: 'ease-out', fill: 'forwards' });
          later(() => { p.el.remove(); m.item.style.visibility = ''; m.prop = null; done(); }, 370);
        }, 200);
      });
    }

    function next(m) {
      if (m.busy) return; // in a fight: the fight goes on with it
      const home = () => later(() => hopTo(m, Math.max(0, Math.min(m.d, m.x)), 0, () => later(() => next(m), rand(300, 1200))), rand(300, 800));
      if (m.y !== 0 || m.x < -1 || m.x > m.d + 1) { home(); return; } // off its patch (after a fetch): back first
      const r = Math.random();
      if (m.prop && r < 0.3) { m.busy = true; fetch(m, () => { m.busy = false; home(); }); return; } // goes for its prop
      if (!m.prop && m.item && r > 0.94) { putDown(m); later(() => next(m), rand(600, 1400)); return; } // puts it down, wanders off without it
      const targets = list.filter((o) => o !== m && !o.busy);
      if (!m.prop && m.item && r > 0.89 && targets.length) { // hurls it at another
        m.busy = true;
        throwAt(m, targets[Math.floor(Math.random() * targets.length)], () => { m.busy = false; later(() => next(m), rand(600, 1500)); });
        return;
      }
      if (r < 0.3) { later(() => next(m), rand(900, 2600)); return; } // just stand there
      if (r < 0.42) { turn(m, -m.dir); later(() => next(m), rand(600, 1400)); return; } // look the other way
      if (r < 0.55) { // a couple of bounces on the spot
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) later(() => jump(m, 35, 460), i * 480);
        later(() => next(m), n * 480 + rand(200, 900));
        return;
      }
      let to = rand(0, m.d); // hop to a new place, at least a quarter of the way off
      if (Math.abs(to - m.x) < m.d / 4) to = m.x < m.d / 2 ? Math.min(m.d, m.x + m.d / 2) : Math.max(0, m.x - m.d / 2);
      hopTo(m, to, 0, () => later(() => next(m), rand(150, 1200)));
    }
    /** A comic burst at (x, y) on the stage: POW!, BAM! or 💥. */
    function burst(x, y) {
      const b = document.createElement('div');
      b.className = 'pz-pow';
      b.innerHTML = emojify(['POW!', 'BAM!', 'WHAM!', '💥'][Math.floor(Math.random() * 4)]);
      b.style.left = `${x}px`;
      b.style.top = `${y}px`;
      root.append(b);
      b.animate([{ transform: 'translate(-50%, -50%) scale(.2) rotate(-20deg)', opacity: 1 }, { transform: 'translate(-50%, -50%) scale(1.15) rotate(8deg)', opacity: 1, offset: 0.4 },
        { transform: 'translate(-50%, -50%) scale(1) rotate(0)', opacity: 0 }], { duration: 650, easing: 'ease-out' });
      setTimeout(() => b.remove(), 700);
    }
    function fight() {
      const free = list.filter((m) => !m.busy);
      if (free.length < 2) { later(fight, 5000); return; }
      const a = free[Math.floor(Math.random() * free.length)];
      const others = free.filter((m) => m !== a);
      const v = others[Math.floor(Math.random() * others.length)];
      a.busy = v.busy = true;
      const [hx, hy] = [a.x, a.y];
      const side0 = box(v).mid > box(a).mid ? -1 : 1;
      putDown(a, side0 * rand(90, 150)); // its prop tossed aside, behind it, before it goes
      later(() => {
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
              a.hop.animate([{ transform: 'none' }, { transform: `translateX(${-side * a.size * 0.25}px) rotate(${-side * 8}deg)`, offset: 0.4 }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
              v.hop.animate([{ transform: 'none' }, { transform: `translateX(${-side * 14}px) rotate(${-side * 6}deg)`, offset: 0.5 }, { transform: 'none' }], { duration: 260, delay: 90 });
              burst(v.el.offsetLeft + v.x + v.size * 0.5, v.el.offsetTop + v.y + v.size * 0.3);
            }, i * 330);
          }
          later(() => {
            putDown(v, -side * rand(120, 200)); // knocked out of its hands
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
            // the bully hops back home (picking its prop up on the way), the victim gets up a bit later
            const back = () => hopTo(a, hx, hy, () => { a.busy = false; later(() => next(a), rand(400, 1200)); });
            later(() => (a.prop ? fetch(a, back) : back()), 500);
            later(() => {
              hopTo(v, Math.max(0, Math.min(v.d, v.x)), 0, () => { v.busy = false; later(() => next(v), rand(400, 1200)); });
            }, 3000);
            later(fight, rand(22000, 38000)); // the next beating: a couple a minute
          }, punches * 330 + 150);
        });
      }, a.prop ? 700 : 0);
    }
    for (const m of list) {
      m.x = rand(0, m.d);
      place(m);
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
