// Snapshot of the tournament for screens: everything already computed, no rules on the client.
import { PLAYOFF_SLOTS } from './engine.js';
import { groupStats, groupTable, groupMatches, isGroupDone, matchBalls, qualification, rank, winnerOf, loserOf } from './standings.js';

const ROUND_LABEL = { sf1: 'Semi-final 1', sf2: 'Semi-final 2', third: '3rd place', final: 'Final' };

function playerRef(s, id) {
  if (!id) return null;
  const p = s.players[id];
  return p ? { id: p.id, name: p.name, withdrawn: !!p.withdrawn } : null;
}

export function matchView(s, m) {
  const group = m.groupId ? s.groups.find((g) => g.id === m.groupId) : null;
  const b = m.stage === 'group' && m.winner ? matchBalls(s, m) : { balls: 0, approx: false };
  return {
    id: m.id,
    stage: m.stage,
    round: m.round,
    groupId: m.groupId,
    label: m.stage === 'playoff' ? ROUND_LABEL[m.round] : m.stage === 'tiebreak' ? 'Tie-break' : group?.name ?? '',
    p1: playerRef(s, m.p1),
    p2: playerRef(s, m.p2),
    winner: m.winner,
    balls: b.balls,
    approx: b.approx,
    forfeit: m.forfeit,
    finishedSeq: m.finishedSeq,
  };
}

/** Players tied for first place who can still go through get the trophy. */
function leaders(s, groupId, active) {
  if (!active.some((r) => r.wins > 0)) return new Set();
  const first = rank(s, active, [1]).segments[0];
  return new Set(first.ids);
}

function groupView(s, g) {
  const table = groupTable(s, g.id);
  const active = groupStats(s, g.id).filter((r) => !r.out);
  const lead = leaders(s, g.id, active);
  const matches = groupMatches(s, g.id);
  const cross = {};
  for (const r of table) {
    cross[r.id] = {};
    for (const c of table) {
      if (r.id === c.id) continue;
      const m = matches.find((x) => (x.p1 === r.id && x.p2 === c.id) || (x.p1 === c.id && x.p2 === r.id));
      if (!m?.winner) { cross[r.id][c.id] = null; continue; }
      const won = winnerOf(m) === r.id;
      const b = matchBalls(s, m);
      cross[r.id][c.id] = won ? { win: true, balls: b.balls, approx: b.approx } : { win: false };
    }
  }
  return {
    id: g.id,
    name: g.name,
    done: isGroupDone(s, g.id),
    played: matches.filter((m) => m.winner).length,
    total: matches.length,
    rows: table.map((r) => ({ ...r, leader: lead.has(r.id) })),
    cross,
  };
}

function statsFor(s, pid) {
  const p = s.players[pid];
  if (!p?.groupId) return null;
  const r = groupStats(s, p.groupId).find((x) => x.id === pid);
  return r ? { frames: r.frames, wins: r.wins, balls: r.balls, approx: r.approx } : null;
}

export function snapshot(s) {
  const queue = s.queue.map((id) => matchView(s, s.matches[id]));
  const withStats = (mv) => mv && { ...mv, p1Stats: statsFor(s, mv.p1?.id), p2Stats: statsFor(s, mv.p2?.id) };
  const results = Object.values(s.matches)
    .filter((m) => m.winner)
    .sort((a, b) => b.finishedSeq - a.finishedSeq)
    .map((m) => matchView(s, m));

  let playoff = null;
  if (s.matches.sf1) {
    playoff = {};
    for (const slot of PLAYOFF_SLOTS) playoff[slot] = { ...matchView(s, s.matches[slot]), manual: !!s.overrides[slot] };
  }
  let podium = null;
  const final = s.matches.final;
  if (final?.winner) {
    const third = s.matches.third;
    podium = [
      playerRef(s, winnerOf(final)),
      playerRef(s, loserOf(final)),
      third?.winner ? playerRef(s, winnerOf(third)) : null,
    ];
  }

  let qual = null;
  if (s.started && !s.matches.sf1 && s.groups.every((g) => isGroupDone(s, g.id))) {
    const q = qualification(s);
    qual = { status: q.status };
  }

  return {
    phase: s.phase,
    started: s.started,
    groups: s.groups.map((g) => groupView(s, g)),
    players: s.playerOrder.map((id) => ({ ...s.players[id] })),
    queue,
    current: withStats(queue[0] ?? null),
    next: queue[1] ?? null,
    results,
    playoff,
    podium,
    qualification: qual,
  };
}
