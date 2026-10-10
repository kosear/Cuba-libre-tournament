// Match order: round robin inside a group, groups take turns (A, B, C, A, ...),
// and every player gets as long a rest between matches as possible.
import { rng } from './random.js';

/** All pairs of a round robin, listed round by round (circle method). */
export function roundRobinPairs(ids) {
  const list = [...ids];
  if (list.length < 2) return [];
  if (list.length % 2) list.push(null);
  const n = list.length;
  const pairs = [];
  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a !== null && b !== null) pairs.push(round % 2 ? [b, a] : [a, b]);
    }
    list.splice(1, 0, list.pop());
  }
  return pairs;
}

/**
 * Interleave matches of several groups into one queue.
 * @param {Array<Array<{p1,p2}>>} perGroup matches of each group, in round order
 * @returns flat ordered list
 */
export function interleave(perGroup) {
  const remaining = perGroup.map((list) => [...list]);
  const last = new Map(); // player -> index of their last match in the queue
  const out = [];
  let g = 0;
  while (remaining.some((l) => l.length)) {
    while (!remaining[g].length) g = (g + 1) % remaining.length;
    const list = remaining[g];
    const rest = (p) => (last.has(p) ? out.length - last.get(p) : Infinity);
    let best = 0;
    let bestRest = -1;
    list.forEach((m, i) => {
      const r = Math.min(rest(m.p1), rest(m.p2));
      if (r > bestRest) { best = i; bestRest = r; }
    });
    const [m] = list.splice(best, 1);
    last.set(m.p1, out.length);
    last.set(m.p2, out.length);
    out.push(m);
    g = (g + 1) % remaining.length;
  }
  return out;
}

/**
 * Where to insert the matches of a player who joined after the start.
 * Index 0 of the queue is the match being played now and is never displaced.
 * @param {number} queueLength current queue length
 * @param {number} count number of new matches
 * @param {boolean} catchUp the rest of the group has finished: first match goes right after the current one
 * @param {number} seed
 * @returns {number[]} final indices of the new matches in the resulting queue, ascending
 */
export function lateInsertPositions(queueLength, count, catchUp, seed) {
  const first = queueLength > 0 ? 1 : 0; // never in front of the match being played
  const free = Math.max(queueLength - first, 0); // existing matches after the current one
  const total = free + count;
  if (!count) return [];
  const positions = [];
  if (catchUp) {
    // First match right away, the others spread evenly over the rest of the queue.
    positions.push(first);
    for (let k = 1; k < count; k++) positions.push(first + Math.round((k * total) / count));
  } else {
    // One random slot inside each of `count` equal segments: random, but evenly spaced.
    const next = rng(seed);
    for (let k = 0; k < count; k++) {
      const from = Math.floor((k * total) / count);
      const to = Math.floor(((k + 1) * total) / count) - 1;
      positions.push(first + from + Math.floor(next() * (to - from + 1)));
    }
  }
  // Keep positions strictly increasing and not adjacent when there is room.
  for (let i = 1; i < positions.length; i++) {
    const gap = total >= count * 2 - 1 ? 2 : 1;
    if (positions[i] < positions[i - 1] + gap) positions[i] = positions[i - 1] + gap;
  }
  const max = first + total - 1;
  for (let i = positions.length - 1; i >= 0; i--) {
    const limit = max - (positions.length - 1 - i);
    if (positions[i] > limit) positions[i] = limit;
  }
  return positions;
}
