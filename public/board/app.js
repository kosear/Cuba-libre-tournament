// TV scoreboard: no interaction. Slides rotate in a loop (see docs/requirements.md, «Дизайн табло»),
// data comes live over SSE, the page reloads itself after a deploy (shared/live.js).
import { live } from '/shared/live.js';
import { startSplash } from '/board/splash.js';

const stage = document.getElementById('stage');
const W = 1920;
const H = 1080;
const DURATION = { groups: 30000, group: 5000, now: 5000, next: 5000, playoff: 5000, podium: 60000, splash: 60000 };
const GROUPS_PER_SLIDE = 4;

let T = null; // tournament snapshot
let slides = [];
let index = 0;
let timer = null;
let shownKey = null;
let splash = null; // running splash animation

// ---------- scale the 1920×1080 stage to the screen ----------

function fitStage() {
  const k = Math.min(window.innerWidth / W, window.innerHeight / H);
  stage.style.transform = `translate(${(window.innerWidth - W * k) / 2}px, ${(window.innerHeight - H * k) / 2}px) scale(${k})`;
}
window.addEventListener('resize', fitStage);
fitStage();

// ---------- helpers ----------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FLAG = '<svg class="flag" viewBox="0 0 100 100"><polygon points="0,0 100,50 0,100" fill="#D21034"/><polygon points="30.0,35.0 33.5,45.1 44.3,45.4 35.7,51.9 38.8,62.1 30.0,56.0 21.2,62.1 24.3,51.9 15.7,45.4 26.5,45.1" fill="#fff"/></svg>';
const header = (title) => `<header class="top">${FLAG}<img class="bar-logo" src="/assets/cuba-libre-logo.svg" alt="Cuba Libre"><div class="brand-sub">Pool<br>Tournament</div><div class="slide-title">${esc(title)}</div></header>`;
const label = (m) => (m ? m.label : '');
const name = (p) => (p ? esc(p.name) : 'TBD');

/** Shrink the font of every .fit element until its content fits its box. */
function fitText(root) {
  root.querySelectorAll('.fit').forEach((el) => {
    let size = parseFloat(getComputedStyle(el).fontSize);
    let guard = 40;
    while (guard-- > 0 && size > 12 && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) {
      size -= 1.5;
      el.style.fontSize = `${size}px`;
    }
  });
}

// ---------- slides ----------

function buildSlides(t) {
  if (!t.started) return [{ kind: 'splash', key: 'splash' }];
  if (t.phase === 'finished') return [{ kind: 'podium', key: 'podium' }];
  const out = [];
  if (t.phase === 'groups') {
    const pages = Math.ceil(t.groups.length / GROUPS_PER_SLIDE);
    for (let p = 0; p < pages; p++) out.push({ kind: 'groups', key: `groups:${p}`, page: p, pages });
    for (const g of t.groups) out.push({ kind: 'group', key: `group:${g.id}`, id: g.id });
  }
  if (t.current) out.push({ kind: 'now', key: 'now' });
  if (t.next) out.push({ kind: 'next', key: 'next' });
  out.push({ kind: 'playoff', key: 'playoff' });
  return out;
}

function groupTable(g) {
  const rows = g.rows.map((r) => `<tr class="${r.leader ? 'leader' : ''} ${r.out ? 'out' : ''}">
    <td class="name">${esc(r.name)}${r.leader ? ' 🏆' : ''}</td><td>${r.frames}</td><td>${r.wins}</td><td>${r.approx ? '≈' : ''}${r.balls}</td></tr>`).join('');
  return `<table class="std"><thead><tr><th class="name">Player</th><th>Frames</th><th>Win</th><th>Balls</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function shortNames(rows) {
  const first = rows.map((r) => r.name.split(' ')[0]);
  return rows.map((r, i) => (first.filter((f) => f === first[i]).length > 1 ? r.name : first[i]));
}

function crossTable(g) {
  const short = shortNames(g.rows);
  const head = `<tr><th></th>${short.map((s) => `<th>${esc(s)}</th>`).join('')}</tr>`;
  const body = g.rows.map((r, i) => `<tr><th class="rowh">${esc(short[i])}</th>${g.rows.map((c) => {
    if (c.id === r.id) return '<td class="diag"></td>';
    const x = g.cross[r.id]?.[c.id];
    if (!x) return '<td></td>';
    return x.win ? `<td class="win">${x.approx ? '≈' : ''}${x.balls}</td>` : '<td class="loss">0</td>';
  }).join('')}</tr>`).join('');
  return `<table class="cross">${head}${body}</table>`;
}

function slideGroups(s) {
  const groups = T.groups.slice(s.page * GROUPS_PER_SLIDE, (s.page + 1) * GROUPS_PER_SLIDE);
  const title = s.pages > 1 ? `Group stage ${s.page + 1}/${s.pages}` : 'Group stage';
  const cards = groups.map((g) => `<div class="card"><h3>${esc(g.name)}</h3><div class="fit">${groupTable(g)}</div></div>`).join('');
  return { title, html: `<div class="groups n${groups.length}">${cards}</div>` };
}

function slideGroup(s) {
  const g = T.groups.find((x) => x.id === s.id);
  if (!g) return null;
  const approx = g.rows.some((r) => r.approx);
  return {
    title: g.name,
    html: `<div class="group-one">
      <div class="card"><h3>Standings</h3><div class="fit">${groupTable(g)}</div></div>
      <div class="card"><h3>Results</h3><div class="fit" style="font-size:40px">${crossTable(g)}</div>
        <div class="legend"><span><b class="g">3</b> win, balls</span><span><b class="k">0</b> loss</span><span>empty — not played</span>${approx ? '<span>≈ average (withdrawn player)</span>' : ''}</div></div>
    </div>`,
  };
}

function stats(st) {
  if (!st) return '';
  return `<div class="stats">Frames: <b>${st.frames}</b><br>Win: <b>${st.wins}</b><br>Balls: <b>${st.approx ? '≈' : ''}+${st.balls}</b></div>`;
}

function slideNow() {
  const m = T.current;
  if (!m) return null;
  return {
    title: label(m),
    html: `<div class="duel"><div class="sub">Now playing</div>
      <div class="side"><div class="pname">${name(m.p1)}</div>${stats(m.p1Stats)}</div><div class="vs">VS</div>
      <div class="side"><div class="pname">${name(m.p2)}</div>${stats(m.p2Stats)}</div></div>`,
  };
}

function slideNext() {
  const m = T.next;
  if (!m) return null;
  return {
    title: label(m),
    html: `<div class="duel next"><div class="sub">Next match</div>
      <div class="side"><div class="pname">${name(m.p1)}</div></div><div class="vs">VS</div><div class="side"><div class="pname">${name(m.p2)}</div></div></div>`,
  };
}

function slidePlayoff() {
  const po = T.playoff;
  const fallback = { sf1: ['Seed 1', 'Seed 4'], sf2: ['Seed 2', 'Seed 3'], third: ['Loser SF1', 'Loser SF2'], final: ['Winner SF1', 'Winner SF2'] };
  const box = (slot, title, style, extra = '') => {
    const m = po?.[slot];
    const live = T.current?.id === slot ? ' live' : '';
    const side = (n) => {
      const p = m?.[`p${n}`];
      if (!p) return `<div class="p tbd"><span>${esc(fallback[slot][n - 1])}</span></div>`;
      const cls = m.winner ? (m.winner === n ? 'win' : 'lose') : '';
      return `<div class="p ${cls}"><span>${esc(p.name)}</span>${m.winner === n ? '✓' : ''}</div>`;
    };
    return `<div class="bm ${extra}${live}" style="${style}"><div class="t"><span>${esc(title)}</span></div>${side(1)}${side(2)}</div>`;
  };
  return {
    title: 'Play-off',
    html: `<div class="bracket">
      <div class="col-t" style="left:0">Semi-finals</div><div class="col-t" style="left:760px">Final</div>
      <svg class="lines" viewBox="0 0 1324 888" preserveAspectRatio="none">
        <path d="M520 205 H640 V385 H760" fill="none" stroke="#9db8e3" stroke-width="4"/>
        <path d="M520 565 H640 V385" fill="none" stroke="#9db8e3" stroke-width="4"/>
        <path d="M640 475 V700 H760" fill="none" stroke="#c9d3e3" stroke-width="3" stroke-dasharray="10 8"/>
      </svg>
      ${box('sf1', 'Semi-final 1', 'left:0;top:105px;width:520px')}
      ${box('sf2', 'Semi-final 2', 'left:0;top:465px;width:520px')}
      ${box('final', 'Final', 'left:760px;top:285px;width:564px', 'final')}
      ${box('third', '3rd place · played before the final', 'left:760px;top:610px;width:564px', 'third')}
    </div>`,
  };
}

function slidePodium() {
  const [p1, p2, p3] = T.podium || [];
  const col = (cls, p, place, medal) => `<div class="col ${cls}"><div class="medal">${medal}</div><div class="nm">${p ? esc(p.name) : ''}</div><div class="block">${place}</div></div>`;
  return { title: 'Champions', html: `<div class="podium">${col('p2', p2, 2, '🥈')}${col('p1', p1, 1, '🥇')}${col('p3', p3, 3, '🥉')}</div>` };
}

function queuePanel() {
  const q = T.queue;
  if (!q.length) return '<aside class="queue"><div class="qhead">Queue</div><div class="qempty">No matches in the queue</div></aside>';
  const big = (m, title, cls) => (m
    ? `<div class="qbig ${cls}"><div class="qlabel">${title} · ${esc(label(m))}</div><div class="qp">${name(m.p1)}</div><div class="qvs">vs</div><div class="qp">${name(m.p2)}</div></div>`
    : '');
  const rest = q.slice(2);
  const rows = rest.map((m, i) => `<div class="qrow"><span class="qn">${i + 3}</span><span class="qm">${name(m.p1)}<i>vs</i>${name(m.p2)}</span><span class="qg">${esc(shortLabel(m))}</span></div>`).join('');
  return `<aside class="queue"><div class="qhead">Queue</div>${big(q[0], 'Now playing', 'now')}${big(q[1], 'Next', 'next')}
    <div class="qrest"><div class="qrest-inner">${rows}</div>${rest.length ? '<div class="qfade"></div>' : ''}</div></aside>`;
}

function shortLabel(m) {
  if (m.stage === 'group') return m.label.replace(/^group\s+/i, '');
  if (m.stage === 'tiebreak') return 'TB';
  return { sf1: 'SF1', sf2: 'SF2', third: '3rd', final: 'Final' }[m.round] ?? '';
}

/** Loop-scroll the rest of the queue when it does not fit. */
function startQueueScroll() {
  const box = stage.querySelector('.qrest');
  const inner = stage.querySelector('.qrest-inner');
  if (!box || !inner || inner.scrollHeight <= box.clientHeight) return;
  const rowsHtml = inner.innerHTML;
  inner.innerHTML = rowsHtml + rowsHtml; // seamless loop: scroll half the doubled list
  const count = inner.children.length / 2;
  inner.style.setProperty('--dur', `${Math.max(count * 3, 12)}s`);
  inner.classList.add('scroll');
}

// ---------- render ----------

function renderSlide() {
  if (!T) return;
  const s = slides[index];
  if (!s) return;
  if (s.kind === 'splash') {
    // Keep the animation running across state updates before the start.
    if (!splash) {
      stage.className = 'full';
      stage.innerHTML = '<div class="splash"></div>';
      splash = startSplash(stage.querySelector('.splash'));
    }
    shownKey = s.key;
    return;
  }
  if (splash) {
    splash.stop();
    splash = null;
  }
  const make = { groups: slideGroups, group: slideGroup, now: slideNow, next: slideNext, playoff: slidePlayoff, podium: slidePodium }[s.kind];
  const view = make(s);
  if (!view) return;
  const withQueue = s.kind !== 'podium';
  stage.className = withQueue ? '' : 'full';
  stage.innerHTML = `<main>${header(view.title)}<div class="content">${view.html}</div></main>${withQueue ? queuePanel() : ''}`;
  fitText(stage);
  if (withQueue) startQueueScroll();
  shownKey = s.key;
}

function schedule() {
  clearTimeout(timer);
  const s = slides[index];
  timer = setTimeout(() => {
    index = (index + 1) % slides.length;
    renderSlide();
    schedule();
  }, DURATION[s?.kind] ?? 5000);
}

function onState(state) {
  T = state.tournament;
  const keepKey = slides[index]?.key ?? shownKey;
  slides = buildSlides(T);
  const keep = slides.findIndex((s) => s.key === keepKey);
  const changedSlide = keep < 0;
  index = keep >= 0 ? keep : 0;
  renderSlide();
  if (changedSlide || !timer) schedule();
}

// Errors are never shown on the TV: it keeps the last picture and reconnects by itself.
live({ onState });

// Debug hook for checking slides from the browser console.
window.__board = {
  get slides() { return slides; },
  nextSlide() { index = (index + 1) % slides.length; renderSlide(); schedule(); },
};
