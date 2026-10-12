// Podium after the final: a bright full-screen «poster» (docs/requirements.md, «После финала», variant C).
// Neon gradient, slow rays behind a big golden trophy, the champion's name in huge 3D gold letters,
// a caption with the date. The champion as big as ever; 2nd and 3rd place stand left and right of the trophy, a silver
// and a bronze small cup over their names (back on 2026-10-11, the champion's size unchanged). The entrance plays once per appearance; after it only
// calm motion is left: the rays turn, the glow breathes, a firework now and then.
// Light for the TV: transforms and opacity only, one small rays picture, a handful of firework sparks.

import { mascotHTML } from '/board/call.js';

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
      return `<div class="pz-m ${cls}" style="--k:${m.scale}"><span class="hop">${m.html}</span></div>`; // --k: a mascot drawn a little bigger or smaller
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
