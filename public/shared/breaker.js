// Who breaks in a match: a coin toss that comes from the match id, not from Math.random(), so every screen
// (the TV's call screen, the LIVE tags, the admin page) and every reload shows the same player.

/** 1 if p1 breaks, 2 if p2 does; null if a player is missing. */
export function breaker(m) {
  if (!m?.id || !m.p1 || !m.p2) return null;
  let h = 2166136261; // FNV-1a over the id
  for (const c of String(m.id)) h = Math.imul(h ^ c.codePointAt(0), 16777619);
  h ^= h >>> 15; // mix the high bits down: close ids must not give the same side
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return (h & 1) + 1;
}
