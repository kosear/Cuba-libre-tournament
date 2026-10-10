// Admin panel. Every change is sent as an action to /api/admin/actions; the server validates it,
// stores it in the log and broadcasts the new state. The page re-renders from the snapshot.
// Offline: actions wait in an outbox (localStorage) and are applied locally with the same rules
// engine, so the admin keeps working; they are sent in order when the connection is back.
import { live } from '/shared/live.js';
import { applyAction, DomainError } from '/domain/engine.js';
import { snapshot } from '/domain/view.js';
import { t, lang, setLang, LANGS, has } from './i18n.js';

const $ = (id) => document.getElementById(id);
const TABS = [
  { id: 'game', icon: '🎱' }, { id: 'queue', icon: '☰' }, { id: 'groups', icon: '▦' },
  { id: 'playoff', icon: '🏆' }, { id: 'journal', icon: '⟲' },
];
const SLOTS = ['sf1', 'sf2', 'third', 'final'];

let server = null; // last { tournament, journal, raw, head, tournamentId } from /api/admin/state
let S = null; // what the page shows: the server state plus the actions not sent yet
let online = false;
const outbox = loadJson('outbox', []); // actions not yet accepted by the server, oldest first
let me = null;
let tab = load('tab', 'game');
const ui = { pick: null, balls: null }; // result entry in progress: { matchId, winner }
let sheet = null; // open bottom sheet: { kind, id }
let deferred = false; // a re-render waits until the admin finishes typing

function load(k, d) { try { return localStorage.getItem(k) || d; } catch { return d; } }
function store(k, v) { try { localStorage.setItem(k, v); } catch {} }
function loadJson(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }
const nowSql = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

// ---------- server ----------

async function api(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (res.status === 401) {
    location.href = '/admin/login.html';
    throw new Error('not authenticated');
  }
  return res;
}

// Undo, redo and a new tournament work on the server log directly: only online, with the outbox empty.
async function post(url, body) {
  if (!online || outbox.length) { toast(t('err.needOnline'), true); return false; }
  try {
    const res = await api(url, { method: 'POST', body: JSON.stringify(body ?? {}) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast(errorText(data), true); return false; }
    conn.reload();
    return true;
  } catch (e) {
    if (e.message !== 'not authenticated') toast(t('err.network'), true);
    return false;
  }
}

// Actions with a random part (same list as the server, src/tournament.js).
const SEEDED = ['tournament.start', 'player.add', 'player.replace', 'player.move'];

/** Make a change: check it locally, show it at once, send it when possible. */
async function act(type, payload) {
  if (!S) return false;
  const p = { ...payload };
  if (SEEDED.includes(type) && p.seed === undefined) p.seed = Math.floor(Math.random() * 2 ** 31);
  const a = { clientId: uuid(), type, payload: p, base: server.head, tournamentId: server.tournamentId, created_at: nowSql() };
  try {
    applyAction(S.raw, a);
  } catch (e) {
    toast(e instanceof DomainError ? errorText({ error: e.code, params: e.params }) : t('err.generic'), true);
    return false;
  }
  outbox.push(a);
  saveOutbox();
  setTimeout(refresh, 0); // after the caller has reset its own UI state (picked winner, open sheet)
  flush();
  return true;
}

function saveOutbox() { try { localStorage.setItem('outbox', JSON.stringify(outbox)); } catch {} }

let flushing = false;
let retryTimer = null;
/** Send the outbox in order. Rejected actions are dropped with a warning (e.g. the other admin was first). */
async function flush() {
  if (flushing || !outbox.length) return;
  flushing = true;
  clearTimeout(retryTimer);
  let sent = false;
  try {
    while (outbox.length) {
      const a = outbox[0];
      let res;
      try {
        res = await api('/api/admin/actions', { method: 'POST', body: JSON.stringify({ clientId: a.clientId, type: a.type, payload: a.payload, base: a.base, tournamentId: a.tournamentId }) });
      } catch {
        online = false; // no connection (or logged out): keep the outbox
        break;
      }
      if (res.status >= 500) break; // server restarting after a deploy: try again later
      if (!res.ok) toast(rejectText(a, await res.json().catch(() => ({}))), true);
      outbox.shift();
      saveOutbox();
      sent = true;
    }
  } finally {
    flushing = false;
  }
  if (sent) conn.reload();
  if (outbox.length) retryTimer = setTimeout(flush, 5000);
  showStatus();
}

function rejectText(a, data) {
  const what = describe(a);
  if (data?.error === 'conflict') return t('err.conflict', { action: what });
  return `${t('err.notSaved', { action: what })} ${errorText(data)}`;
}

/** Server state + outbox -> what the page shows. */
function compose() {
  if (!server) return;
  if (!outbox.length) { S = server; return; }
  let raw = server.raw;
  const names = { ...server.journal.names };
  const pending = [];
  for (const a of outbox) {
    if (a.tournamentId !== server.tournamentId) continue; // will be rejected when sent
    try { raw = applyAction(raw, a); } catch { continue; } // will be reported when sent
    const nid = a.payload.newId ?? a.payload.id;
    if (nid && a.payload.name) names[nid] = a.payload.name;
    pending.unshift({ id: a.clientId, type: a.type, payload: a.payload, status: 'pending', created_at: a.created_at, admin: me?.username });
  }
  S = { ...server, raw, tournament: snapshot(raw), journal: { ...server.journal, names, entries: [...pending, ...server.journal.entries] } };
}

function showStatus() {
  const el = $('offline');
  const n = outbox.length;
  el.hidden = online && !n;
  el.classList.toggle('sending', online);
  el.textContent = online ? t('sending', { n }) : n ? t('offlinePending', { n }) : t('offline');
  renderChrome();
}

function errorText(data) {
  const key = `err.${data?.error}`;
  const params = { ...(data?.params || {}) };
  return has(key) ? t(key, params) : t('err.generic');
}

let toastTimer;
function toast(text, err = false) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = `toast${err ? ' err' : ''}`;
  el.textContent = text;
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 3500);
}

// ---------- lookups ----------

const T = () => S.tournament;
const playerName = (id) => T().players.find((p) => p.id === id)?.name ?? S.journal.names[id] ?? '?';
const groupName = (id) => T().groups.find((g) => g.id === id)?.name ?? S.journal.names[id] ?? '?';
function allMatches() {
  const map = new Map();
  for (const m of [...T().results, ...T().queue]) map.set(m.id, m);
  if (T().playoff) for (const s of SLOTS) map.set(s, T().playoff[s]);
  return map;
}
const matchLabel = (m) => (m.stage === 'playoff' ? t(`slot.${m.round}`) : m.stage === 'tiebreak' ? t('label.tiebreak') : m.label);
const pname = (p) => (p ? esc(p.name) : `<span class="muted">${esc(t('playoff.tbd'))}</span>`);
const vs = (m, winnerMark = false) => {
  const cls = (n) => (winnerMark && m.winner === n ? ' class="w"' : '');
  return `<span${cls(1)}>${pname(m.p1)}</span><i>vs</i><span${cls(2)}>${pname(m.p2)}</span>`;
};

// ---------- render: chrome ----------

function renderChrome() {
  $('title').textContent = t(`title.${tab}`);
  const direct = online && !outbox.length; // undo/redo need the server
  $('undo').disabled = !direct || !S?.journal.canUndo;
  $('redo').disabled = !direct || !S?.journal.canRedo;
  $('undo').title = t('undo');
  $('redo').title = t('redo');
  $('lang').innerHTML = LANGS.map((l) => `<button data-lang="${l}" class="${l === lang() ? 'on' : ''}">${l.toUpperCase()}</button>`).join('');
  $('tabs').innerHTML = TABS.map((x) => `<button data-tab="${x.id}" class="${x.id === tab ? 'on' : ''}"><b>${x.icon}</b>${esc(t(`tab.${x.id}`))}</button>`).join('');
}

function render() {
  if (!S) return;
  if (document.activeElement?.closest('#view input')) { deferred = true; return; }
  deferred = false;
  renderChrome();
  const views = { game: viewGame, queue: viewQueue, groups: viewGroups, playoff: viewPlayoff, journal: viewJournal };
  $('view').innerHTML = views[tab]();
  if (tab === 'queue') enableDrag();
}

// ---------- tab: game ----------

function viewGame() {
  const tr = T();
  if (!tr.started) {
    return `<div class="card note">${esc(t('game.notStarted'))}</div><button class="btn primary" data-tab="groups">${esc(t('game.toGroups'))}</button>`;
  }
  let html = '';
  if (tr.podium) {
    const medals = ['🥇', '🥈', '🥉'];
    html += `<div class="card"><div class="h2" style="margin:0 0 10px">${esc(t('game.finished'))}</div><div class="podium">${tr.podium
      .map((p, i) => (p ? `<div class="place"><span>${medals[i]}</span>${esc(p.name)} <small class="muted">${esc(t(`game.place${i + 1}`))}</small></div>` : '')).join('')}</div></div>`;
  }
  const cur = tr.current;
  if (cur) html += resultCard(cur);
  else if (!tr.podium) html += `<div class="card note">${esc(t('game.empty'))}${tr.qualification ? `<br>${esc(qualText(tr.qualification.status))}` : ''}</div>`;
  if (tr.next) {
    html += `<div class="h2">${esc(t('game.next'))}</div><div class="card row"><div class="grow vsline">${vs(tr.next)}</div><span class="tag">${esc(matchLabel(tr.next))}</span></div>`;
  } else if (cur) {
    html += `<div class="muted">${esc(t('game.noNext'))}</div>`;
  }
  const last = tr.results[0];
  if (last) {
    const balls = last.stage === 'group' ? ` · ${t('col.balls').toLowerCase()} ${last.approx ? '≈' : ''}${last.balls}` : '';
    html += `<div class="h2">${esc(t('game.last'))}</div><div class="item"><div class="m vsline">${vs(last, true)}<small>${esc(matchLabel(last))}${esc(balls)}</small></div><button class="act" data-open="match" data-id="${last.id}">${esc(t('game.edit'))}</button></div>`;
  }
  return html;
}

function resultCard(m) {
  const pick = ui.pick?.matchId === m.id ? ui.pick.winner : null;
  const statsLine = (st) => (st ? `<small>${esc(t('stats.short', { frames: st.frames, wins: st.wins }))}</small>` : '');
  const side = (n) => `<button class="${pick === n ? 'sel' : ''}" data-pick="${n}" data-id="${m.id}">${esc((n === 1 ? m.p1 : m.p2)?.name)}${statsLine(n === 1 ? m.p1Stats : m.p2Stats)}</button>`;
  const group = m.stage === 'group';
  let tail = '';
  if (pick) {
    const winner = pick === 1 ? m.p1 : m.p2;
    const loser = pick === 1 ? m.p2 : m.p1;
    if (group) {
      tail += `<div class="ask">${t('game.balls', { name: `<b>${esc(loser.name)}</b>` })}</div>
        <div class="balls">${[0, 1, 2, 3, 4, 5, 6, 7].map((b) => `<button class="${ui.balls === b ? 'sel' : ''}" data-balls="${b}">${b}</button>`).join('')}</div>`;
    }
    const ready = !group || ui.balls !== null;
    const label = group && ready ? t('game.confirmBalls', { name: winner.name, balls: ui.balls }) : t('game.confirmWin', { name: winner.name });
    tail += `<button class="btn primary" style="margin-top:14px" data-confirm="${m.id}" ${ready ? '' : 'disabled'}>${esc(label)}</button>
      <div class="muted" style="text-align:center;margin-top:8px">${esc(t('game.autoNext'))}</div>`;
  } else if (!group) {
    tail = `<div class="muted" style="margin-top:10px">${esc(t('game.noBalls'))}</div>`;
  }
  return `<div class="card"><div class="row"><b class="grow" style="font-size:16px">${esc(t('game.now'))}</b><span class="tag">${esc(matchLabel(m))}</span></div>
    <div class="ask" style="margin-top:8px">${esc(t('game.whoWon'))}</div><div class="who">${side(1)}${side(2)}</div>${tail}</div>`;
}

function qualText(status) {
  return t({ waiting: 'playoff.tiebreak', tiebreak: 'playoff.tiebreak', impossible: 'playoff.impossible', ready: 'playoff.ready' }[status] || 'playoff.waiting');
}

// ---------- tab: queue ----------

function viewQueue() {
  const q = T().queue;
  if (!q.length) return `<div class="card note">${esc(t('queue.empty'))}</div>`;
  return `<div class="muted">${esc(t('queue.hint'))}</div><div class="list" id="qlist">${q.map((m, i) => {
    const sub = [matchLabel(m), i === 0 ? t('queue.playing') : i === 1 ? t('queue.next') : ''].filter(Boolean).join(' · ');
    const postpone = i < q.length - 1 ? `<button class="act" data-postpone="${m.id}">${esc(t('queue.postpone'))}</button>` : '';
    return `<div class="item${i === 0 ? ' now' : ''}" data-qid="${m.id}"><span class="grip">⠿</span>
      <div class="m vsline" data-open="match" data-id="${m.id}">${vs(m)}<small>${esc(sub)}</small></div>${postpone}</div>`;
  }).join('')}</div>`;
}

/** Drag a queue item by its handle (works with touch and mouse). */
function enableDrag() {
  const list = $('qlist');
  if (!list) return;
  list.querySelectorAll('.grip').forEach((grip) => {
    grip.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const item = grip.closest('.item');
      const items = [...list.children];
      const from = items.indexOf(item);
      const rect = item.getBoundingClientRect();
      const startY = e.clientY;
      const ph = item.cloneNode(true);
      ph.classList.add('placeholder');
      item.after(ph);
      item.classList.add('drag');
      item.style.position = 'fixed';
      item.style.left = `${rect.left}px`;
      item.style.width = `${rect.width}px`;
      item.style.top = `${rect.top}px`;
      grip.setPointerCapture(e.pointerId);
      const move = (ev) => {
        item.style.top = `${rect.top + ev.clientY - startY}px`;
        const others = [...list.children].filter((x) => x !== item && x !== ph);
        const mid = ev.clientY;
        const before = others.find((x) => { const r = x.getBoundingClientRect(); return mid < r.top + r.height / 2; });
        if (before) list.insertBefore(ph, before); else list.append(ph);
      };
      const up = () => {
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        grip.removeEventListener('pointercancel', up);
        const to = [...list.children].filter((x) => x !== item).indexOf(ph);
        ph.replaceWith(item);
        item.classList.remove('drag');
        item.removeAttribute('style');
        if (to !== from && to >= 0) act('queue.move', { id: item.dataset.qid, to }); else render();
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
      grip.addEventListener('pointercancel', up);
    });
  });
}

// ---------- tab: groups ----------

function viewGroups() {
  const tr = T();
  if (!tr.started) return viewGroupsSetup();
  return tr.groups.map((g) => {
    const rows = g.rows.map((r) => `<tr class="${r.leader ? 'leader' : ''} ${r.out ? 'out' : ''}" data-open="player" data-id="${r.id}">
      <td class="name">${esc(r.name)}${r.leader ? ' 🏆' : ''}</td><td>${r.frames}</td><td>${r.wins}</td><td>${r.approx ? '≈' : ''}${r.balls}</td></tr>`).join('');
    const late = tr.phase === 'groups'
      ? `<form class="add" data-add-player="${g.id}"><input class="text" placeholder="${esc(t('groups.playerName'))}" maxlength="40" autocomplete="off"><button class="btn small">${esc(t('groups.addPlayer'))}</button></form>`
      : '';
    return `<div class="card grp"><h3><span class="grow">${esc(g.name)}</span><span class="muted">${esc(t('groups.played', { played: g.played, total: g.total }))}</span><button class="pen" data-open="group" data-id="${g.id}">✎</button></h3>
      <table class="std"><thead><tr><th class="name">${esc(t('col.name'))}</th><th>${esc(t('col.games'))}</th><th>${esc(t('col.wins'))}</th><th>${esc(t('col.balls'))}</th></tr></thead><tbody>${rows}</tbody></table>${late}</div>`;
  }).join('') + (tr.phase === 'groups' ? `<div class="muted">${esc(t('groups.lateHint'))}</div>` : '');
}

function viewGroupsSetup() {
  const tr = T();
  const card = (g) => {
    const players = tr.players.filter((p) => p.groupId === (g ? g.id : null));
    if (!g && !players.length) return '';
    const rows = players.map((p) => `<div class="prow"><span class="nm">${esc(p.name)}</span><button class="pen" data-open="player" data-id="${p.id}">✎</button></div>`).join('')
      || `<div class="prow muted">${esc(t('groups.empty'))}</div>`;
    const head = g
      ? `<h3><span class="grow">${esc(g.name)}</span><button class="pen" data-open="group" data-id="${g.id}">✎</button></h3>`
      : `<h3><span class="grow">${esc(t('groups.unassigned'))}</span></h3>`;
    const add = g ? `<form class="add" data-add-player="${g.id}"><input class="text" placeholder="${esc(t('groups.playerName'))}" maxlength="40" autocomplete="off"><button class="btn small">${esc(t('groups.addPlayer'))}</button></form>` : '';
    return `<div class="card grp">${head}${rows}${add}</div>`;
  };
  return `<div class="card note">${esc(t('groups.setupHint'))}</div>${tr.groups.map(card).join('')}${card(null)}
    <button class="btn dashed" data-add-group>${esc(t('groups.addGroup'))}</button>
    <button class="btn primary" data-start>${esc(t('groups.start'))}</button>`;
}

function nextGroupName() {
  const used = new Set(T().groups.map((g) => g.name));
  for (let i = 0; i < 26; i++) {
    const name = `Group ${String.fromCharCode(65 + i)}`;
    if (!used.has(name)) return name;
  }
  return `Group ${T().groups.length + 1}`;
}

// ---------- tab: play-off ----------

function viewPlayoff() {
  const tr = T();
  if (!tr.started) return `<div class="card note">${esc(t('game.notStarted'))}</div>`;
  let note;
  if (tr.playoff) note = t('playoff.ready');
  else if (tr.qualification) note = qualText(tr.qualification.status);
  else note = t('playoff.waiting');
  const po = tr.playoff;
  const slot = (s) => {
    const m = po?.[s];
    const side = (n) => {
      const p = m?.[`p${n}`];
      if (!p) return `<div class="p tbd">${esc(t('playoff.tbd'))}</div>`;
      const cls = m.winner ? (m.winner === n ? 'win' : 'lose') : '';
      return `<div class="p ${cls}"><span>${esc(p.name)}${p.withdrawn ? ` <span class="tag grey">${esc(t('player.withdrawn'))}</span>` : ''}</span>${m.winner === n ? '✓' : ''}</div>`;
    };
    const manual = m?.manual ? `<span class="tag">${esc(t('playoff.manual'))}</span>` : '';
    const btn = m?.winner
      ? `<button class="btn small" data-open="match" data-id="${s}">${esc(t('game.edit'))}</button>`
      : `<button class="btn small" data-open="slot" data-id="${s}">${esc(t('playoff.edit'))}</button>`;
    return `<div class="card slot ${s === 'final' ? 'final' : ''}"><div class="t">${esc(t(`slot.${s}`))} ${manual}</div>${side(1)}${side(2)}<div style="margin-top:6px">${btn}</div></div>`;
  };
  return `<div class="card note">${esc(note)}</div>${SLOTS.map(slot).join('')}`;
}

// ---------- tab: journal ----------

function describe(e) {
  const p = e.payload;
  const m = allMatches().get(p.id);
  const matchText = m ? `${m.p1?.name ?? '?'} vs ${m.p2?.name ?? '?'}` : '';
  switch (e.type) {
    case 'group.add': case 'group.rename': return t(`log.${e.type}`, { name: p.name });
    case 'group.remove': return t('log.group.remove', { group: groupName(p.id) });
    case 'player.add': return t('log.player.add', { name: p.name, group: p.groupId ? groupName(p.groupId) : '—' });
    case 'player.rename': return t('log.player.rename', { old: '', name: p.name }).trim();
    case 'player.move': return t('log.player.move', { player: playerName(p.id), group: p.groupId ? groupName(p.groupId) : '—' });
    case 'player.remove': case 'player.withdraw': case 'player.restore': return t(`log.${e.type}`, { player: playerName(p.id) });
    case 'player.replace': return p.withId
      ? t('log.player.swap', { player: playerName(p.id), name: playerName(p.withId) })
      : t('log.player.replace', { player: playerName(p.id), name: p.name });
    case 'tournament.start': return t('log.tournament.start');
    case 'match.result': {
      if (!m) return t('log.unknown', { type: e.type });
      const w = p.winner === 1 ? m.p1 : m.p2;
      const l = p.winner === 1 ? m.p2 : m.p1;
      const balls = m.stage === 'group' ? t('log.balls', { balls: p.balls }) : '';
      return t('log.match.result', { winner: w?.name ?? '?', loser: l?.name ?? '?', balls });
    }
    case 'match.reopen': case 'queue.postpone': return t(`log.${e.type}`, { match: matchText });
    case 'queue.move': return t('log.queue.move', { match: matchText, to: Number(p.to) + 1 });
    case 'playoff.set': return t('log.playoff.set', { slot: t(`slot.${p.slot}`), p1: p.p1 ? playerName(p.p1) : t('playoff.tbd'), p2: p.p2 ? playerName(p.p2) : t('playoff.tbd') });
    case 'playoff.auto': return t('log.playoff.auto', { slot: t(`slot.${p.slot}`) });
    default: return t('log.unknown', { type: e.type });
  }
}

function viewJournal() {
  const j = S.journal;
  const direct = online && !outbox.length;
  const time = (iso) => new Date(`${iso.replace(' ', 'T')}Z`).toLocaleTimeString(lang(), { hour: '2-digit', minute: '2-digit' });
  const entries = j.entries.map((e) => {
    const badge = e.status === 'undone' ? `<span class="tag red">${esc(t('journal.undone'))}</span>`
      : e.status === 'discarded' ? `<span class="tag grey">${esc(t('journal.discarded'))}</span>`
        : e.status === 'pending' ? `<span class="tag">${esc(t('journal.pending'))}</span>` : '';
    return `<div class="e ${e.status}"><span class="t">${esc(time(e.created_at))}</span><div class="d"><span>${esc(describe(e))}</span><small>${esc(e.admin ?? '')}</small></div>${badge}</div>`;
  }).join('');
  return `<div class="muted">${esc(t('journal.hint'))}</div>
    <div class="two"><button class="btn" data-undo ${j.canUndo && direct ? '' : 'disabled'}>${esc(t('journal.undoLast'))}</button><button class="btn" data-redo ${j.canRedo && direct ? '' : 'disabled'}>${esc(t('journal.redo'))}</button></div>
    <div class="log">${entries || `<div class="muted">${esc(t('journal.empty'))}</div>`}</div>`;
}

// ---------- bottom sheets ----------

function openSheet(kind, id) {
  sheet = { kind, id };
  const body = { match: sheetMatch, player: sheetPlayer, replace: sheetReplace, move: sheetMove, group: sheetGroup, slot: sheetSlot, settings: sheetSettings }[kind](id);
  if (body === null) { sheet = null; return; }
  $('sheet-root').innerHTML = `<div class="dim" data-close></div><div class="sheet"><div class="handle"></div>${body}</div>`;
}
function closeSheet() {
  sheet = null;
  $('sheet-root').innerHTML = '';
  if (deferred) render();
}

function sheetMatch(id) {
  const m = allMatches().get(id);
  if (!m) return null;
  const inQueue = T().queue.some((x) => x.id === id);
  const group = m.stage === 'group';
  sheet.winner = m.winner;
  sheet.balls = m.winner ? m.balls : null;
  let html = `<h3>${esc(t('sheet.match'))} · ${esc(matchLabel(m))}</h3><div class="vsline">${vs(m)}</div>`;
  if (m.forfeit) return `${html}<div class="card note">${esc(t('match.walkover'))}</div><button class="btn" data-close>${esc(t('close'))}</button>`;
  if (!m.p1 || !m.p2) return `${html}<button class="btn" data-close>${esc(t('close'))}</button>`;
  html += `<div class="field"><label>${esc(t('match.winner'))}</label><div class="seg" id="sh-winner">
    <button data-sh-winner="1" class="${m.winner === 1 ? 'on' : ''}">${esc(m.p1.name)}</button><button data-sh-winner="2" class="${m.winner === 2 ? 'on' : ''}">${esc(m.p2.name)}</button></div></div>`;
  if (group) {
    html += `<div class="field"><label>${esc(t('match.balls'))}</label><div class="balls" id="sh-balls">${[0, 1, 2, 3, 4, 5, 6, 7]
      .map((b) => `<button data-sh-balls="${b}" class="${m.winner && m.balls === b ? 'sel' : ''}">${b}</button>`).join('')}</div></div>`;
  }
  html += `<button class="btn primary" data-sh-save="${id}">${esc(t('match.record'))}</button>`;
  if (m.winner) html += `<button class="btn danger" data-sh-reopen="${id}">${esc(t('match.reopen'))}</button>`;
  if (inQueue) html += `<div class="two"><button class="btn" data-sh-now="${id}">${esc(t('match.playNow'))}</button><button class="btn" data-postpone="${id}">${esc(t('match.postpone'))}</button></div>`;
  return `${html}<button class="btn" data-close>${esc(t('cancel'))}</button>`;
}

function sheetPlayer(id) {
  const p = T().players.find((x) => x.id === id);
  if (!p) return null;
  const tr = T();
  let html = `<h3>${esc(t('sheet.player'))}</h3>
    <div class="field"><label>${esc(t('player.name'))}</label><input class="text" id="sh-name" value="${esc(p.name)}" maxlength="40"></div>
    <button class="btn primary" data-sh-rename-player="${id}">${esc(t('save'))}</button>`;
  if (!tr.started) {
    html += `<div class="field"><label>${esc(t('player.group'))}</label><select class="text" id="sh-group">
      <option value="">—</option>${tr.groups.map((g) => `<option value="${g.id}" ${g.id === p.groupId ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></div>
      <button class="btn" data-sh-move="${id}">${esc(t('save'))}</button>
      <button class="btn danger" data-sh-remove-player="${id}">${esc(t('delete'))}</button>`;
  } else {
    // Group stage: replace the player, or send them to another group (their results are annulled).
    if (tr.phase === 'groups') {
      html += `<button class="btn" data-open="replace" data-id="${id}">${esc(t('player.replace'))}</button>`;
      if (!p.withdrawn && tr.groups.length > 1) html += `<button class="btn" data-open="move" data-id="${id}">${esc(t('player.moveGroup'))}</button>`;
    }
    if (p.withdrawn) html += `<button class="btn" data-sh-restore="${id}">${esc(t('player.restore'))}</button>`;
    else if (tr.phase !== 'finished') html += `<button class="btn danger" data-sh-withdraw="${id}">${esc(t('player.withdraw'))}</button>`;
  }
  return `${html}<button class="btn" data-close>${esc(t('cancel'))}</button>`;
}

function sheetReplace(id) {
  const p = T().players.find((x) => x.id === id);
  if (!p || T().phase !== 'groups') return null;
  // Swapping with a player of another group: neither of the two may be withdrawn.
  const others = p.withdrawn ? [] : T().players.filter((x) => x.groupId && x.groupId !== p.groupId && !x.withdrawn);
  const options = T().groups.filter((g) => g.id !== p.groupId).map((g) => {
    const list = others.filter((x) => x.groupId === g.id);
    return list.length ? `<optgroup label="${esc(g.name)}">${list.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</optgroup>` : '';
  }).join('');
  return `<h3>${esc(t('replace.title', { name: p.name }))}</h3>
    <div class="muted">${esc(t('replace.hint', { name: p.name, group: groupName(p.groupId) }))}</div>
    <div class="field"><label>${esc(t('replace.new'))}</label><input class="text" id="sh-new" maxlength="40" placeholder="${esc(t('groups.playerName'))}"></div>
    ${options ? `<div class="field"><label>${esc(t('replace.other'))}</label><select class="text" id="sh-with"><option value="">—</option>${options}</select>
      <div class="muted">${esc(t('replace.otherHint'))}</div></div>` : ''}
    <button class="btn primary" data-sh-replace="${id}">${esc(t('replace.do'))}</button>
    <button class="btn" data-close>${esc(t('cancel'))}</button>`;
}

function sheetMove(id) {
  const p = T().players.find((x) => x.id === id);
  if (!p || T().phase !== 'groups') return null;
  const groups = T().groups.filter((g) => g.id !== p.groupId);
  return `<h3>${esc(t('move.title', { name: p.name }))}</h3>
    <div class="muted">${esc(t('move.hint', { name: p.name, group: groupName(p.groupId) }))}</div>
    <div class="field"><label>${esc(t('player.group'))}</label><select class="text" id="sh-to">${groups.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div>
    <button class="btn primary" data-sh-move-started="${id}">${esc(t('move.do'))}</button>
    <button class="btn" data-close>${esc(t('cancel'))}</button>`;
}

function sheetGroup(id) {
  const g = T().groups.find((x) => x.id === id);
  if (!g) return null;
  return `<h3>${esc(t('sheet.group'))}</h3>
    <div class="field"><label>${esc(t('group.name'))}</label><input class="text" id="sh-name" value="${esc(g.name)}" maxlength="40"></div>
    <button class="btn primary" data-sh-rename-group="${id}">${esc(t('save'))}</button>
    ${T().started ? '' : `<button class="btn danger" data-sh-remove-group="${id}">${esc(t('delete'))}</button>`}
    <button class="btn" data-close>${esc(t('cancel'))}</button>`;
}

function sheetSlot(slot) {
  const m = T().playoff?.[slot];
  const active = T().players.filter((p) => !p.withdrawn);
  const options = (sel) => `<option value="">${esc(t('playoff.tbd'))}</option>${active.map((p) => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}`;
  return `<h3>${esc(t(`slot.${slot}`))}</h3>
    <select class="text" id="sh-p1">${options(m?.p1?.id)}</select>
    <select class="text" id="sh-p2">${options(m?.p2?.id)}</select>
    <button class="btn primary" data-sh-slot="${slot}">${esc(t('save'))}</button>
    ${m?.manual ? `<button class="btn" data-sh-auto="${slot}">${esc(t('playoff.auto'))}</button>` : ''}
    <button class="btn" data-close>${esc(t('cancel'))}</button>`;
}

function sheetSettings() {
  return `<h3>${esc(t('sheet.settings'))}</h3>
    <div class="muted">${esc(t('settings.signedIn', { name: me?.username ?? '' }))}</div>
    <a class="btn" href="/board" target="_blank">${esc(t('settings.board'))}</a>
    <button class="btn danger" data-new-tournament>${esc(t('settings.newTournament'))}</button>
    <button class="btn" data-logout>${esc(t('settings.logout'))}</button>
    <button class="btn" data-close>${esc(t('close'))}</button>`;
}

// ---------- events ----------

document.addEventListener('click', async (e) => {
  const el = e.target.closest('button, [data-open], [data-close], a');
  if (!el) return;
  const d = el.dataset;
  if (d.tab) { tab = d.tab; store('tab', tab); window.scrollTo(0, 0); render(); return; }
  if (d.lang) { setLang(d.lang); render(); if (sheet) openSheet(sheet.kind, sheet.id); return; }
  if (el.id === 'undo' || d.undo !== undefined) { post('/api/admin/undo'); return; }
  if (el.id === 'redo' || d.redo !== undefined) { post('/api/admin/redo'); return; }
  if (el.id === 'menu') { openSheet('settings'); return; }
  if (d.close !== undefined) { closeSheet(); return; }
  if (d.open) { openSheet(d.open, d.id); return; }

  // result entry on the game tab
  if (d.pick) {
    const w = Number(d.pick);
    ui.pick = ui.pick?.matchId === d.id && ui.pick.winner === w ? null : { matchId: d.id, winner: w };
    ui.balls = null;
    render();
    return;
  }
  if (d.balls !== undefined && tab === 'game' && !sheet) { ui.balls = Number(d.balls); render(); return; }
  if (d.confirm) {
    const body = { id: d.confirm, winner: ui.pick.winner, balls: ui.balls ?? 0 };
    el.disabled = true;
    if (await act('match.result', body)) { ui.pick = null; ui.balls = null; }
    else el.disabled = false;
    return;
  }
  if (d.postpone) { await act('queue.postpone', { id: d.postpone }); if (sheet) closeSheet(); return; }

  // setup
  if (d.addGroup !== undefined) { act('group.add', { id: uuid(), name: nextGroupName() }); return; }
  if (d.start !== undefined) { if (confirm(t('groups.startConfirm'))) act('tournament.start', {}); return; }

  // match sheet
  if (d.shWinner) { sheet.winner = Number(d.shWinner); el.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === el)); return; }
  if (d.shBalls !== undefined) { sheet.balls = Number(d.shBalls); el.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b === el)); return; }
  if (d.shSave) {
    const m = allMatches().get(d.shSave);
    if (!sheet.winner) { toast(t('err.bad_winner'), true); return; }
    if (m.stage === 'group' && sheet.balls === null) { toast(t('err.bad_balls', { max: 7 }), true); return; }
    if (await act('match.result', { id: d.shSave, winner: sheet.winner, balls: sheet.balls ?? 0 })) closeSheet();
    return;
  }
  if (d.shReopen) { if (confirm(t('match.reopenConfirm')) && await act('match.reopen', { id: d.shReopen })) closeSheet(); return; }
  if (d.shNow) { if (await act('queue.move', { id: d.shNow, to: 0 })) closeSheet(); return; }

  // player / group sheets
  const nameVal = () => $('sh-name')?.value ?? '';
  if (d.shRenamePlayer) { if (await act('player.rename', { id: d.shRenamePlayer, name: nameVal() })) closeSheet(); return; }
  if (d.shMove) { if (await act('player.move', { id: d.shMove, groupId: $('sh-group').value || null })) closeSheet(); return; }
  if (d.shRemovePlayer) { if (confirm(t('player.deleteConfirm', { name: playerName(d.shRemovePlayer) })) && await act('player.remove', { id: d.shRemovePlayer })) closeSheet(); return; }
  if (d.shWithdraw) { if (confirm(t('player.withdrawConfirm', { name: playerName(d.shWithdraw) })) && await act('player.withdraw', { id: d.shWithdraw })) closeSheet(); return; }
  if (d.shRestore) { if (await act('player.restore', { id: d.shRestore })) closeSheet(); return; }
  if (d.shReplace) {
    const withId = $('sh-with')?.value || '';
    const name = $('sh-new').value.trim();
    if (!withId && !name) { toast(t('err.name_required'), true); return; }
    const old = playerName(d.shReplace);
    const ask = withId ? t('replace.swapConfirm', { old, name: playerName(withId) }) : t('replace.confirm', { old, name });
    if (!confirm(ask)) return;
    const payload = withId ? { id: d.shReplace, withId } : { id: d.shReplace, newId: uuid(), name };
    if (await act('player.replace', payload)) closeSheet();
    return;
  }
  if (d.shMoveStarted) {
    const groupId = $('sh-to').value;
    if (!confirm(t('move.confirm', { name: playerName(d.shMoveStarted), group: groupName(groupId) }))) return;
    if (await act('player.move', { id: d.shMoveStarted, groupId })) closeSheet();
    return;
  }
  if (d.shRenameGroup) { if (await act('group.rename', { id: d.shRenameGroup, name: nameVal() })) closeSheet(); return; }
  if (d.shRemoveGroup) { if (confirm(t('group.deleteConfirm', { name: groupName(d.shRemoveGroup) })) && await act('group.remove', { id: d.shRemoveGroup })) closeSheet(); return; }
  if (d.shSlot) { if (await act('playoff.set', { slot: d.shSlot, p1: $('sh-p1').value || null, p2: $('sh-p2').value || null })) closeSheet(); return; }
  if (d.shAuto) { if (await act('playoff.auto', { slot: d.shAuto })) closeSheet(); return; }

  // settings
  if (d.newTournament !== undefined) { if (confirm(t('settings.newConfirm')) && await post('/api/admin/tournaments')) closeSheet(); return; }
  if (d.logout !== undefined) { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/admin/login.html'; }
});

document.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-add-player]');
  if (!form) return;
  e.preventDefault();
  const input = form.querySelector('input');
  const name = input.value;
  input.blur();
  if (await act('player.add', { id: uuid(), name, groupId: form.dataset.addPlayer })) {
    render();
    // keep typing names into the same group
    document.querySelector(`form[data-add-player="${form.dataset.addPlayer}"] input`)?.focus();
  } else {
    input.focus();
  }
});

document.addEventListener('focusout', () => setTimeout(() => { if (deferred && !document.activeElement?.closest('#view input')) render(); }, 0));

// ---------- start ----------

setLang(lang());
api('/api/auth/me').then((r) => r.json()).then((x) => { me = x; }).catch(() => {});
function refresh() {
  compose();
  if (!S) return;
  if (ui.pick && !S.tournament.queue.some((m) => m.id === ui.pick.matchId)) { ui.pick = null; ui.balls = null; }
  render();
}

function onState(state) {
  server = state;
  store('adminState', JSON.stringify(state)); // to open the page without a connection
  refresh();
}

const cached = loadJson('adminState', null);
if (cached?.raw) onState(cached);
const conn = live({
  stateUrl: '/api/admin/state',
  onState: (state) => { onState(state); flush(); },
  onStatus: (on) => {
    if (on === online) return;
    online = on;
    showStatus();
    if (on) flush();
  },
});
window.addEventListener('online', flush);
showStatus();
// The service worker keeps the page's files, so it opens even when the phone reloads the tab offline.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/admin/sw.js').catch(() => {});
