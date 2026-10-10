// TV scoreboard: no interaction. Slides rotate in a loop (see docs/requirements.md, «Дизайн табло»),
// data comes live over SSE, the page reloads itself after a deploy (shared/live.js).
import { live } from '/shared/live.js';
import { startSplash } from '/board/splash.js';
import { createCall } from '/board/call.js';

const stage = document.getElementById('stage');
const W = 1920;
const H = 1080;
const CALL_MS = 20000; // «Now playing» call screen after a result: who goes to the table
const DURATION = { groups: 30000, group: 30000, playoff: 30000, podium: 60000, splash: 60000 };
const QUEUE_SPEED = 22; // px per second, scrolling of the rest of the queue
const GROUPS_PER_SLIDE = 4;

let T = null; // tournament snapshot
let slides = [];
let index = 0;
let timer = null;
let shownKey = null;
let shownKind = null;
let splash = null; // running splash animation

// ---------- scale the 1920×1080 stage to the screen ----------

// TV browsers often zoom pages: the layout viewport stays 1920×1080 while only a part of it is visible.
// So fit the stage into the visual viewport (what is actually on screen), not into innerWidth/innerHeight.
function visibleArea() {
  const vv = window.visualViewport;
  if (vv && vv.width > 0 && vv.height > 0) return { w: vv.width, h: vv.height, x: vv.pageLeft, y: vv.pageTop };
  return { w: window.innerWidth, h: window.innerHeight, x: 0, y: 0 };
}

let fitted = '';
function fitStage() {
  const a = visibleArea();
  const k = Math.min(a.w / W, a.h / H);
  const t = `translate(${a.x + (a.w - W * k) / 2}px, ${a.y + (a.h - H * k) / 2}px) scale(${k})`;
  if (t !== fitted) stage.style.transform = fitted = t;
}
window.addEventListener('resize', fitStage);
window.visualViewport?.addEventListener('resize', fitStage);
window.visualViewport?.addEventListener('scroll', fitStage);
setInterval(fitStage, 2000); // some TV browsers change zoom without firing events
fitStage();

// ---------- helpers ----------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- layout: built once ----------
// The header and the queue panel are not part of a slide: a slide change only swaps #content and the title,
// so the header never blinks and the queue keeps scrolling. The splash is a layer on top of everything.
stage.innerHTML = `<main><header class="top"><img class="bar-logo" src="/assets/cuba-libre-logo.svg" alt="Cuba Libre">
  <div class="brand-sub">Pool<br>Tournament</div><div class="slide-title" id="title"></div></header>
  <div class="content" id="content"></div></main>
  <aside class="queue" id="queue"><div class="qhead"><span>Queue</span><span id="clock"></span></div><div id="qtop"></div>
    <div class="qrest" id="qrest"><div class="qrest-inner" id="qinner"></div><div class="qfade" hidden></div></div></aside>
  <div class="splash" id="splash" hidden></div>
  <div class="call" id="call" hidden></div>`;
const el = (id) => document.getElementById(id);

// Clock next to «Queue»: Bali time (WITA, UTC+8) whatever the TV is set to, 24 h. The DOM is touched only when the minute changes.
const BALI = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hour12: false });
function tickClock() {
  const t = BALI.format(new Date());
  if (el('clock').textContent !== t) el('clock').textContent = t;
}
tickClock();
setInterval(tickClock, 1000);

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
  if (t.playoff || t.contenders) out.push({ kind: 'playoff', key: 'playoff' }); // hidden until the first group game
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

// Grey hourglass for a match that is still to be played.
const HOURGLASS = '<svg class="hg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12v2c0 3-2 5-4.3 6.5L12 12l1.7 1.5C16 15 18 17 18 20v2H6v-2c0-3 2-5 4.3-6.5L12 12l-1.7-1.5C8 9 6 7 6 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 20c0-1.6 1.3-2.8 3-3.6 1.7.8 3 2 3 3.6z" fill="currentColor"/></svg>';

function crossTable(g) {
  const short = shortNames(g.rows);
  // No row names: the rows line up with the Standings table on the left (alignGroupRows), its names label them.
  const head = `<tr>${short.map((s) => `<th>${esc(s)}</th>`).join('')}</tr>`;
  const body = g.rows.map((r) => `<tr>${g.rows.map((c) => {
    if (c.id === r.id) return '<td class="diag"></td>';
    const x = g.cross[r.id]?.[c.id];
    if (!x) return r.out || c.out ? '<td class="none">—</td>' : `<td class="none">${HOURGLASS}</td>`; // dash: will not be played
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
      <div class="card"><h3>Results</h3><div class="fit" style="font-size:48px">${crossTable(g)}</div>
        <div class="legend"><span><b class="g">3</b> win, balls</span><span><b class="k">0</b> loss</span><span>${HOURGLASS} to be played</span>${approx ? '<span>≈ average (withdrawn player)</span>' : ''}</div></div>
    </div>`,
  };
}

function slidePlayoff() {
  const po = T.playoff;
  const fallback = { sf1: ['Seed 1', 'Seed 4'], sf2: ['Seed 2', 'Seed 3'], third: ['Loser SF1', 'Loser SF2'], final: ['Winner SF1', 'Winner SF2'] };
  const cand = !po && T.contenders; // projected semi-finals: grey names, dashed boxes
  const box = (slot, title, style, extra = '') => {
    const m = po?.[slot];
    if (cand && cand[slot]) {
      const side = (e) => (e.names
        ? `<div class="p cand"><div class="cn"><span>${esc(e.names.join(' / '))}</span></div><i class="ctag">Contender</i></div>`
        : `<div class="p tbd"><span>${esc(e.label)}</span></div>`);
      return `<div class="bm cand ${extra}" style="${style}"><div class="t"><span>${esc(title)}</span></div>${side(cand[slot][0])}${side(cand[slot][1])}</div>`;
    }
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
      <div class="col-t" style="left:0">Semi-finals</div><div class="col-t" style="left:720px">Final</div>
      ${cand ? '<div class="col-t cand-note">If the groups ended now</div>' : ''}
      <svg class="lines" viewBox="0 0 1284 888" preserveAspectRatio="none">
        <path d="M500 205 H610 V385 H720" fill="none" stroke="#9db8e3" stroke-width="4"/>
        <path d="M500 565 H610 V385" fill="none" stroke="#9db8e3" stroke-width="4"/>
        <path d="M610 475 V700 H720" fill="none" stroke="#c9d3e3" stroke-width="3" stroke-dasharray="10 8"/>
      </svg>
      ${box('sf1', 'Semi-final 1', 'left:0;top:105px;width:500px')}
      ${box('sf2', 'Semi-final 2', 'left:0;top:465px;width:500px')}
      ${box('final', 'Final', 'left:720px;top:285px;width:564px', 'final')}
      ${box('third', '3rd place · played before the final', 'left:720px;top:610px;width:564px', 'third')}
    </div>`,
  };
}

function slidePodium() {
  const [p1, p2, p3] = T.podium || [];
  const col = (cls, p, place, medal) => `<div class="col ${cls}"><div class="medal">${medal}</div><div class="nm">${p ? esc(p.name) : ''}</div><div class="block">${place}</div></div>`;
  return { title: 'Champions', html: `<div class="podium">${col('p2', p2, 2, '🥈')}${col('p1', p1, 1, '🥇')}${col('p3', p3, 3, '🥉')}</div>` };
}

// ---------- queue panel (persistent) ----------

let queueKey = '';
let qpos = 0; // scroll offset of the rest of the queue, px
let qloop = 0; // height of one copy of the rows; 0 = everything fits, no scrolling
let qlast = 0;

function renderQueue() {
  const q = T.queue;
  const big = (m, title, cls) => (m
    ? `<div class="qbig ${cls}"><div class="qlabel">${title} · ${esc(label(m))}</div><div class="qp">${name(m.p1)}</div><div class="qvs">vs</div><div class="qp">${name(m.p2)}</div></div>`
    : '');
  const rest = q.slice(3);
  const rows = rest.map((m, i) => `<div class="qrow"><span class="qn">${i + 4}</span><span class="qm"><span class="a">${name(m.p1)}</span><i>vs</i><span class="b">${name(m.p2)}</span></span><span class="qg">${esc(shortLabel(m))}</span></div>`).join('');
  // q[0] is being played: not shown, the players at the table know it.
  const top = q.length > 1 ? `${big(q[1], 'Next', 'next')}${big(q[2], 'After next', 'after')}` : '<div class="qempty">No matches in the queue</div>';
  const key = top + rows;
  if (key === queueKey) return; // nothing changed: do not touch the DOM, the scroll goes on
  queueKey = key;
  el('qtop').innerHTML = top;
  // Capital letters are wide: a long name on the Next card gets a smaller font instead of being cut.
  for (const n of el('qtop').querySelectorAll('.qbig.next .qp')) {
    let size = parseFloat(getComputedStyle(n).fontSize);
    while (n.clientWidth && n.scrollWidth > n.clientWidth && size > 28) n.style.fontSize = `${(size -= 1)}px`;
  }
  const inner = el('qinner');
  inner.innerHTML = rows;
  qloop = 0;
  if (rows && inner.scrollHeight > el('qrest').clientHeight) {
    qloop = inner.scrollHeight;
    inner.innerHTML = rows + rows; // seamless loop
  }
  el('qrest').querySelector('.qfade').hidden = !rows;
  qpos = qloop ? qpos % qloop : 0; // keep the place in the list after an update
  inner.style.transform = `translateY(${-qpos}px)`;
}

function scrollQueue(now) {
  const dt = qlast ? Math.min(0.1, (now - qlast) / 1000) : 0;
  qlast = now;
  if (qloop && !stage.classList.contains('full')) {
    qpos = (qpos + QUEUE_SPEED * dt) % qloop;
    el('qinner').style.transform = `translateY(${-qpos}px)`;
  }
  requestAnimationFrame(scrollQueue);
}
requestAnimationFrame(scrollQueue);

function shortLabel(m) {
  if (m.stage === 'group') return m.label.replace(/^group\s+/i, '');
  if (m.stage === 'tiebreak') return 'TB';
  return { sf1: 'SF1', sf2: 'SF2', third: '3rd', final: 'Final' }[m.round] ?? '';
}

// ---------- render ----------

function renderSlide() {
  if (!T) return;
  const s = slides[index];
  if (!s) return;
  if (s.kind === 'splash') {
    // Keep the animation running across state updates before the start.
    if (!splash) {
      el('splash').hidden = false;
      splash = startSplash(el('splash'));
    }
    shownKey = s.key;
    shownKind = s.kind;
    return;
  }
  if (splash) {
    splash.stop();
    splash = null;
    el('splash').hidden = true;
  }
  const make = { groups: slideGroups, group: slideGroup, playoff: slidePlayoff, podium: slidePodium }[s.kind];
  const view = make(s);
  if (!view) return;
  stage.classList.toggle('full', s.kind === 'podium'); // the podium uses the whole width, no queue
  if (el('title').textContent !== view.title) el('title').textContent = view.title;
  // A new slide (not a data update of the same one) slides in; not from the splash, not to or from the podium.
  const slideIn = shownKey !== s.key && shownKind && !['splash', 'podium'].includes(shownKind) && s.kind !== 'podium';
  const old = slideIn ? snapshotContent() : null;
  el('content').innerHTML = view.html;
  fitText(el('content'));
  alignGroupRows(el('content'));
  renderQueue();
  if (old) slideTransition(old, el('content'));
  shownKey = s.key;
  shownKind = s.kind;
}

// ---------- slide transition ----------
// «Cartoon» push (tried in /lab/): the old and the new slide move as one strip, the new one exactly one width
// to the right. Wind-up to the right, whoosh to the left, overshoot past the place, small bounce back, settle.
const SLIDE_MS = 1000;
const SLIDE_TRACK = [ // strip position: px added to a share of the width (0 = old in place, -1 = new in place)
  { share: 0, px: 0, offset: 0, easing: 'cubic-bezier(.3,0,.4,1)' },
  { share: 0, px: 210, offset: 0.3, easing: 'cubic-bezier(.55,0,.75,.2)' }, // wind-up to the right
  { share: -1, px: -75, offset: 0.74, easing: 'cubic-bezier(.3,0,.5,1)' }, // whoosh, overshoot to the left
  { share: -1, px: 12, offset: 0.88, easing: 'ease-in-out' }, // bounce back a little past the place
  { share: -1, px: 0, offset: 1 }, // settle
];
let slideAnim = null; // { anims, old }

function endSlideTransition() {
  if (!slideAnim) return;
  slideAnim.anims.forEach((a) => a.cancel());
  slideAnim.old.remove();
  slideAnim = null;
}

/** Frozen copy of the current slide, laid over #content, to slide out while the new one slides in. */
function snapshotContent() {
  endSlideTransition();
  const c = el('content');
  const copy = c.cloneNode(true);
  copy.removeAttribute('id');
  Object.assign(copy.style, { position: 'absolute', left: `${c.offsetLeft}px`, top: `${c.offsetTop}px`, width: `${c.offsetWidth}px`, height: `${c.offsetHeight}px` });
  c.before(copy);
  return copy;
}

function slideTransition(old, cur) {
  const w = cur.offsetWidth;
  const frames = (shift) => SLIDE_TRACK.map((k) => ({ transform: `translateX(${Math.round((k.share + shift) * w + k.px)}px)`, offset: k.offset, easing: k.easing ?? 'linear' }));
  const anims = [old.animate(frames(0), { duration: SLIDE_MS }), cur.animate(frames(1), { duration: SLIDE_MS })];
  slideAnim = { anims, old };
  anims[1].finished.then(() => { if (slideAnim?.old === old) endSlideTransition(); }, () => {});
}

// Group slide: Standings and Results list the same players in the same order. Give every Standings row
// the exact height and position of the matching Results row, so the names line up across the two cards.
function alignGroupRows(root) {
  const std = root.querySelector('.group-one table.std');
  const cross = root.querySelector('.group-one table.cross');
  if (!std || !cross) return;
  const sr = [...std.rows];
  const xr = [...cross.rows];
  if (sr.length !== xr.length) return;
  std.style.flex = 'none'; // stop stretching, heights come from the Results rows
  xr.forEach((r, i) => {
    const h = i < xr.length - 1 ? xr[i + 1].offsetTop - r.offsetTop : r.offsetHeight;
    sr[i].style.height = `${h}px`;
  });
  const k = stage.getBoundingClientRect().width / W || 1; // screen px -> stage px
  const dy = (cross.getBoundingClientRect().top - std.getBoundingClientRect().top) / k;
  std.style.marginTop = `${Math.round(dy)}px`;
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

// ---------- call screen ----------
// Whenever the match being played changes (a result, the queue reordered, an undo), the whole screen shows
// who goes to the table, for CALL_MS. Not on page load.
let loaded = false;

let prevCurrentId = null;
let call = null; // { id, timer }

let callScreen = null; // fight-night screen, public/board/call.js; built on first use

/**
 * Important matches get the fire: the play-off, tie-breaks, the two group leaders against each other,
 * and the last match of a group (it settles the group).
 */
function isImportant(m) {
  if (m.stage === 'playoff' || m.stage === 'tiebreak') return true;
  const g = T.groups.find((x) => x.id === m.groupId);
  if (!g) return false;
  if (g.total - g.played === 1) return true;
  const top = g.rows.filter((r) => !r.out).slice(0, 2).map((r) => r.id);
  return g.played > 0 && top.includes(m.p1?.id) && top.includes(m.p2?.id);
}

function showCall(m) {
  clearTimeout(call?.timer);
  const box = el('call');
  box.hidden = false; // visible before show(): it measures the names
  callScreen ??= createCall(box);
  callScreen.show(m, isImportant(m), CALL_MS);
  call = { id: m.id, timer: setTimeout(hideCall, CALL_MS) };
}

function hideCall() {
  clearTimeout(call?.timer);
  call = null;
  callScreen?.hide();
  el('call').hidden = true;
}

function updateCall() {
  const cur = T.current;
  const changed = loaded && (cur?.id ?? null) !== prevCurrentId;
  if (changed && cur?.p1 && cur?.p2) showCall(cur);
  else if (call && call.id !== cur?.id) hideCall(); // the match left the queue, or the tournament is over
  prevCurrentId = cur?.id ?? null;
  loaded = true;
}

function onState(state) {
  T = state.tournament;
  updateCall();
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
