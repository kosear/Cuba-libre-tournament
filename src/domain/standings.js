// Group tables, tie resolution and who goes to the play-off.
//
// Ranking: wins, then balls. Players still equal are separated by NEW tie-break matches
// (each with each), but only when the tie decides who goes to the play-off.
// If the tie only decides the semi-final pairing, a lottery decides.
import { hashSeed, shuffle } from './random.js';

export const MAX_BALLS = 7;

/** Rounded average of balls left on the table over all real (non-forfeit) group results. */
export function averageBalls(state) {
  const real = Object.values(state.matches).filter((m) => m.stage === 'group' && m.winner && !m.forfeit);
  if (!real.length) return 0;
  const avg = real.reduce((s, m) => s + m.balls, 0) / real.length;
  return Math.floor(avg + 0.5);
}

/** Balls credited for a finished group match, and whether the value is still provisional. */
export function matchBalls(state, m) {
  if (!m.forfeit) return { balls: m.balls, approx: false };
  if (m.avgFrozen !== null && m.avgFrozen !== undefined) return { balls: m.avgFrozen, approx: false };
  return { balls: averageBalls(state), approx: true };
}

export const winnerOf = (m) => (m.winner === 1 ? m.p1 : m.winner === 2 ? m.p2 : null);
export const loserOf = (m) => (m.winner === 1 ? m.p2 : m.winner === 2 ? m.p1 : null);

export function groupMatches(state, groupId) {
  return Object.values(state.matches).filter((m) => m.stage === 'group' && m.groupId === groupId);
}

export function groupPlayers(state, groupId) {
  return state.playerOrder.map((id) => state.players[id]).filter((p) => p.groupId === groupId);
}

export function isGroupDone(state, groupId) {
  return groupMatches(state, groupId).every((m) => m.winner);
}

/** Raw stats of every player of a group: frames, wins, balls. */
export function groupStats(state, groupId) {
  const rows = new Map(groupPlayers(state, groupId).map((p) => [p.id, {
    id: p.id, name: p.name, out: !!p.withdrawn, frames: 0, wins: 0, balls: 0, approx: false,
  }]));
  for (const m of groupMatches(state, groupId)) {
    if (!m.winner) continue;
    const w = rows.get(winnerOf(m));
    const l = rows.get(loserOf(m));
    if (w) {
      w.frames++;
      w.wins++;
      const b = matchBalls(state, m);
      w.balls += b.balls;
      if (b.approx) w.approx = true;
    }
    if (l) l.frames++;
  }
  return [...rows.values()];
}

const cmpStats = (a, b) => b.wins - a.wins || b.balls - a.balls;

/** Split a sorted list into clusters of equal stats. */
function clusters(sorted, cmp) {
  const out = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && cmp(last[0], r) === 0) last.push(r);
    else out.push([r]);
  }
  return out;
}

export const tbKey = (ids) => [...ids].sort().join(',');

/**
 * Resolve a tie between `ids` with tie-break matches.
 * Returns ordered segments: [{ ids:[...], resolved:boolean, need?:{ids, round}, waiting?:boolean }].
 * Only sub-ties that straddle one of `cutoffs` (relative to the segment start) are resolved further.
 */
export function resolveTie(state, ids, cutoffs, ctx) {
  const key = tbKey(ids);
  ctx?.keys.add(key);
  const tbs = Object.values(state.matches).filter((m) => m.stage === 'tiebreak' && m.tbKey === key);
  for (let round = 1; ; round++) {
    const ms = tbs.filter((m) => m.tbRound === round);
    if (!ms.length) return [{ ids, resolved: false, need: { ids, round } }];
    if (ms.some((m) => !m.winner)) return [{ ids, resolved: false, waiting: true }];
    const wins = new Map(ids.map((id) => [id, 0]));
    for (const m of ms) {
      const w = winnerOf(m);
      if (wins.has(w)) wins.set(w, wins.get(w) + 1);
    }
    const sorted = [...ids].sort((a, b) => wins.get(b) - wins.get(a));
    const buckets = clusters(sorted.map((id) => ({ id, w: wins.get(id) })), (a, b) => b.w - a.w);
    if (buckets.length === 1) continue; // full cycle: play another round
    const out = [];
    let pos = 0;
    for (const bucket of buckets) {
      const bIds = bucket.map((x) => x.id);
      const start = pos;
      const end = pos + bIds.length - 1;
      pos = end + 1;
      if (bIds.length === 1) { out.push({ ids: bIds, resolved: true }); continue; }
      const inner = cutoffs.filter((c) => c > start && c <= end).map((c) => c - start);
      if (inner.length) out.push(...resolveTie(state, bIds, inner, ctx));
      else out.push({ ids: bIds, resolved: true, tied: true });
    }
    return out;
  }
}

/**
 * Rank rows (players with stats). Ties straddling one of `cutoffs` (number of places that go through)
 * are resolved with tie-break matches. Returns { segments, order } where order is the flat list of rows.
 */
export function rank(state, rows, cutoffs, cmp = cmpStats, ctx = undefined) {
  const sorted = [...rows].sort((a, b) => cmp(a, b) || a.name.localeCompare(b.name));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const segments = [];
  let pos = 0;
  for (const cl of clusters(sorted, cmp)) {
    const start = pos;
    const end = pos + cl.length - 1;
    pos = end + 1;
    const ids = cl.map((r) => r.id);
    if (cl.length === 1) { segments.push({ ids, resolved: true }); continue; }
    const inner = cutoffs.filter((c) => c > start && c <= end).map((c) => c - start);
    if (inner.length) segments.push(...resolveTie(state, ids, inner, ctx));
    else segments.push({ ids, resolved: true, tied: true });
  }
  return { segments, order: segments.flatMap((s) => s.ids.map((id) => byId.get(id))) };
}

/** Group table in display order: active players ranked, withdrawn players at the bottom. */
export function groupTable(state, groupId) {
  const stats = groupStats(state, groupId);
  const active = stats.filter((r) => !r.out);
  const out = stats.filter((r) => r.out);
  const n = state.groups.length;
  const cutoffs = n === 1 ? [4] : n === 2 ? [1, 2] : n === 3 ? [1, 2] : [1];
  const ranked = rank(state, active, cutoffs).order;
  return [...ranked, ...out.sort((a, b) => a.name.localeCompare(b.name))];
}

/** Order players of a tied segment for seeding: lottery with a deterministic seed. */
function lottery(state, ids) {
  return ids.length > 1 ? shuffle([...ids].sort(), hashSeed(state.seed, 'lottery', tbKey(ids))) : ids;
}

/** Flatten segments into ids, breaking remaining ties by lottery. */
function seededIds(state, segments) {
  return segments.flatMap((s) => (s.ids.length > 1 ? lottery(state, s.ids) : s.ids));
}

/** Collect unresolved segments straddling cutoffs (they block qualification). */
function blockers(segments, cutoffs) {
  const out = [];
  let pos = 0;
  for (const s of segments) {
    const start = pos;
    const end = pos + s.ids.length - 1;
    pos = end + 1;
    if (!s.resolved && cutoffs.some((c) => c > start && c <= end)) out.push(s);
  }
  return out;
}

/**
 * Who goes to the semi-finals.
 * Returns { status: 'ready', semis: [[a,b],[c,d]] }
 *       | { status: 'tiebreak', needs: [{ids, round}] } (tie-break matches to create; others may still be pending)
 *       | { status: 'waiting' } (only pending tie-break matches) | { status: 'impossible' } (not enough players)
 */
export function qualification(state) {
  const groups = state.groups;
  const n = groups.length;
  if (!n) return { status: 'impossible', keys: new Set() };
  // Players withdrawn during the play-off keep their group result (they lose by walkover instead).
  const tables = groups.map((g) => groupStats(state, g.id).filter((r) => !r.out || state.players[r.id].withdrawnStage === 'playoff'));
  const ctx = { keys: new Set() }; // tie-break keys that are still relevant
  const R = (rows, cutoffs, cmp = cmpStats) => rank(state, rows, cutoffs, cmp, ctx);
  const issues = [];
  const block = (segments, cutoffs) => issues.push(...blockers(segments, cutoffs));
  const cross = (a, b) => cmpStats(a, b);
  let semis;

  if (n === 1) {
    if (tables[0].length < 4) return { status: 'impossible', keys: new Set() };
    const r = R(tables[0], [4]);
    block(r.segments, [4]);
    if (!issues.length) {
      const top = seededIds(state, r.segments).slice(0, 4);
      semis = [[top[0], top[3]], [top[1], top[2]]];
    }
  } else if (n === 2) {
    if (tables.some((t) => t.length < 2)) return { status: 'impossible', keys: new Set() };
    const r = tables.map((t) => R(t, [2]));
    r.forEach((x) => block(x.segments, [2]));
    if (!issues.length) {
      const [a, b] = r.map((x) => seededIds(state, x.segments));
      semis = [[a[0], b[1]], [b[0], a[1]]];
    }
  } else {
    if (tables.some((t) => !t.length) || (n === 3 && tables.every((t) => t.length < 2))) return { status: 'impossible', keys: new Set() };
    const r = tables.map((t) => R(t, [1]));
    r.forEach((x) => block(x.segments, [1]));
    if (!issues.length) {
      const winners = r.map((x) => x.order[0]);
      if (n === 3) {
        // Best second place: compare every player tied for second place in each group.
        const seconds = r.flatMap((x) => (x.segments[1] ? x.segments[1].ids.map((id) => x.order.find((o) => o.id === id)) : []));
        const pool = R(seconds, [1], cross);
        block(pool.segments, [1]);
        if (!issues.length) {
          const wild = pool.order[0];
          const w = seededIds(state, R(winners, [], cross).segments).map((id) => winners.find((x) => x.id === id));
          const own = (p) => state.players[p.id].groupId;
          semis = own(w[0]) === own(wild)
            ? [[w[1].id, wild.id], [w[0].id, w[2].id]]
            : [[w[0].id, wild.id], [w[1].id, w[2].id]];
        }
      } else {
        const pool = R(winners, n > 4 ? [4] : [], cross);
        if (n > 4) block(pool.segments, [4]);
        if (!issues.length) {
          const top = seededIds(state, pool.segments).slice(0, 4);
          semis = [[top[0], top[3]], [top[1], top[2]]];
        }
      }
    }
  }

  if (issues.length) {
    const needs = issues.filter((s) => s.need).map((s) => s.need);
    if (!needs.length) return { status: 'waiting', keys: ctx.keys };
    return { status: 'tiebreak', needs, keys: ctx.keys };
  }
  return { status: 'ready', semis, keys: ctx.keys };
}
