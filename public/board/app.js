// TV scoreboard: no interaction. Slides rotate in a loop (see docs/requirements.md, «Дизайн табло»),
// data comes live over SSE, the page reloads itself after a deploy (shared/live.js).
import { live } from '/shared/live.js';
import { startSplash } from '/board/splash.js';
import { createCall } from '/board/call.js';
import { createPoster } from '/board/podium.js';
import { startLizard } from '/board/lizard.js';

const stage = document.getElementById('stage');
const W = 1920;
const H = 1080;
const CALL_MS = 20000; // «Now playing» call screen after a result: who goes to the table
// TEMPORARY, for looking at the mascots' brawls on dev2: the call screen stays until the match changes
const CALL_STAYS = 24 * 3600 * 1000;
const DURATION = { groups: 60000, group: 30000, playoff: 30000, podium: 60000, splash: 60000 };
const QUEUE_SPEED = 22; // px per second, scrolling of the rest of the queue
const GROUPS_PER_SLIDE = 4;

let T = null; // tournament snapshot
let SETTINGS = {}; // screen settings from the admin page (state.settings)
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
// Above even that, the «glass»: geckos and butterflies run over whatever is shown, the splash or the tournament.
stage.innerHTML = `<main><header class="top"><img class="bar-logo" src="/assets/cuba-libre-logo.svg" alt="Cuba Libre">
  <div class="brand-sub">Pool<br>Tournament</div><div class="slide-title" id="title"></div></header>
  <div class="content" id="content"></div></main>
  <aside class="queue" id="queue"><div class="qhead"><span class="qtitle">Play Next</span><span id="clock"></span></div><div id="qtop"></div>
    <div class="qrest" id="qrest"><div class="qrest-inner" id="qinner"></div><div class="qfade" hidden></div></div></aside>
  <div class="splash" id="splash" hidden></div>
  <div class="poster" id="poster" hidden></div>
  <div class="call" id="call" hidden></div>
  <div class="glass" id="glass"></div>`;
const el = (id) => document.getElementById(id);
const poster = createPoster(el('poster')); // the podium after the final, a full-screen layer like the splash
// Until the first state arrives the board does not know what to show: no empty frame, just the background.
stage.classList.add('loading');

// Clock next to «Play Next»: Bali time (WITA, UTC+8) whatever the TV is set to, 24 h. The DOM is touched only when the minute changes.
const BALI = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hour12: false });
function tickClock() {
  const t = BALI.format(new Date());
  if (el('clock').textContent !== t) el('clock').textContent = t;
}
tickClock();
setInterval(tickClock, 1000);

const label = (m) => (m ? m.label : '');
const name = (p) => (!p ? 'TBD' : p.placeholder ? `<span class="ph">${esc(p.name)}</span>` : esc(p.name)); // a play-off place not decided yet: grey italic

/** A name with LIVE before it gets smaller, down to 70%, before it is cut with «…». Not on a group's slide: LIVE is above the name there. */
function fitLive(root) {
  root.querySelectorAll('.live-tag + .ln').forEach((name) => {
    if (name.closest('.group-one')) return;
    const box = name.parentElement;
    for (let k = 1; k > 0.7 && box.scrollWidth > box.clientWidth + 1; ) name.style.fontSize = `${(k -= 0.03).toFixed(2)}em`;
  });
}

/** Names in the big final box (play-offs): as big as fits on one line, down to 60 px. */
function fitFinal(root) {
  root.querySelectorAll('.bm.big .p > span').forEach((name) => {
    // room in the row: its width less the padding and whatever else stands in it (a WINNER label), with a little margin
    const row = name.parentElement;
    const cs = getComputedStyle(row);
    const others = [...row.children].filter((c) => c !== name).reduce((w, c) => w + c.offsetWidth + parseFloat(cs.columnGap || 0), 0);
    const room = row.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - others - 8;
    let size = parseFloat(getComputedStyle(name).fontSize);
    while (size > 60 && name.scrollWidth > room) name.style.fontSize = `${(size -= 4)}px`;
  });
}

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

// LIVE: a blinking red «recording» dot and a red label. In the group tables before the names of the two players
// at the table right now; in the bracket in the header of the match being played.
const LIVE = '<i class="live-tag"><b></b><span>Live</span></i>';
const isLive = (id) => !!id && (T.current?.p1?.id === id || T.current?.p2?.id === id);
const liveName = (name) => `${LIVE}<span class="ln">${esc(name)}</span>`;

function groupTable(g) {
  const rows = g.rows.map((r) => `<tr class="${r.leader ? 'leader' : ''} ${r.out ? 'out' : ''}">
    <td class="name">${isLive(r.id) ? liveName(r.name) : esc(r.name)}</td><td>${r.frames}</td><td>${r.wins}</td><td class="balls">${r.approx ? '≈' : ''}${r.balls > 0 ? '+' : ''}${r.balls}</td></tr>`).join(''); // balls with a plus, like in Results; 0 stays 0
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
    if (x?.skipped) return '<td class="skip">skip</td>'; // the admin skipped it: no result for either
    if (!x) return r.out || c.out ? '<td class="none">—</td>' : `<td class="none">${HOURGLASS}</td>`; // dash: will not be played
    return x.win ? `<td class="win">${x.approx ? '≈' : ''}+${x.balls}</td>` : '<td class="loss">L</td>'; // green +balls, red L
  }).join('')}</tr>`).join('');
  return `<table class="cross">${head}${body}</table>`;
}

function slideGroups(s) {
  const groups = T.groups.slice(s.page * GROUPS_PER_SLIDE, (s.page + 1) * GROUPS_PER_SLIDE);
  const title = s.pages > 1 ? `Group stage ${s.page + 1}/${s.pages}` : 'Group stage';
  // the group whose match is being played now is lifted a little, like the live box in the bracket
  const cards = groups.map((g) => `<div class="card${g.rows.some((r) => isLive(r.id)) ? ' live' : ''}"><h3>${esc(g.name)}</h3><div class="fit">${groupTable(g)}</div></div>`).join('');
  return { title, html: `<div class="groups n${groups.length}">${cards}</div>` };
}

function slideGroup(s) {
  const g = T.groups.find((x) => x.id === s.id);
  if (!g) return null;
  const approx = g.rows.some((r) => r.approx);
  const skipped = Object.values(g.cross).some((row) => Object.values(row).some((x) => x?.skipped));
  return {
    title: g.name,
    html: `<div class="group-one">
      <div class="card"><h3>Standings</h3><div class="fit">${groupTable(g)}</div></div>
      <div class="card"><h3>Results</h3><div class="fit" style="font-size:48px">${crossTable(g)}</div>
        <div class="legend"><span><b class="g">+3</b> win, balls</span><span><b class="k">L</b> loss</span><span>${HOURGLASS} to be played</span>${skipped ? '<span><b class="s">SKIP</b> not played</span>' : ''}${approx ? '<span>≈ average (withdrawn player)</span>' : ''}</div></div>
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
      return `<div class="p ${cls}"><span>${esc(p.name)}</span>${m.winner === n ? '<i class="win-tag">Winner</i>' : ''}</div>`;
    };
    // LIVE on the match being played now: in the box's header, for the match as a whole, not by a name
    // (the 3rd place match drops «played before the final» then, to make room for it)
    // the big final: a quiet «VS» on the line between the two names
    const vs = extra.includes('big') ? '<div class="vs"><span>VS</span></div>' : '';
    return `<div class="bm ${extra}${live}" style="${style}"><div class="t"><span>${esc(title)}</span>${live ? LIVE : ''}</div>${side(1)}${vs}${side(2)}</div>`;
  };
  // Play-offs on (no queue panel): the slide spans from the logo's left edge to the clock's right edge; the final grows
  // to fill the right side, as tall as the left column. Before (contenders, the queue still on the right) the final is
  // as wide as a semi-final and as tall as the left column.
  const big = T.phase === 'playoff';
  return {
    title: 'Play-off',
    // left, spread over the whole height: the semi-finals and the 3rd place match; right: only the final.
    // The lines (from the semi-finals to the final, dashed to the 3rd place match) are drawn after layout, drawBracket().
    // While the semi-finals and the 3rd place match are on, the left column is wide with big names and the final gets
    // the rest; once the final is being played, the left column goes back to normal and the final takes the room.
    html: `<div class="bracket${big ? ' big' : ''}${big && T.current?.id !== 'final' ? ' wide' : ''}">
      <svg class="lines" aria-hidden="true"></svg>
      <div class="bcol">
        ${box('sf1', 'Semi-final 1', '')}
        ${box('sf2', 'Semi-final 2', '')}
        ${box('third', T.current?.id === 'third' ? '3rd place' : '3rd place · played before the final', '', 'third')}
      </div>
      <div class="bfin">${box('final', 'Final', '', big ? 'final big' : 'final')}</div>
    </div>`,
  };
}

/** Bracket lines from the boxes' real places: semi-finals → final, and a dashed one from them to the 3rd place match. */
function drawBracket(root) {
  const br = root.querySelector('.bracket');
  if (!br) return;
  const [sf1, sf2, third] = br.querySelectorAll('.bcol > .bm');
  const fin = br.querySelector('.bfin > .bm');
  const mid = (b) => b.offsetTop + b.offsetHeight / 2;
  const y1 = mid(sf1);
  const y2 = mid(sf2);
  const yf = (y1 + y2) / 2;
  const x0 = sf1.offsetLeft + sf1.offsetWidth; // right edge of the left column
  const x2 = fin.offsetLeft;
  const xj = Math.round((x0 + x2) / 2); // the joint, halfway to the final
  const svg = br.querySelector('svg.lines');
  svg.setAttribute('viewBox', `0 0 ${br.clientWidth} ${br.clientHeight}`);
  svg.innerHTML = `<path d="M${x0} ${y1} H${xj} V${yf} H${x2}" fill="none" stroke="#c9d1dd" stroke-width="3"/>
    <path d="M${x0} ${y2} H${xj} V${yf}" fill="none" stroke="#c9d1dd" stroke-width="3"/>
    <path d="M${xj} ${y2} V${mid(third)} H${x0}" fill="none" stroke="#c9d3e3" stroke-width="3" stroke-dasharray="10 8"/>`;
}

// ---------- queue panel (persistent) ----------

let queueKey = '';
let qpos = 0; // scroll offset of the rest of the queue, px
let qloop = 0; // height of one copy of the rows; 0 = everything fits, no scrolling
let qlast = 0;

function renderQueue() {
  // after the group matches the play-off still to come: certain names, else placeholders (T.upcoming, groups stage only)
  const q = [...(T.queue.length ? T.queue : [null]), ...(T.upcoming || [])]; // [0] is the match at the table (none: null)
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
  // Capital letters are wide: a long name on the Next / After next card gets a smaller font instead of being cut.
  for (const n of el('qtop').querySelectorAll('.qbig .qp')) {
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
  el('qrest').classList.toggle('still', !qloop); // everything fits, nothing scrolls: no fade at the edges
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
  if (s.kind === 'podium') {
    poster.show(T.podium, T.players); // the entrance plays once; a later update only redraws the names
    shownKey = s.key;
    shownKind = s.kind;
    return;
  }
  poster.hide();
  const make = { groups: slideGroups, group: slideGroup, playoff: slidePlayoff }[s.kind];
  const view = make(s);
  if (!view) return;
  if (el('title').textContent !== view.title) el('title').textContent = view.title;
  // A new slide (not a data update of the same one) slides in; not from the splash, not to or from the podium.
  const slideIn = shownKey !== s.key && shownKind && !['splash', 'podium'].includes(shownKind) && s.kind !== 'podium';
  const old = slideIn ? snapshotContent() : null;
  el('content').innerHTML = view.html;
  fitText(el('content'));
  fitLive(el('content'));
  fitFinal(el('content'));
  drawBracket(el('content'));
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
  Object.assign(copy.style, { position: 'absolute', zIndex: '4', left: `${c.offsetLeft}px`, top: `${c.offsetTop}px`, width: `${c.offsetWidth}px`, height: `${c.offsetHeight}px` });
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
 * Why a match is a big one, for the tapes on the call screen ('' for an ordinary match): every play-off match,
 * a tie-break, the last match of a group, the two current leaders of a group against each other.
 */
function hypeOf(m) {
  if (m.stage === 'playoff') return { sf1: 'Semi-final', sf2: 'Semi-final', third: '3rd place', final: 'Final' }[m.id] ?? 'Play-off';
  if (m.stage === 'tiebreak') return 'Tie-break';
  const g = T.groups.find((x) => x.id === m.groupId);
  if (!g) return '';
  if (g.total - g.played === 1 && g.lastMatters) return 'Group decider'; // only if its result can change something
  const top = g.rows.filter((r) => !r.out).slice(0, 2).map((r) => r.id);
  return g.played > 0 && top.includes(m.p1?.id) && top.includes(m.p2?.id) ? 'Top of the group' : '';
}

function showCall(m) {
  clearTimeout(call?.timer);
  const box = el('call');
  box.hidden = false; // visible before show(): it measures the names
  callScreen ??= createCall(box);
  callScreen.show(m, hypeOf(m), CALL_STAYS, T.players);
  call = { id: m.id, timer: setTimeout(hideCall, CALL_STAYS) };
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

function onState(state, cached = false) {
  stage.classList.remove('loading');
  if (!cached) { try { localStorage.setItem('boardState', JSON.stringify(state)); } catch {} }
  T = state.tournament;
  SETTINGS = state.settings || {};
  stage.classList.toggle('po', T.phase === 'playoff'); // play-offs: no queue, only a small blue plate with the clock
  updateCall();
  const keepKey = slides[index]?.key ?? shownKey;
  slides = buildSlides(T);
  const keep = slides.findIndex((s) => s.key === keepKey);
  const changedSlide = keep < 0;
  index = keep >= 0 ? keep : 0;
  renderSlide();
  if (changedSlide || !timer) schedule();
}

// The last state this screen saw: a reload shows the right picture (splash or tournament) at once, the server's
// state follows. It does not count as «loaded»: a match that changed meanwhile must not pop up the call screen.
try {
  const last = JSON.parse(localStorage.getItem('boardState'));
  if (last?.tournament) { onState(last, true); loaded = false; }
} catch {}

// Errors are never shown on the TV: it keeps the last picture and reconnects by itself.
live({ onState: (state) => onState(state) });
// «lots of geckos» is switched in the admin page
startLizard(el('glass'), { swarm: () => !!SETTINGS.lizards });

// Debug hook for checking slides from the browser console.
window.__board = {
  get slides() { return slides; },
  nextSlide() { index = (index + 1) % slides.length; renderSlide(); schedule(); },
};
