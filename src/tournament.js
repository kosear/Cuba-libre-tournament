// Action log storage: the current tournament, its actions, undo/redo.
// The tournament state is never stored, it is rebuilt from the active actions (and cached in memory).
import crypto from 'node:crypto';
import { db } from './db.js';
import { applyInPlace, initialState, actionKeys, DomainError } from './domain/engine.js';

const JOURNAL_LIMIT = 300;

let cache = null; // { tournamentId, version, state }

export function currentTournamentId() {
  const row = db.prepare('SELECT id FROM tournaments ORDER BY id DESC LIMIT 1').get();
  if (row) return row.id;
  return db.prepare('INSERT INTO tournaments DEFAULT VALUES').run().lastInsertRowid;
}

function activeActions(tid) {
  return db.prepare("SELECT type, payload FROM actions WHERE tournament_id = ? AND status = 'active' ORDER BY id").all(tid)
    .map((r) => ({ type: r.type, payload: JSON.parse(r.payload) }));
}

function version(tid) {
  const r = db.prepare(`SELECT COUNT(*) n, COALESCE(MAX(id), 0) last,
    COALESCE(SUM(CASE WHEN status = 'active' THEN id ELSE 0 END), 0) active FROM actions WHERE tournament_id = ?`).get(tid);
  return `${tid}:${r.n}:${r.last}:${r.active}`;
}

/** Current tournament state (rebuilt from the log when it changed). */
export function getTournamentState() {
  const tid = currentTournamentId();
  const v = version(tid);
  if (cache?.version === v) return cache.state;
  let state = initialState();
  for (const a of activeActions(tid)) {
    // An action that the current rules no longer allow (the engine changed after it was stored) is skipped,
    // so one old action cannot take the whole site down. It stays in the log.
    const next = structuredClone(state);
    try {
      applyInPlace(next, a);
      state = next;
    } catch (err) {
      if (!(err instanceof DomainError)) throw err;
      console.warn(`[log] skipped ${a.type}: ${err.code}`);
    }
  }
  cache = { tournamentId: tid, version: v, state };
  return state;
}

/** Id of the newest action of the tournament (any status): the version the admin page saw. */
export function logHead(tid = currentTournamentId()) {
  return db.prepare('SELECT COALESCE(MAX(id), 0) head FROM actions WHERE tournament_id = ?').get(tid).head;
}

/**
 * An action made on top of an old view (offline, or two admins at once) is rejected
 * when another admin has since changed the same thing.
 */
function checkConflict(tid, base, adminId, type, payload) {
  const keys = new Set(actionKeys(type, payload));
  if (!keys.size) return;
  const newer = db.prepare("SELECT type, payload FROM actions WHERE tournament_id = ? AND id > ? AND status = 'active' AND admin_id IS NOT ?")
    .all(tid, base, adminId ?? null);
  for (const a of newer) {
    if (actionKeys(a.type, JSON.parse(a.payload)).some((k) => keys.has(k))) throw new DomainError('conflict');
  }
}

// Actions whose outcome depends on chance (lottery, queue positions of a late player).
const SEEDED = new Set(['tournament.start', 'player.add', 'player.replace', 'player.move']);

/** Fill in server-side parts of a payload (random seeds). */
function withSeeds(type, payload) {
  const p = { ...payload };
  if (SEEDED.has(type) && p.seed === undefined) p.seed = crypto.randomInt(2 ** 31);
  return p;
}

/**
 * Validate and store a new action. Idempotent by clientId: sending the same action twice
 * (e.g. a retry from a phone that lost connection) stores it once.
 * @returns {{ duplicate: boolean }}
 * @throws DomainError
 */
export function addAction({ clientId, type, payload, adminId, base, tournamentId }) {
  const cid = String(clientId || '').slice(0, 64) || crypto.randomUUID();
  return db.transaction(() => {
    if (db.prepare('SELECT 1 FROM actions WHERE client_id = ?').get(cid)) return { duplicate: true };
    const tid = currentTournamentId();
    if (tournamentId !== undefined && Number(tournamentId) !== tid) throw new DomainError('tournament_changed');
    const p = withSeeds(String(type), payload && typeof payload === 'object' ? payload : {});
    if (base !== undefined) checkConflict(tid, Number(base) || 0, adminId, String(type), p);
    const state = structuredClone(getTournamentState());
    applyInPlace(state, { type: String(type), payload: p }); // throws if not allowed
    db.prepare("UPDATE actions SET status = 'discarded' WHERE tournament_id = ? AND status = 'undone'").run(tid);
    db.prepare('INSERT INTO actions (tournament_id, client_id, admin_id, type, payload) VALUES (?, ?, ?, ?, ?)')
      .run(tid, cid, adminId ?? null, String(type), JSON.stringify(p));
    return { duplicate: false };
  })();
}

export function undo() {
  const tid = currentTournamentId();
  const last = db.prepare("SELECT id FROM actions WHERE tournament_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1").get(tid);
  if (!last) throw new DomainError('nothing_to_undo');
  db.prepare("UPDATE actions SET status = 'undone' WHERE id = ?").run(last.id);
}

export function redo() {
  const tid = currentTournamentId();
  const next = db.prepare("SELECT id FROM actions WHERE tournament_id = ? AND status = 'undone' ORDER BY id LIMIT 1").get(tid);
  if (!next) throw new DomainError('nothing_to_redo');
  db.prepare("UPDATE actions SET status = 'active' WHERE id = ?").run(next.id);
}

export function newTournament(adminId) {
  db.prepare('INSERT INTO tournaments (created_by) VALUES (?)').run(adminId ?? null);
}

/** Action log for the admin journal, newest first, plus names of every player and group ever mentioned. */
export function journal() {
  const tid = currentTournamentId();
  const rows = db.prepare(`
    SELECT a.id, a.type, a.payload, a.status, a.created_at, ad.username AS admin
    FROM actions a LEFT JOIN admins ad ON ad.id = a.admin_id
    WHERE a.tournament_id = ? ORDER BY a.id DESC LIMIT ?`).all(tid, JOURNAL_LIMIT);
  const names = {};
  for (const r of db.prepare("SELECT type, payload FROM actions WHERE tournament_id = ? AND type IN ('player.add', 'player.rename', 'player.replace', 'group.add', 'group.rename') ORDER BY id").all(tid)) {
    const p = JSON.parse(r.payload);
    const id = p.newId ?? p.id; // player.replace names the new player newId
    if (id && p.name) names[id] = p.name;
  }
  const entries = rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) }));
  return {
    entries,
    names,
    canUndo: entries.some((e) => e.status === 'active'),
    canRedo: entries.some((e) => e.status === 'undone'),
  };
}
