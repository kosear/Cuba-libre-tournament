// Tournament engine: the whole state is computed from the admin action log.
// applyAction() validates one action and returns the new state; buildState() replays a log.
// After every action, progress() runs the automatic parts: tie-break matches, play-off bracket,
// walkovers, frozen average balls for withdrawn players. Everything here is deterministic.
import { roundRobinPairs, interleave, lateInsertPositions } from './schedule.js';
import { MAX_BALLS, averageBalls, groupMatches, groupPlayers, isGroupDone, qualification, tbKey, winnerOf, loserOf } from './standings.js';

export class DomainError extends Error {
  constructor(code, params = {}) {
    super(code);
    this.code = code;
    this.params = params;
  }
}

export const PLAYOFF_SLOTS = ['sf1', 'sf2', 'third', 'final'];
const MAX_NAME = 40;

export function initialState() {
  return {
    started: false,
    phase: 'setup', // setup | groups | playoff | finished
    seed: 0,
    groups: [], // [{ id, name }]
    players: {}, // id -> { id, name, groupId, withdrawn }
    playerOrder: [],
    matches: {}, // id -> match
    queue: [], // pending match ids; [0] is being played now, [1] is next
    overrides: {}, // play-off slot -> { p1, p2 } set by hand
    seq: { match: 0, finish: 0 },
  };
}

/** Apply one action to a copy of the state. Throws DomainError if the action is not allowed. */
export function applyAction(state, action) {
  const s = structuredClone(state);
  applyInPlace(s, action);
  return s;
}

export function applyInPlace(s, action) {
  const handler = handlers[action.type];
  if (!handler) throw new DomainError('unknown_action', { type: action.type });
  handler(s, action.payload || {});
  progress(s);
}

/** Replay a list of actions ({ type, payload }) from scratch. */
export function buildState(actions) {
  const s = initialState();
  for (const a of actions) applyInPlace(s, a);
  return s;
}

/**
 * What an action changes, as keys like "match:sf1" or "player:p3". Two admins working offline
 * conflict when their actions share a key: the first one to reach the server wins.
 */
export function actionKeys(type, payload = {}) {
  const [entity] = String(type).split('.');
  switch (type) {
    case 'group.add':
    case 'player.add':
      return []; // new ids never clash
    case 'tournament.start':
      return ['tournament'];
    case 'queue.move':
    case 'queue.postpone':
      return [`match:${payload.id}`];
    case 'playoff.set':
    case 'playoff.auto':
      return [`match:${payload.slot}`];
    default:
      return [`${entity}:${payload.id}`];
  }
}

// ---------- helpers ----------

function cleanName(value) {
  const name = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!name) throw new DomainError('name_required');
  if (name.length > MAX_NAME) throw new DomainError('name_too_long', { max: MAX_NAME });
  return name;
}

function requireId(value) {
  const id = String(value ?? '').trim();
  if (!id || id.length > 64) throw new DomainError('bad_id');
  return id;
}

function getGroup(s, id) {
  const g = s.groups.find((x) => x.id === id);
  if (!g) throw new DomainError('group_not_found');
  return g;
}

function getPlayer(s, id) {
  const p = s.players[id];
  if (!p) throw new DomainError('player_not_found');
  return p;
}

function getMatch(s, id) {
  const m = s.matches[id];
  if (!m) throw new DomainError('match_not_found');
  return m;
}

function uniquePlayerName(s, name, exceptId) {
  const lower = name.toLowerCase();
  if (Object.values(s.players).some((p) => p.id !== exceptId && p.name.toLowerCase() === lower)) {
    throw new DomainError('player_name_taken', { name });
  }
}

function requirePhase(s, ...phases) {
  if (!phases.includes(s.phase)) throw new DomainError('wrong_phase', { phase: s.phase });
}

function newMatch(s, fields) {
  const id = `m${++s.seq.match}`;
  s.matches[id] = {
    id, stage: 'group', groupId: null, round: null, tbKey: null, tbRound: null,
    p1: null, p2: null, winner: null, balls: 0, forfeit: false, avgFrozen: null, orig: null, finishedSeq: null,
    ...fields,
  };
  return s.matches[id];
}

const removeFromQueue = (s, id) => { s.queue = s.queue.filter((x) => x !== id); };

function finish(s, m, winner, balls, forfeit = false) {
  m.winner = winner;
  m.balls = balls;
  m.forfeit = forfeit;
  if (m.finishedSeq === null) m.finishedSeq = ++s.seq.finish;
  removeFromQueue(s, m.id);
}

const involves = (m, pid) => m.p1 === pid || m.p2 === pid;

// ---------- action handlers ----------

const handlers = {
  'group.add'(s, p) {
    requirePhase(s, 'setup');
    const id = requireId(p.id);
    if (s.groups.some((g) => g.id === id)) throw new DomainError('duplicate_id');
    s.groups.push({ id, name: cleanName(p.name) });
  },

  'group.rename'(s, p) {
    getGroup(s, p.id).name = cleanName(p.name);
  },

  'group.remove'(s, p) {
    requirePhase(s, 'setup');
    getGroup(s, p.id);
    s.groups = s.groups.filter((g) => g.id !== p.id);
    for (const pl of Object.values(s.players)) if (pl.groupId === p.id) pl.groupId = null;
  },

  'player.add'(s, p) {
    requirePhase(s, 'setup', 'groups');
    const id = requireId(p.id);
    if (s.players[id]) throw new DomainError('duplicate_id');
    const name = cleanName(p.name);
    uniquePlayerName(s, name);
    const groupId = p.groupId ? getGroup(s, p.groupId).id : null;
    if (s.phase === 'groups' && !groupId) throw new DomainError('group_required');
    const opponents = groupId ? groupPlayers(s, groupId) : [];
    s.players[id] = { id, name, groupId, withdrawn: false };
    s.playerOrder.push(id);
    if (s.phase === 'groups') addLatePlayerMatches(s, id, groupId, opponents, Number(p.seed) || 0);
  },

  'player.rename'(s, p) {
    const pl = getPlayer(s, p.id);
    const name = cleanName(p.name);
    uniquePlayerName(s, name, pl.id);
    pl.name = name;
  },

  'player.move'(s, p) {
    requirePhase(s, 'setup');
    getPlayer(s, p.id).groupId = p.groupId ? getGroup(s, p.groupId).id : null;
  },

  'player.remove'(s, p) {
    requirePhase(s, 'setup');
    getPlayer(s, p.id);
    delete s.players[p.id];
    s.playerOrder = s.playerOrder.filter((x) => x !== p.id);
  },

  'player.withdraw'(s, p) {
    requirePhase(s, 'groups', 'playoff');
    const pl = getPlayer(s, p.id);
    if (pl.withdrawn) throw new DomainError('already_withdrawn');
    pl.withdrawn = true;
    // Withdrawn during the play-off: still counts for who went through, loses play-off matches by walkover.
    pl.withdrawnStage = s.phase;
    // Group stage: every opponent in the group gets a win, even if the withdrawn player had won.
    if (s.phase === 'groups') {
      for (const m of groupMatches(s, pl.groupId)) {
        if (!involves(m, pl.id) || m.forfeit) continue;
        m.orig = { winner: m.winner, balls: m.balls, finishedSeq: m.finishedSeq };
        finish(s, m, m.p1 === pl.id ? 2 : 1, 0, true);
      }
    }
    // Play-off walkovers are handled in progress().
  },

  'player.restore'(s, p) {
    const pl = getPlayer(s, p.id);
    if (!pl.withdrawn) throw new DomainError('not_withdrawn');
    pl.withdrawn = false;
    delete pl.withdrawnStage;
    for (const m of groupMatches(s, pl.groupId)) {
      if (!involves(m, pl.id) || !m.forfeit || !m.orig) continue;
      const other = s.players[m.p1 === pl.id ? m.p2 : m.p1];
      if (other?.withdrawn) continue;
      m.forfeit = false;
      m.avgFrozen = null;
      if (m.orig.winner) {
        Object.assign(m, { winner: m.orig.winner, balls: m.orig.balls, finishedSeq: m.orig.finishedSeq });
      } else {
        Object.assign(m, { winner: null, balls: 0, finishedSeq: null });
        s.queue.push(m.id);
      }
      m.orig = null;
    }
  },

  'tournament.start'(s, p) {
    requirePhase(s, 'setup');
    if (!s.groups.length) throw new DomainError('no_groups');
    const unassigned = Object.values(s.players).filter((pl) => !pl.groupId);
    if (unassigned.length) throw new DomainError('players_without_group', { count: unassigned.length });
    for (const g of s.groups) {
      if (groupPlayers(s, g.id).length < 2) throw new DomainError('group_too_small', { group: g.name });
    }
    if (s.groups.length === 1 && groupPlayers(s, s.groups[0].id).length < 4) throw new DomainError('need_four_players');
    s.seed = Number(p.seed) >>> 0;
    const perGroup = s.groups.map((g) => roundRobinPairs(groupPlayers(s, g.id).map((pl) => pl.id))
      .map(([a, b]) => ({ p1: a, p2: b, groupId: g.id })));
    for (const m of interleave(perGroup)) {
      const match = newMatch(s, { stage: 'group', groupId: m.groupId, p1: m.p1, p2: m.p2 });
      s.queue.push(match.id);
    }
    s.started = true;
  },

  'match.result'(s, p) {
    const m = getMatch(s, p.id);
    if (!m.p1 || !m.p2) throw new DomainError('players_unknown');
    if (m.forfeit) throw new DomainError('forfeit_locked');
    const winner = Number(p.winner);
    if (winner !== 1 && winner !== 2) throw new DomainError('bad_winner');
    let balls = 0;
    if (m.stage === 'group') {
      balls = Number(p.balls);
      if (!Number.isInteger(balls) || balls < 0 || balls > MAX_BALLS) throw new DomainError('bad_balls', { max: MAX_BALLS });
    }
    if (m.winner) {
      m.winner = winner; // editing a finished result keeps its place in history
      m.balls = balls;
    } else {
      finish(s, m, winner, balls);
    }
  },

  'match.reopen'(s, p) {
    const m = getMatch(s, p.id);
    if (!m.winner) throw new DomainError('not_finished');
    if (m.forfeit) throw new DomainError('forfeit_locked');
    Object.assign(m, { winner: null, balls: 0, finishedSeq: null });
    s.queue.unshift(m.id); // replayed right now
  },

  'queue.move'(s, p) {
    const m = getMatch(s, p.id);
    if (!s.queue.includes(m.id)) throw new DomainError('not_in_queue');
    removeFromQueue(s, m.id);
    const to = Math.max(0, Math.min(Number(p.to) || 0, s.queue.length));
    s.queue.splice(to, 0, m.id);
  },

  'queue.postpone'(s, p) {
    const i = s.queue.indexOf(p.id);
    if (i < 0) throw new DomainError('not_in_queue');
    if (i < s.queue.length - 1) [s.queue[i], s.queue[i + 1]] = [s.queue[i + 1], s.queue[i]];
  },

  'playoff.set'(s, p) {
    requirePhase(s, 'groups', 'playoff');
    if (!PLAYOFF_SLOTS.includes(p.slot)) throw new DomainError('bad_slot');
    const m = s.matches[p.slot];
    if (m?.winner) throw new DomainError('already_played');
    const pick = (v) => {
      if (!v) return null;
      const pl = getPlayer(s, v);
      if (pl.withdrawn) throw new DomainError('player_withdrawn');
      return pl.id;
    };
    const p1 = pick(p.p1);
    const p2 = pick(p.p2);
    if (p1 && p1 === p2) throw new DomainError('same_player');
    s.overrides[p.slot] = { p1, p2 };
  },

  'playoff.auto'(s, p) {
    if (!s.overrides[p.slot]) throw new DomainError('not_overridden');
    delete s.overrides[p.slot];
  },
};

/** Matches of a player who joins after the start: placed in the queue by the agreed rules. */
function addLatePlayerMatches(s, id, groupId, opponents, seed) {
  const catchUp = groupMatches(s, groupId).every((m) => m.winner);
  const pending = [];
  opponents.forEach((o, i) => {
    const m = newMatch(s, { stage: 'group', groupId, p1: i % 2 ? o.id : id, p2: i % 2 ? id : o.id });
    if (o.withdrawn) finish(s, m, m.p1 === id ? 1 : 2, 0, true);
    else pending.push(m.id);
  });
  const positions = lateInsertPositions(s.queue.length, pending.length, catchUp, seed);
  pending.forEach((mid, i) => s.queue.splice(positions[i], 0, mid));
}

// ---------- automatic progress ----------

function progress(s) {
  if (!s.started) { s.phase = 'setup'; return; }

  // Average balls for walkovers against a withdrawn player: provisional until the group is over, then frozen.
  const avg = averageBalls(s);
  for (const g of s.groups) {
    const done = isGroupDone(s, g.id);
    for (const m of groupMatches(s, g.id)) {
      if (!m.forfeit) continue;
      if (done && m.avgFrozen === null) m.avgFrozen = avg;
      if (!done) m.avgFrozen = null;
    }
  }

  const groupsDone = s.groups.every((g) => isGroupDone(s, g.id));
  const manualSemis = ['sf1', 'sf2'].every((k) => s.overrides[k]?.p1 && s.overrides[k]?.p2);
  const q = groupsDone && !manualSemis ? qualification(s) : null;

  // Tie-break matches: drop pending ones that no longer matter, create the ones now needed.
  for (const m of Object.values(s.matches)) {
    if (m.stage !== 'tiebreak' || m.winner) continue;
    const still = q && q.keys.has(m.tbKey) && !s.players[m.p1].withdrawn && !s.players[m.p2].withdrawn;
    if (!still) { delete s.matches[m.id]; removeFromQueue(s, m.id); }
  }
  if (q?.status === 'tiebreak') {
    for (const need of q.needs) {
      const key = tbKey(need.ids);
      const exists = Object.values(s.matches).some((m) => m.stage === 'tiebreak' && m.tbKey === key && m.tbRound === need.round);
      if (exists) continue;
      for (const [a, b] of roundRobinPairs([...need.ids].sort())) {
        const m = newMatch(s, { stage: 'tiebreak', p1: a, p2: b, tbKey: key, tbRound: need.round });
        s.queue.push(m.id);
      }
    }
  }

  // Play-off bracket.
  const hasOverride = Object.keys(s.overrides).length > 0;
  const playedPlayoff = PLAYOFF_SLOTS.some((k) => s.matches[k]?.winner);
  const ready = q?.status === 'ready';
  if (ready || manualSemis || hasOverride || playedPlayoff) {
    for (const slot of PLAYOFF_SLOTS) {
      if (!s.matches[slot]) {
        s.matches[slot] = {
          id: slot, stage: 'playoff', groupId: null, round: slot, tbKey: null, tbRound: null,
          p1: null, p2: null, winner: null, balls: 0, forfeit: false, avgFrozen: null, orig: null, finishedSeq: null,
        };
      }
    }
    // Participants (up to 3 passes: a walkover in a semi-final fills the final in the same update).
    for (let pass = 0; pass < 3; pass++) {
      PLAYOFF_SLOTS.forEach((slot, i) => {
        const m = s.matches[slot];
        if (m.winner) return;
        let pair;
        if (s.overrides[slot]) pair = [s.overrides[slot].p1, s.overrides[slot].p2];
        else if (i < 2) pair = ready ? q.semis[i] : [null, null];
        else {
          const pick = slot === 'final' ? winnerOf : loserOf;
          pair = [pick(s.matches.sf1), pick(s.matches.sf2)];
        }
        [m.p1, m.p2] = pair;
        // Walkover: a withdrawn player loses automatically.
        if (m.p1 && m.p2) {
          const w1 = s.players[m.p1].withdrawn;
          const w2 = s.players[m.p2].withdrawn;
          if (w1 !== w2) finish(s, m, w1 ? 2 : 1, 0, true);
        }
      });
    }
    for (const slot of PLAYOFF_SLOTS) {
      const m = s.matches[slot];
      const inQueue = s.queue.includes(slot);
      if (!m.winner && m.p1 && m.p2 && !inQueue) s.queue.push(slot);
      if ((!m.p1 || !m.p2) && inQueue) removeFromQueue(s, slot);
    }
  } else {
    for (const slot of PLAYOFF_SLOTS) {
      delete s.matches[slot];
      removeFromQueue(s, slot);
    }
  }

  s.phase = s.matches.final?.winner ? 'finished' : s.matches.sf1 ? 'playoff' : 'groups';
}
