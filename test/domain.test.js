import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, applyAction, buildState, DomainError } from '../src/domain/engine.js';
import { roundRobinPairs, interleave, lateInsertPositions } from '../src/domain/schedule.js';
import { groupTable } from '../src/domain/standings.js';
import { snapshot } from '../src/domain/view.js';

/** Small driver: keeps the action log and the state, like the server does. */
function tour() {
  const t = {
    log: [],
    s: initialState(),
    do(type, payload = {}) {
      t.s = applyAction(t.s, { type, payload });
      t.log.push({ type, payload });
      return t;
    },
    fails(code, type, payload = {}) {
      assert.throws(() => applyAction(t.s, { type, payload }), (e) => e instanceof DomainError && e.code === code);
      return t;
    },
    /** Groups like { A: ['Ann', 'Bob'], B: [...] }; player ids are their names. */
    setup(groups) {
      for (const [g, names] of Object.entries(groups)) {
        t.do('group.add', { id: g, name: `Group ${g}` });
        for (const n of names) t.do('player.add', { id: n, name: n, groupId: g });
      }
      return t;
    },
    start(seed = 1) { return t.do('tournament.start', { seed }); },
    match(a, b, stage) {
      const m = Object.values(t.s.matches).find((x) => (!stage || x.stage === stage) && !x.winner &&
        ((x.p1 === a && x.p2 === b) || (x.p1 === b && x.p2 === a)));
      assert.ok(m, `no pending match ${a} vs ${b}`);
      return m;
    },
    /** Record a win of `w` over `l` with `balls` of the loser left on the table. */
    win(w, l, balls = 0, stage) {
      const m = t.match(w, l, stage);
      return t.do('match.result', { id: m.id, winner: m.p1 === w ? 1 : 2, balls });
    },
    /** Play the rest of a group so that players finish in the given order (earlier beats later). */
    rank(names, balls = 0) {
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const pending = Object.values(t.s.matches).some((x) => x.stage === 'group' && !x.winner &&
            ((x.p1 === names[i] && x.p2 === names[j]) || (x.p1 === names[j] && x.p2 === names[i])));
          if (pending) t.win(names[i], names[j], balls);
        }
      }
      return t;
    },
    pending(stage) { return Object.values(t.s.matches).filter((m) => m.stage === stage && !m.winner); },
    semis() {
      return ['sf1', 'sf2'].map((k) => [t.s.matches[k].p1, t.s.matches[k].p2]);
    },
  };
  return t;
}

test('round robin: every pair once', () => {
  for (const n of [2, 3, 4, 5, 6, 7]) {
    const pairs = roundRobinPairs(Array.from({ length: n }, (_, i) => `p${i}`));
    assert.equal(pairs.length, (n * (n - 1)) / 2);
    assert.equal(new Set(pairs.map((p) => [...p].sort().join())).size, pairs.length);
  }
});

test('queue: groups take turns and nobody plays twice in a row', () => {
  const t = tour().setup({ A: ['a1', 'a2', 'a3', 'a4'], B: ['b1', 'b2', 'b3', 'b4'] }).start();
  const q = t.s.queue.map((id) => t.s.matches[id]);
  assert.equal(q.length, 12);
  q.forEach((m, i) => {
    assert.equal(m.groupId, i % 2 ? 'B' : 'A');
    if (i > 0) assert.ok(![q[i - 1].p1, q[i - 1].p2].some((p) => p === m.p1 || p === m.p2), `back to back at ${i}`);
  });
});

test('queue: a group that runs out is skipped', () => {
  const t = tour().setup({ A: ['a1', 'a2'], B: ['b1', 'b2', 'b3', 'b4'] }).start();
  const groups = t.s.queue.map((id) => t.s.matches[id].groupId).join('');
  assert.equal(groups, 'ABBBBBB');
});

test('start: validation', () => {
  tour().fails('no_groups', 'tournament.start');
  tour().setup({ A: ['a', 'b', 'c'] }).fails('need_four_players', 'tournament.start');
  tour().setup({ A: ['a', 'b'], B: ['c'] }).fails('group_too_small', 'tournament.start');
  const t = tour().setup({ A: ['a', 'b'], B: ['c', 'd'] });
  t.do('player.add', { id: 'x', name: 'x' }).fails('players_without_group', 'tournament.start');
  tour().setup({ A: ['a'] }).fails('player_name_taken', 'player.add', { id: 'z', name: 'A' === 'a' ? 'x' : 'a', groupId: 'A' });
});

test('result: current match leaves the queue, next one starts automatically', () => {
  const t = tour().setup({ A: ['a', 'b', 'c', 'd'] }).start();
  const [first, second] = t.s.queue;
  const m = t.s.matches[first];
  t.do('match.result', { id: first, winner: 1, balls: 3 });
  assert.equal(t.s.queue[0], second);
  assert.equal(snapshot(t.s).current.id, second);
  assert.equal(t.s.matches[first].winner, 1);
  t.fails('bad_balls', 'match.result', { id: second, winner: 1, balls: 8 });
  t.fails('bad_winner', 'match.result', { id: second, winner: 3, balls: 1 });
  assert.ok(m);
});

test('trophy goes to the leader even when the first-added player has no wins', () => {
  const t = tour().setup({ A: ['ann', 'bob', 'cid', 'dan'] }).start();
  t.win('cid', 'ann').win('cid', 'bob');
  assert.deepEqual(snapshot(t.s).groups[0].rows.filter((r) => r.leader).map((r) => r.name), ['cid']);
});

test('table: wins first, then balls; trophy for tied leaders', () => {
  const t = tour().setup({ A: ['ann', 'bob', 'cid', 'dan'] }).start();
  t.win('ann', 'bob', 2).win('cid', 'dan', 5);
  const g = snapshot(t.s).groups[0];
  assert.deepEqual(g.rows.slice(0, 2).map((r) => [r.name, r.wins, r.balls]), [['cid', 1, 5], ['ann', 1, 2]]);
  assert.deepEqual(g.rows.filter((r) => r.leader).map((r) => r.name), ['cid']);
  t.win('ann', 'dan', 3);
  t.win('bob', 'cid', 0);
  // ann 2 wins / 5 balls, cid 1 / 5 -> ann leads alone
  assert.deepEqual(snapshot(t.s).groups[0].rows.filter((r) => r.leader).map((r) => r.name), ['ann']);
  const cross = snapshot(t.s).groups[0].cross;
  assert.deepEqual(cross.ann.bob, { win: true, balls: 2, approx: false });
  assert.deepEqual(cross.bob.ann, { win: false });
  assert.equal(cross.ann.cid, null);
});

test('2 groups: A1-B2 and B1-A2', () => {
  const t = tour().setup({ A: ['a1', 'a2', 'a3', 'a4'], B: ['b1', 'b2', 'b3', 'b4'] }).start();
  t.rank(['a1', 'a2', 'a3', 'a4'], 1).rank(['b1', 'b2', 'b3', 'b4'], 1);
  assert.equal(t.s.phase, 'playoff');
  assert.deepEqual(t.semis(), [['a1', 'b2'], ['b1', 'a2']]);
});

test('tie at the cut-off inside a group -> new personal match, not the group result', () => {
  const t = tour().setup({ A: ['a1', 'a2', 'a3'], B: ['b1', 'b2', 'b3'] }).start();
  // Group A: a 3-way cycle, all 1 win and 2 balls: who is 1st and 2nd needs tie-breaks.
  t.win('a1', 'a2', 2).win('a2', 'a3', 2).win('a3', 'a1', 2);
  t.rank(['b1', 'b2', 'b3'], 1);
  const tb = t.pending('tiebreak');
  assert.equal(tb.length, 3, 'each with each among the three');
  assert.equal(t.s.matches.sf1, undefined);
  // New round: a3 wins both -> a3 first, a1 vs a2 still tied for 2nd -> they play again.
  t.win('a3', 'a1', 0, 'tiebreak').win('a3', 'a2', 0, 'tiebreak').win('a1', 'a2', 0, 'tiebreak');
  assert.equal(t.s.phase, 'playoff');
  assert.deepEqual(t.semis(), [['a3', 'b2'], ['b1', 'a1']]);
});

test('tie-break cycle -> another round', () => {
  const t = tour().setup({ A: ['a1', 'a2', 'a3'], B: ['b1', 'b2', 'b3'] }).start();
  t.win('a1', 'a2', 2).win('a2', 'a3', 2).win('a3', 'a1', 2).rank(['b1', 'b2', 'b3'], 1);
  t.win('a1', 'a2', 0, 'tiebreak').win('a2', 'a3', 0, 'tiebreak').win('a3', 'a1', 0, 'tiebreak');
  const round2 = t.pending('tiebreak');
  assert.equal(round2.length, 3);
  assert.ok(round2.every((m) => m.tbRound === 2));
});

test('tie for a place that does not go through -> nothing is played', () => {
  const t = tour().setup({ A: ['a1', 'a2', 'a3', 'a4'], B: ['b1', 'b2', 'b3', 'b4'] }).start();
  // a3 and a4 equal (3rd/4th), irrelevant for 2 groups.
  t.win('a1', 'a2').win('a1', 'a3').win('a1', 'a4').win('a2', 'a3').win('a2', 'a4').win('a3', 'a4');
  t.do('match.result', { id: Object.values(t.s.matches).find((m) => m.p1 === 'a3' && m.p2 === 'a4' || m.p1 === 'a4' && m.p2 === 'a3').id, winner: 1, balls: 0 });
  t.rank(['b1', 'b2', 'b3', 'b4']);
  assert.equal(t.pending('tiebreak').length, 0);
  assert.equal(t.s.phase, 'playoff');
});

test('both tied players go through -> lottery decides the pairing, no extra match', () => {
  const t = tour().setup({ A: ['a1', 'a2', 'a3'], B: ['b1', 'b2', 'b3'] }).start();
  // a1 and a2 both 1 win... make them equal on wins and balls, both above a3.
  t.win('a1', 'a3', 3).win('a2', 'a3', 3).win('a1', 'a2', 0);
  // a1: 2 wins, a2: 1 win -> not equal. Use 4 players instead for an equal top pair.
  const u = tour().setup({ A: ['a1', 'a2', 'a3', 'a4'], B: ['b1', 'b2', 'b3', 'b4'] }).start(7);
  u.win('a1', 'a3', 2).win('a1', 'a4', 2).win('a2', 'a1', 2).win('a2', 'a3', 2).win('a3', 'a4', 0).win('a4', 'a2', 2);
  // a1: 2 wins 4 balls, a2: 2 wins 4 balls, a3 1, a4 1
  u.rank(['b1', 'b2', 'b3', 'b4']);
  assert.equal(u.pending('tiebreak').length, 0);
  const s = u.semis().flat();
  assert.ok(s.includes('a1') && s.includes('a2'));
  // Deterministic: the same log gives the same pairing.
  assert.deepEqual(buildState(u.log).matches.sf1, u.s.matches.sf1);
  assert.ok(t);
});

test('1 group: top 4, 1-4 and 2-3', () => {
  const t = tour().setup({ A: ['p1', 'p2', 'p3', 'p4', 'p5'] }).start();
  t.rank(['p1', 'p2', 'p3', 'p4', 'p5'], 1);
  assert.deepEqual(t.semis(), [['p1', 'p4'], ['p2', 'p3']]);
});

test('4 groups: winners seeded by wins then balls', () => {
  const g = (x) => [1, 2, 3].map((i) => `${x}${i}`);
  const t = tour().setup({ A: g('a'), B: g('b'), C: g('c'), D: g('d') }).start();
  t.rank(g('a'), 1).rank(g('b'), 2).rank(g('c'), 3).rank(g('d'), 4);
  assert.deepEqual(t.semis(), [['d1', 'a1'], ['c1', 'b1']]);
});

test('3 groups: best second, never against the winner of its own group', () => {
  const g = (x) => [1, 2, 3].map((i) => `${x}${i}`);
  const t = tour().setup({ A: g('a'), B: g('b'), C: g('c') }).start();
  t.rank(g('a'), 5).rank(g('b'), 3).rank(g('c'), 1);
  assert.deepEqual(t.semis(), [['b1', 'a2'], ['a1', 'c1']]);
});

test('3 groups: equal seconds -> extra match', () => {
  const g = (x) => [1, 2, 3].map((i) => `${x}${i}`);
  const t = tour().setup({ A: g('a'), B: g('b'), C: g('c') }).start();
  t.rank(g('a'), 2).rank(g('b'), 2).rank(g('c'), 1);
  assert.equal(t.pending('tiebreak').length, 1);
  t.win('b2', 'a2', 0, 'tiebreak');
  const all = t.semis().flat();
  assert.ok(all.includes('b2') && !all.includes('a2'));
});

test('6 groups: only the 4 best winners; tie at 4th place -> extra match', () => {
  const groups = Object.fromEntries('ABCDEF'.split('').map((x) => [x, [1, 2, 3].map((i) => `${x}${i}`)]));
  const t = tour().setup(groups).start();
  const balls = { A: 7, B: 6, C: 5, D: 4, E: 4, F: 1 };
  for (const [x, b] of Object.entries(balls)) t.rank(groups[x], b);
  assert.equal(t.pending('tiebreak').length, 1);
  t.win('E1', 'D1', 0, 'tiebreak');
  assert.deepEqual(t.semis(), [['A1', 'E1'], ['B1', 'C1']]);
});

test('play-off: semis -> 3rd place before the final -> podium', () => {
  const t = tour().setup({ A: ['a1', 'a2', 'a3', 'a4'], B: ['b1', 'b2', 'b3', 'b4'] }).start();
  t.rank(['a1', 'a2', 'a3', 'a4']).rank(['b1', 'b2', 'b3', 'b4']);
  assert.deepEqual(t.s.queue, ['sf1', 'sf2']);
  t.win('b2', 'a1', 0, 'playoff').win('b1', 'a2', 0, 'playoff');
  assert.deepEqual(t.s.queue, ['third', 'final']);
  assert.deepEqual([t.s.matches.final.p1, t.s.matches.final.p2], ['b2', 'b1']);
  assert.deepEqual([t.s.matches.third.p1, t.s.matches.third.p2], ['a1', 'a2']);
  t.win('a2', 'a1', 0, 'playoff').win('b1', 'b2', 0, 'playoff');
  assert.equal(t.s.phase, 'finished');
  assert.deepEqual(snapshot(t.s).podium.map((p) => p.name), ['b1', 'b2', 'a2']);
});

test('play-off balls are ignored', () => {
  const t = tour().setup({ A: ['a1', 'a2', 'a3', 'a4'] }).start();
  t.rank(['a1', 'a2', 'a3', 'a4']);
  t.do('match.result', { id: 'sf1', winner: 1, balls: 7 });
  assert.equal(t.s.matches.sf1.balls, 0);
});

test('manual play-off: admin sets the semis before extra matches are played', () => {
  const t = tour().setup({ A: ['a1', 'a2', 'a3'], B: ['b1', 'b2', 'b3'] }).start();
  t.win('a1', 'a2', 2).win('a2', 'a3', 2).win('a3', 'a1', 2).rank(['b1', 'b2', 'b3'], 1);
  assert.equal(t.pending('tiebreak').length, 3);
  t.do('playoff.set', { slot: 'sf1', p1: 'a1', p2: 'b2' }).do('playoff.set', { slot: 'sf2', p1: 'b1', p2: 'a2' });
  assert.equal(t.pending('tiebreak').length, 0, 'extra matches are no longer needed');
  assert.deepEqual(t.semis(), [['a1', 'b2'], ['b1', 'a2']]);
  t.do('playoff.auto', { slot: 'sf2' });
  assert.equal(t.pending('tiebreak').length, 3, 'back to automatic: extra matches return');
});

test('withdrawal: every opponent wins, provisional average balls until the group is over', () => {
  const t = tour().setup({ A: ['a', 'b', 'c', 'd'], B: ['e', 'f'] }).start();
  t.win('d', 'a', 5).win('b', 'c', 3); // d beat a: will be flipped
  t.do('player.withdraw', { id: 'd' });
  const rows = () => snapshot(t.s).groups[0].rows;
  const a = () => rows().find((r) => r.id === 'a');
  assert.equal(a().wins, 1);
  assert.equal(a().approx, true);
  // average of real results: (5 + 3) / 2 = 4 -> wait, the flipped match is a forfeit now, real: b-c 3 only
  assert.equal(a().balls, 3);
  assert.equal(rows().at(-1).id, 'd');
  assert.equal(rows().at(-1).out, true);
  assert.equal(t.pending('group').filter((m) => m.p1 === 'd' || m.p2 === 'd').length, 0);
  // Finish the group -> the average is frozen.
  t.rank(['a', 'b', 'c']);
  assert.equal(a().approx, false);
  // Restore brings the original results back.
  t.do('player.restore', { id: 'd' });
  assert.equal(Object.values(t.s.matches).find((m) => (m.p1 === 'd' && m.p2 === 'a') || (m.p1 === 'a' && m.p2 === 'd')).forfeit, false);
});

test('withdrawal in the play-off: walkover', () => {
  const t = tour().setup({ A: ['a1', 'a2', 'a3', 'a4'] }).start();
  t.rank(['a1', 'a2', 'a3', 'a4']);
  t.do('player.withdraw', { id: 'a4' });
  assert.equal(t.s.matches.sf1.winner, 1);
  assert.equal(t.s.matches.sf1.forfeit, true);
  assert.equal(t.s.matches.final.p1, 'a1');
});

test('average balls: rounded half up', () => {
  const t = tour().setup({ A: ['a', 'b', 'c', 'd'], B: ['e', 'f'] }).start();
  t.win('a', 'b', 3).win('c', 'd', 4); // avg 3.5 -> 4
  t.do('player.withdraw', { id: 'e' });
  const f = snapshot(t.s).groups[1].rows.find((r) => r.id === 'f');
  assert.equal(f.balls, 4);
});

test('late player: catch-up puts the first match right after the current one', () => {
  const t = tour().setup({ A: ['a1', 'a2'], B: ['b1', 'b2', 'b3', 'b4'] }).start();
  t.win('a1', 'a2');
  t.do('player.add', { id: 'a3', name: 'a3', groupId: 'A', seed: 5 });
  const q = t.s.queue.map((id) => t.s.matches[id]);
  assert.ok([q[1].p1, q[1].p2].includes('a3'));
  const idx = q.map((m, i) => ([m.p1, m.p2].includes('a3') ? i : -1)).filter((i) => i >= 0);
  assert.equal(idx.length, 2);
  assert.ok(idx[1] - idx[0] > 1, 'not back to back');
});

test('late player: random but spread positions', () => {
  const t = tour().setup({ A: ['a1', 'a2', 'a3'], B: ['b1', 'b2', 'b3', 'b4'] }).start();
  t.do('player.add', { id: 'a4', name: 'a4', groupId: 'A', seed: 9 });
  const q = t.s.queue.map((id) => t.s.matches[id]);
  const idx = q.map((m, i) => ([m.p1, m.p2].includes('a4') ? i : -1)).filter((i) => i >= 0);
  assert.equal(idx.length, 3);
  assert.ok(idx[0] >= 1, 'the current match is not displaced');
  for (let i = 1; i < idx.length; i++) assert.ok(idx[i] - idx[i - 1] > 1);
});

test('late insert positions stay inside the queue', () => {
  for (let len = 0; len < 12; len++) {
    for (let c = 1; c < 5; c++) {
      for (const catchUp of [true, false]) {
        const p = lateInsertPositions(len, c, catchUp, len * 7 + c);
        assert.equal(p.length, c);
        p.forEach((x, i) => {
          assert.ok(x >= (len ? 1 : 0) && x < len + c, `${len},${c},${catchUp}: ${p}`);
          if (i) assert.ok(x > p[i - 1]);
        });
      }
    }
  }
});

test('queue: postpone and move', () => {
  const t = tour().setup({ A: ['a', 'b', 'c', 'd'] }).start();
  const [q0, q1, q2] = t.s.queue;
  t.do('queue.postpone', { id: q1 });
  assert.deepEqual(t.s.queue.slice(0, 3), [q0, q2, q1]);
  t.do('queue.move', { id: q1, to: 0 });
  assert.equal(t.s.queue[0], q1);
});

test('reopen: the match goes back to the front of the queue', () => {
  const t = tour().setup({ A: ['a', 'b', 'c', 'd'] }).start();
  const id = t.s.queue[0];
  t.do('match.result', { id, winner: 2, balls: 1 });
  t.do('match.reopen', { id });
  assert.equal(t.s.queue[0], id);
  assert.equal(t.s.matches[id].winner, null);
});

test('edit a finished result', () => {
  const t = tour().setup({ A: ['a', 'b', 'c', 'd'] }).start();
  const id = t.s.queue[0];
  t.do('match.result', { id, winner: 2, balls: 1 });
  t.do('match.result', { id, winner: 1, balls: 6 });
  assert.equal(t.s.matches[id].winner, 1);
  assert.equal(t.s.matches[id].balls, 6);
  assert.ok(!t.s.queue.includes(id));
});

test('editing group results after the play-off appeared updates the bracket while it is unplayed', () => {
  const t = tour().setup({ A: ['a1', 'a2', 'a3', 'a4'], B: ['b1', 'b2', 'b3', 'b4'] }).start();
  t.rank(['a1', 'a2', 'a3', 'a4']).rank(['b1', 'b2', 'b3', 'b4']);
  const m = Object.values(t.s.matches).find((x) => x.stage === 'group' && [x.p1, x.p2].includes('a2') && [x.p1, x.p2].includes('a3'));
  // a3 beats a2 now -> a3 is second in group A
  t.do('match.result', { id: m.id, winner: m.p1 === 'a3' ? 1 : 2, balls: 0 });
  assert.deepEqual(t.semis(), [['a1', 'b2'], ['b1', 'a3']]);
  // A tie at the cut-off removes the bracket and creates an extra match instead.
  const a4a3 = Object.values(t.s.matches).find((x) => x.stage === 'group' && [x.p1, x.p2].includes('a4') && [x.p1, x.p2].includes('a3'));
  t.do('match.result', { id: a4a3.id, winner: a4a3.p1 === 'a4' ? 1 : 2, balls: 0 });
  // a2: 1, a3: 1, a4: 1 -> three equal for 2nd place
  assert.equal(t.s.matches.sf1, undefined);
  assert.equal(t.pending('tiebreak').length, 3);
});

test('replay gives the same state (undo = rebuild without the last action)', () => {
  const t = tour().setup({ A: ['a', 'b', 'c', 'd'], B: ['e', 'f', 'g'] }).start(42);
  t.win('a', 'b', 3);
  const before = t.s;
  t.win('c', 'd', 1);
  assert.deepEqual(buildState(t.log.slice(0, -1)), before);
  assert.deepEqual(buildState(t.log), t.s);
});

test('setup actions are locked after the start', () => {
  const t = tour().setup({ A: ['a', 'b', 'c', 'd'] }).start();
  t.fails('wrong_phase', 'group.add', { id: 'B', name: 'B' });
  t.fails('wrong_phase', 'player.remove', { id: 'a' });
  t.fails('same_group', 'player.move', { id: 'a', groupId: 'A' });
  t.do('player.rename', { id: 'a', name: 'Alice' });
  assert.equal(t.s.players.a.name, 'Alice');
  assert.equal(groupTable(t.s, 'A').length, 4);
});

// ---------- replacement and moving to another group (group stage) ----------

const queued = (t, pid) => t.s.queue.filter((id) => involvesId(t.s.matches[id], pid));
const involvesId = (m, pid) => m.p1 === pid || m.p2 === pid;
const row = (t, g, id) => groupTable(t.s, g).find((r) => r.id === id);

test('replace: the old player and all their games disappear, the new one plays everybody', () => {
  const t = tour().setup({ A: ['ann', 'bob', 'cid', 'dan'], B: ['b1', 'b2', 'b3', 'b4'] }).start();
  t.win('ann', 'bob', 4).win('cid', 'ann', 2).win('bob', 'dan', 1);
  t.do('player.replace', { id: 'ann', newId: 'eve', name: 'Eve', seed: 3 });
  assert.equal(t.s.players.ann, undefined);
  assert.deepEqual(groupTable(t.s, 'A').map((r) => r.id).sort(), ['bob', 'cid', 'dan', 'eve']);
  // Results against Ann are annulled for the opponents too.
  assert.deepEqual([row(t, 'A', 'bob').wins, row(t, 'A', 'bob').frames], [1, 1]);
  assert.deepEqual([row(t, 'A', 'cid').wins, row(t, 'A', 'cid').balls], [0, 0]);
  assert.equal(Object.values(t.s.matches).filter((m) => involvesId(m, 'ann')).length, 0);
  assert.equal(queued(t, 'eve').length, 3);
  assert.equal(Object.values(t.s.matches).filter((m) => m.stage === 'group' && m.groupId === 'A').length, 6);
  assert.ok(!snapshot(t.s).players.some((p) => p.id === 'ann'));
});

test('replace: the player of the current match -> the next match starts', () => {
  const t = tour().setup({ A: ['a1', 'a2', 'a3', 'a4'], B: ['b1', 'b2', 'b3', 'b4'] }).start();
  const cur = t.s.matches[t.s.queue[0]];
  const next = t.s.queue[1];
  t.do('player.replace', { id: cur.p1, newId: 'x', name: 'X', seed: 1 });
  assert.ok(!t.s.matches[cur.id]);
  assert.equal(t.s.queue[0], next);
});

test('replace: everybody else has finished -> the first match of the new player goes right after the current one', () => {
  const t = tour().setup({ A: ['a1', 'a2', 'a3'], B: ['b1', 'b2', 'b3', 'b4'] }).start();
  t.rank(['a1', 'a2']);
  t.do('player.replace', { id: 'a3', newId: 'x', name: 'X', seed: 2 });
  const idx = t.s.queue.map((id, i) => (involvesId(t.s.matches[id], 'x') ? i : -1)).filter((i) => i >= 0);
  assert.equal(idx[0], 1);
  assert.equal(idx.length, 2);
});

test('replace a withdrawn player: their walkovers are annulled', () => {
  const t = tour().setup({ A: ['a1', 'a2', 'a3', 'a4'], B: ['b1', 'b2', 'b3', 'b4'] }).start();
  t.do('player.withdraw', { id: 'a4' });
  assert.equal(row(t, 'A', 'a1').wins, 1);
  t.do('player.replace', { id: 'a4', newId: 'x', name: 'X', seed: 4 });
  assert.equal(row(t, 'A', 'a1').wins, 0);
  assert.equal(queued(t, 'x').length, 3);
});

test('replace with a player from another group: they swap groups, results of both are annulled', () => {
  const t = tour().setup({ A: ['a1', 'a2', 'a3', 'a4'], B: ['b1', 'b2', 'b3', 'b4'] }).start();
  t.win('b1', 'b2', 3).win('a1', 'a2', 1).win('a3', 'a4', 2);
  t.do('player.replace', { id: 'a1', withId: 'b1', seed: 6 });
  assert.equal(t.s.players.b1.groupId, 'A');
  assert.equal(t.s.players.a1.groupId, 'B');
  assert.deepEqual(groupTable(t.s, 'A').map((r) => r.id).sort(), ['a2', 'a3', 'a4', 'b1']);
  assert.deepEqual(groupTable(t.s, 'B').map((r) => r.id).sort(), ['a1', 'b2', 'b3', 'b4']);
  assert.equal(row(t, 'B', 'b2').frames, 0);
  assert.equal(row(t, 'A', 'a2').frames, 0);
  assert.equal(row(t, 'A', 'a3').wins, 1); // games without the two stay
  for (const [pid, g] of [['b1', 'A'], ['a1', 'B']]) {
    assert.equal(queued(t, pid).length, 3);
    assert.ok(queued(t, pid).every((id) => t.s.matches[id].groupId === g));
  }
  assert.equal(Object.values(t.s.matches).filter((m) => m.stage === 'group').length, 12);
  t.fails('same_group', 'player.replace', { id: 'a2', withId: 'b1' });
  t.do('player.withdraw', { id: 'b2' });
  t.fails('player_withdrawn', 'player.replace', { id: 'a2', withId: 'b2' });
  t.fails('player_withdrawn', 'player.replace', { id: 'b2', withId: 'a2' });
  assert.deepEqual(buildState(t.log), t.s);
});

test('move to another group after the start: results annulled, plays everybody in the new group', () => {
  const t = tour().setup({ A: ['a1', 'a2', 'a3'], B: ['b1', 'b2', 'b3'] }).start();
  t.win('a1', 'a2', 5);
  t.do('player.move', { id: 'a1', groupId: 'B', seed: 7 });
  assert.equal(row(t, 'A', 'a2').frames, 0);
  assert.equal(row(t, 'B', 'a1').frames, 0);
  assert.equal(queued(t, 'a1').length, 3);
  // Group A would be left with one player.
  t.fails('group_too_small', 'player.move', { id: 'a2', groupId: 'B' });
  t.do('player.withdraw', { id: 'b1' });
  t.fails('player_withdrawn', 'player.move', { id: 'b1', groupId: 'A' });
});

test('replace and move only during the group stage; replay gives the same state', () => {
  const t = tour().setup({ A: ['a1', 'a2', 'a3', 'a4'] });
  t.fails('wrong_phase', 'player.replace', { id: 'a1', newId: 'x', name: 'X' });
  t.start();
  t.do('player.replace', { id: 'a2', newId: 'x', name: 'X', seed: 8 });
  t.rank(['a1', 'x', 'a3', 'a4']);
  assert.equal(t.s.phase, 'playoff');
  t.fails('wrong_phase', 'player.replace', { id: 'a1', newId: 'y', name: 'Y' });
  t.fails('wrong_phase', 'player.move', { id: 'a1', groupId: 'A' });
  assert.deepEqual(buildState(t.log), t.s);
});

test('groups.setup: the whole quick setup in one action, all or nothing', () => {
  const groups = [{ id: 'A', name: 'Group A', players: [{ id: 'a', name: 'a' }, { id: 'b', name: 'b' }] },
    { id: 'B', name: 'Group B', players: [{ id: 'c', name: 'c' }, { id: 'd', name: 'd' }] }];
  const one = tour().do('groups.setup', { groups });
  const many = tour().setup({ A: ['a', 'b'], B: ['c', 'd'] });
  assert.deepEqual(one.s.groups, many.s.groups);
  assert.deepEqual(one.s.players, many.s.players);
  assert.deepEqual(one.s.playerOrder, many.s.playerOrder);
  // a repeated name anywhere: nothing at all is added
  const t = tour();
  t.fails('player_name_taken', 'groups.setup', { groups: [{ id: 'A', name: 'Group A', players: [{ id: 'a', name: 'a' }, { id: 'b', name: 'A' }] }] });
  assert.equal(t.s.groups.length, 0);
  t.fails('bad_setup', 'groups.setup', { groups: [] });
  one.start().fails('wrong_phase', 'groups.setup', { groups });
});

test('skip: a group match counts as nothing for both, the group is over without it', () => {
  const t = tour().setup({ A: ['Ann', 'Bob', 'Cat', 'Dan'] }).start();
  t.win('Ann', 'Bob', 3).win('Ann', 'Cat', 2).win('Ann', 'Dan', 1).win('Bob', 'Cat', 4).win('Cat', 'Dan', 5);
  const m = t.match('Bob', 'Dan');
  t.do('match.skip', { id: m.id });
  assert.ok(!t.s.queue.includes(m.id));
  const rows = Object.fromEntries(groupTable(t.s, 'A').map((r) => [r.id, r]));
  assert.deepEqual([rows.Bob.frames, rows.Bob.wins, rows.Bob.balls], [2, 1, 4]); // the skipped match is not a frame
  assert.deepEqual([rows.Dan.frames, rows.Dan.wins, rows.Dan.balls], [2, 0, 0]);
  assert.equal(t.s.phase, 'playoff'); // the group is over: the bracket is there
  const snap = snapshot(t.s);
  assert.deepEqual(snap.groups[0].cross.Bob.Dan, { skipped: true });
  assert.equal(snap.skipped.length, 1);
  assert.equal(snap.groups[0].played, snap.groups[0].total);
});

test('skip: only group matches, not twice; unskip puts it back at the end of the queue', () => {
  const t = tour().setup({ A: ['Ann', 'Bob'], B: ['Cat', 'Dan'] }).start();
  const m = t.match('Ann', 'Bob');
  t.do('match.skip', { id: m.id }).fails('already_finished', 'match.skip', { id: m.id });
  t.do('match.unskip', { id: m.id });
  assert.equal(t.s.queue.at(-1), m.id);
  t.fails('not_skipped', 'match.unskip', { id: m.id });
  t.rank(['Ann', 'Bob']).rank(['Cat', 'Dan']);
  t.fails('skip_group_only', 'match.skip', { id: 'sf1' });
  assert.deepEqual(buildState(t.log), t.s);
});

test('skip: a result entered later replaces the skip; a withdrawal and restore keep it skipped', () => {
  const t = tour().setup({ A: ['Ann', 'Bob', 'Cat', 'Dan'] }).start();
  const m = t.match('Ann', 'Bob');
  t.do('match.skip', { id: m.id }).do('match.result', { id: m.id, winner: 1, balls: 2 });
  assert.equal(t.s.matches[m.id].skipped, false);
  assert.equal(t.s.matches[m.id].winner, 1);
  const m2 = t.match('Cat', 'Dan');
  t.do('match.skip', { id: m2.id }).do('player.withdraw', { id: 'Dan' });
  assert.equal(t.s.matches[m2.id].forfeit, true); // the withdrawal wins over the skip
  t.do('player.restore', { id: 'Dan' });
  assert.equal(t.s.matches[m2.id].skipped, true);
  assert.ok(!t.s.queue.includes(m2.id));
});

test('group decider: the last match of a group counts only if some outcome changes who can go through', () => {
  // 4 groups: only the winners go through. In A, Ann has won everything; the last match is between two losers.
  const t = tour().setup({ A: ['Ann', 'Bob', 'Cat', 'Dan'], B: ['Eve', 'Fay'], C: ['Gus', 'Hal'], D: ['Ivy', 'Jon'] }).start();
  t.win('Ann', 'Bob', 3).win('Ann', 'Cat', 3).win('Ann', 'Dan', 3).win('Bob', 'Cat', 2).win('Bob', 'Dan', 2);
  let a = snapshot(t.s).groups[0];
  assert.equal(a.total - a.played, 1);
  assert.equal(a.lastMatters, false); // Cat vs Dan: Ann stays first with 3 wins and 9 balls whatever happens
  // 1 group: the top 4 go through, so the same kind of match does matter there
  const u = tour().setup({ A: ['Ann', 'Bob', 'Cat', 'Dan', 'Eli'] }).start();
  u.rank(['Ann', 'Bob', 'Cat']).win('Ann', 'Dan').win('Ann', 'Eli').win('Bob', 'Dan').win('Bob', 'Eli').win('Cat', 'Dan').win('Cat', 'Eli');
  a = snapshot(u.s).groups[0];
  assert.equal(a.total - a.played, 1);
  assert.equal(a.lastMatters, true); // Dan vs Eli decides the 4th place
});

test('start with BYE fillers withdrawn in the same action: same state as withdrawing them right after', () => {
  const groups = { A: ['Ann', 'Bob', 'Cat'], B: ['Dan', 'Eva', 'BYE'] };
  const one = tour().setup(groups).do('tournament.start', { seed: 1, withdraw: ['BYE'] });
  const two = tour().setup(groups).start().do('player.withdraw', { id: 'BYE' });
  assert.deepEqual(one.s, two.s);
  assert.ok(one.s.players.BYE.withdrawn);
  tour().setup(groups).fails('bad_payload', 'tournament.start', { seed: 1, withdraw: 'BYE' });
});

test('start with re-buy places: their matches at the end of the queue, never two in a row', () => {
  const groups = { A: ['Ann', 'Bob', 'Cat', 'Reb'], B: ['Dan', 'Eva', 'Fay', 'Gus'] };
  const plain = tour().setup(groups).start();
  const t = tour().setup(groups).do('tournament.start', { seed: 1, later: ['Reb'] });
  const q = t.s.queue;
  assert.deepEqual([...q].sort(), [...plain.s.queue].sort()); // the same matches, only the order differs
  const has = (id) => [t.s.matches[id].p1, t.s.matches[id].p2].includes('Reb');
  const at = q.map((id, i) => (has(id) ? i : -1)).filter((i) => i >= 0);
  assert.deepEqual(at, [q.length - 5, q.length - 3, q.length - 1]); // one place: every other match at the very end
  tour().setup(groups).fails('bad_payload', 'tournament.start', { seed: 1, later: 'Reb' });
});

test('start with re-buy places in different groups: their matches are one block at the very end', () => {
  const groups = { A: ['Ann', 'Bob', 'RA'], B: ['Cat', 'Dan', 'RB'], C: ['Eva', 'Fay', 'RC'] };
  const t = tour().setup(groups).do('tournament.start', { seed: 1, later: ['RA', 'RB', 'RC'] });
  const q = t.s.queue;
  const ps = (id) => [t.s.matches[id].p1, t.s.matches[id].p2];
  const late = q.map((id) => ps(id).some((x) => x.startsWith('R'))).map(Number).join('');
  assert.equal(late, '000111111'); // 6 matches of the places, all at the end
  for (let i = 1; i < q.length; i++) assert.ok(!ps(q[i]).some((x) => ps(q[i - 1]).includes(x)), `twice in a row at ${i}`);
});

test('upcoming play-off in the queue: names only where certain, placeholders elsewhere', () => {
  const t = tour().setup({ A: ['Ann', 'Bob'], B: ['Cat', 'Dan', 'Eva'] }).start();
  let up = snapshot(t.s).upcoming;
  assert.deepEqual(up.map((m) => m.round), ['sf1', 'sf2', 'third', 'final']);
  assert.ok(up.every((m) => m.p1.placeholder && m.p2.placeholder));
  assert.deepEqual([up[3].p1.name, up[3].p2.name], ['Winner SF1', 'Winner SF2']);
  t.win('Ann', 'Bob', 2); // group A is over: its winner and runner-up are certain (2 groups: A1-B2, B1-A2)
  up = snapshot(t.s).upcoming;
  assert.equal(up[0].p1.name, 'Ann');
  assert.ok(up[0].p2.placeholder); // 2nd of group B: not yet
  assert.equal(up[1].p2.name, 'Bob');
  t.rank(['Cat', 'Dan', 'Eva']);
  assert.deepEqual(snapshot(t.s).upcoming, []); // the bracket is there: no more projections
});

test('upcoming play-off: with 4 groups the names are certain once every group is over or its last match changes nothing', () => {
  const t = tour().setup({ A: ['Ann', 'Bob', 'Cat', 'Dan'], B: ['Eve', 'Fay'], C: ['Gus', 'Hal'], D: ['Ivy', 'Jon'] }).start();
  t.win('Eve', 'Fay', 1).win('Gus', 'Hal', 2).win('Ivy', 'Jon', 3);
  t.win('Ann', 'Bob', 3).win('Ann', 'Cat', 3).win('Ann', 'Dan', 3).win('Bob', 'Cat', 2);
  let up0 = snapshot(t.s).upcoming;
  assert.ok(up0[0].p1.placeholder); // two matches left in A: its winner is not certain yet
  assert.ok([up0[0].p2, up0[1].p1, up0[1].p2].every((p) => !p.placeholder)); // B, C, D are over: their winners are named
  t.win('Bob', 'Dan', 2); // only Cat vs Dan is left, and it changes nothing
  const up = snapshot(t.s).upcoming;
  assert.deepEqual([up[0].p1.name, up[0].p2.name, up[1].p1.name, up[1].p2.name], ['Ann', 'Eve', 'Ivy', 'Gus']);
});

test('upcoming: a finished group\'s tie for a place that goes through shows its tie-breaks before the other groups end', () => {
  const t = tour().setup({ A: ['Ann', 'Bob'], B: ['Cat', 'Dan'], C: ['Eve', 'Fay'], D: ['Ivy', 'Jon', 'Kim'] }).start();
  t.win('Ivy', 'Jon', 1).win('Jon', 'Kim', 1).win('Kim', 'Ivy', 1); // D is over: a 3-way tie for 1st, all 1 win and 1 ball
  const tbs = (list) => list.filter((m) => m.stage === 'tiebreak').map((m) => [m.p1.id, m.p2.id].join('-'));
  const before = snapshot(t.s);
  assert.equal(tbs(before.upcoming).length, 3); // every one against every one
  assert.equal(before.upcoming.findIndex((m) => m.stage !== 'tiebreak'), 3); // before the play-off
  assert.ok(before.upcoming.every((m) => m.upcoming && m.p1 && m.p2));
  assert.equal(t.pending('tiebreak').length, 0); // not created yet
  t.win('Ann', 'Bob', 1).win('Cat', 'Dan', 1).win('Eve', 'Fay', 1);
  const after = snapshot(t.s);
  assert.deepEqual(tbs(after.queue), tbs(before.upcoming)); // the same matches, in the same order
  assert.deepEqual(tbs(after.upcoming), []); // now in the queue, not foreseen twice
});

test('upcoming: a tie for a place that does not go through foresees nothing', () => {
  const t = tour().setup({ A: ['Ann', 'Bob'], B: ['Cat', 'Dan'], C: ['Eve', 'Fay'], D: ['Ivy', 'Jon', 'Kim', 'Lou'] }).start();
  t.win('Ivy', 'Jon', 3).win('Ivy', 'Kim', 3).win('Ivy', 'Lou', 3); // Ivy wins D
  t.win('Jon', 'Kim', 1).win('Kim', 'Lou', 1).win('Lou', 'Jon', 1); // the rest tied for 2nd: with 4 groups only winners go
  assert.deepEqual(snapshot(t.s).upcoming.map((m) => m.stage), ['playoff', 'playoff', 'playoff', 'playoff']);
});
