// Snapshot of the tournament for screens: everything already computed, no rules on the client.
import { PLAYOFF_SLOTS } from './engine.js';
import { groupStats, groupTable, groupMatches, isGroupDone, matchBalls, qualification, rank, winnerOf, loserOf } from './standings.js';

const MAX_TIED_NAMES = 2; // a contender slot shows at most this many tied names, more -> the placeholder

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

// ---------- play-off contenders: the semi-finals as if the groups ended now ----------

const byStats = (a, b) => b.wins - a.wins || b.balls - a.balls;

/** Slot entry: { names } for a known or tied contender, { label } for a placeholder. */
function entry(s, ids, label) {
  if (!ids?.length || ids.length > MAX_TIED_NAMES) return { label };
  return { names: ids.map((id) => s.players[id].name), ids };
}

/** Candidates for places 1..k of a group (tied, unresolved places give several ids); null if nothing played yet. */
function groupPlaces(s, g, k) {
  if (!groupMatches(s, g.id).some((m) => m.winner)) return null;
  const active = groupStats(s, g.id).filter((r) => !r.out);
  const cutoffs = Array.from({ length: k }, (_, i) => i + 1);
  const places = [];
  let pos = 0;
  for (const seg of rank(s, active, cutoffs).segments) {
    for (let i = 0; i < seg.ids.length; i++, pos++) if (pos < k) places.push(seg.ids.length > 1 ? seg.ids : [seg.ids[i]]);
  }
  return places;
}

function contenders(s) {
  const groups = s.groups;
  const n = groups.length;
  const stats = new Map(groups.flatMap((g) => groupStats(s, g.id)).map((r) => [r.id, r]));
  const best = (ids) => stats.get(ids[0]); // tied ids share the stats
  const place = (gi, k) => groupPlaces(s, groups[gi], k);
  const gName = (g) => g.name;
  let semis;
  if (n === 1) {
    const p = place(0, 4) || [];
    const e = (i) => entry(s, p[i], `Seed ${i + 1}`);
    semis = [[e(0), e(3)], [e(1), e(2)]];
  } else if (n === 2) {
    const [a, b] = [place(0, 2), place(1, 2)];
    const e = (p, i, g) => entry(s, p?.[i], i === 0 ? `Winner ${gName(g)}` : `2nd ${gName(g)}`);
    semis = [[e(a, 0, groups[0]), e(b, 1, groups[1])], [e(b, 0, groups[1]), e(a, 1, groups[0])]];
  } else {
    // Group winners ranked against each other; groups with no games yet go last as placeholders.
    const winners = groups.map((g, gi) => ({ g, ids: place(gi, n === 3 ? 2 : 1) }));
    const known = winners.filter((w) => w.ids?.[0]).sort((x, y) => byStats(best(x.ids[0]), best(y.ids[0])));
    const order = [...known, ...winners.filter((w) => !w.ids?.[0])];
    const w = order.map((x) => entry(s, x.ids?.[0], `Winner ${gName(x.g)}`));
    if (n === 3) {
      // Best second place across the groups.
      const seconds = known.filter((x) => x.ids[1]).map((x) => x.ids[1]).sort((x, y) => byStats(best(x), best(y)));
      const top = seconds.length ? seconds.filter((x) => byStats(best(x), best(seconds[0])) === 0).flat() : [];
      const wild = entry(s, top, 'Best 2nd place');
      const own = (e) => e.ids && s.players[e.ids[0]].groupId;
      semis = own(w[0]) && own(w[0]) === own(wild) ? [[w[1], wild], [w[0], w[2]]] : [[w[0], wild], [w[1], w[2]]];
    } else {
      semis = [[w[0], w[3]], [w[1], w[2]]];
    }
  }
  const strip = (e) => (e.names ? { names: e.names } : { label: e.label });
  return { sf1: semis[0].map(strip), sf2: semis[1].map(strip) };
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

  // Before the real bracket exists, but after the first group game: who would play the semi-finals now.
  const anyPlayed = Object.values(s.matches).some((m) => m.stage === 'group' && m.winner);
  const projected = s.started && !s.matches.sf1 && s.groups.length && anyPlayed ? contenders(s) : null;

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
    contenders: projected,
    podium,
    qualification: qual,
  };
}
