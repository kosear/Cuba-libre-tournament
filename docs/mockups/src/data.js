// Вымышленные данные для макетов. Середина группового этапа.
const GROUPS = {
  A: ['Budi Santoso', 'Alex Turner', 'Made Wirawan', 'Ivan Petrov'],
  B: ['Rizky Pratama', 'Tom Becker', 'Agus Setiawan', 'Dmitri Volkov'],
  C: ['Kadek Arya', 'Sam Wilson', 'Yoga Saputra', 'Oleg Smirnov'],
  D: ['Wayan Putra', 'Luca Rossi', 'Andi Wijaya', 'Mark Evans'],
};
const WITHDRAWN = ['Oleg Smirnov'];

// [группа, победитель, проигравший, шары, по среднему?]
const RESULTS = [
  ['A', 'Budi Santoso', 'Alex Turner', 3],
  ['A', 'Made Wirawan', 'Ivan Petrov', 5],
  ['A', 'Budi Santoso', 'Made Wirawan', 2],
  ['A', 'Ivan Petrov', 'Alex Turner', 4],
  ['B', 'Rizky Pratama', 'Tom Becker', 6],
  ['B', 'Agus Setiawan', 'Dmitri Volkov', 1],
  ['B', 'Rizky Pratama', 'Agus Setiawan', 3],
  ['B', 'Tom Becker', 'Dmitri Volkov', 7],
  ['C', 'Kadek Arya', 'Sam Wilson', 2],
  ['C', 'Sam Wilson', 'Yoga Saputra', 3],
  ['C', 'Kadek Arya', 'Oleg Smirnov', 4, true],
  ['C', 'Sam Wilson', 'Oleg Smirnov', 4, true],
  ['C', 'Yoga Saputra', 'Oleg Smirnov', 4, true],
  ['D', 'Wayan Putra', 'Andi Wijaya', 4],
  ['D', 'Luca Rossi', 'Mark Evans', 2],
  ['D', 'Wayan Putra', 'Mark Evans', 2],
  ['D', 'Luca Rossi', 'Andi Wijaya', 4],
];

// Очередь: первый матч играется сейчас, второй — следующий.
const QUEUE = [
  ['A', 'Budi Santoso', 'Ivan Petrov'],
  ['B', 'Rizky Pratama', 'Dmitri Volkov'],
  ['C', 'Kadek Arya', 'Yoga Saputra'],
  ['D', 'Wayan Putra', 'Luca Rossi'],
  ['A', 'Alex Turner', 'Made Wirawan'],
  ['B', 'Tom Becker', 'Agus Setiawan'],
  ['D', 'Andi Wijaya', 'Mark Evans'],
];

function standings(g) {
  const rows = GROUPS[g].map((name) => ({ name, frames: 0, win: 0, balls: 0, approx: false, out: WITHDRAWN.includes(name) }));
  const by = (n) => rows.find((r) => r.name === n);
  for (const [gr, w, l, b, approx] of RESULTS) {
    if (gr !== g) continue;
    by(w).frames++; by(l).frames++;
    by(w).win++; by(w).balls += b;
    if (approx) by(w).approx = true;
  }
  rows.sort((a, b) => a.out - b.out || b.win - a.win || b.balls - a.balls);
  const top = rows.filter((r) => !r.out)[0];
  rows.forEach((r) => (r.leader = !r.out && r.win === top.win && r.balls === top.balls));
  return rows;
}

function cell(g, a, b) {
  const m = RESULTS.find(([gr, w, l]) => gr === g && ((w === a && l === b) || (w === b && l === a)));
  if (!m) return null;
  return m[1] === a ? { win: true, balls: m[3], approx: !!m[4] } : { win: false };
}

function statsOf(name) {
  const g = Object.keys(GROUPS).find((k) => GROUPS[k].includes(name));
  return { group: g, ...standings(g).find((r) => r.name === name) };
}

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

function tableHtml(g) {
  return `<table class="std"><thead><tr><th class="name">Player</th><th>Frames</th><th>Win</th><th>Balls</th></tr></thead><tbody>${standings(g)
    .map(
      (r) => `<tr class="${r.leader ? 'leader' : ''} ${r.out ? 'out' : ''}">
      <td class="name">${esc(r.name)}${r.leader ? ' <span class="cup">🏆</span>' : ''}</td>
      <td>${r.frames}</td><td>${r.win}</td><td>${r.approx ? '≈' : ''}${r.balls}</td></tr>`,
    )
    .join('')}</tbody></table>`;
}

function queueHtml() {
  const [now, next, ...rest] = QUEUE;
  const big = (m, label, cls) => `<div class="qbig ${cls}"><div class="qlabel">${label} · Group ${m[0]}</div>
    <div class="qp">${esc(m[1])}</div><div class="qvs">vs</div><div class="qp">${esc(m[2])}</div></div>`;
  return `<aside class="queue"><div class="qhead">Queue</div>
    ${big(now, 'Now playing', 'now')}${big(next, 'Next', 'next')}
    <div class="qrest"><div class="qrest-inner">${rest
      .map((m, i) => `<div class="qrow"><span class="qn">${i + 3}</span><span class="qm">${esc(m[1])}<i>vs</i>${esc(m[2])}</span><span class="qg">${m[0]}</span></div>`)
      .join('')}</div><div class="qfade"></div></div>
    <div class="qhint">↻ list scrolls in a loop</div></aside>`;
}

function headerHtml(title) {
  return `<header class="top"><div class="flag"><svg viewBox="0 0 100 100"><polygon points="0,0 100,50 0,100" fill="#D21034"/><polygon points="30.0,35.0 33.5,45.1 44.3,45.4 35.7,51.9 38.8,62.1 30.0,56.0 21.2,62.1 24.3,51.9 15.7,45.4 26.5,45.1" fill="#fff"/></svg></div>
    <img class="bar-logo" src="../../assets/cuba-libre-logo.svg" alt="Cuba Libre"><div class="brand-sub">Pool<br>Tournament</div>
    <div class="slide-title">${title}</div></header>`;
}
