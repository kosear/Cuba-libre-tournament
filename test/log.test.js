// Action log on a real (temporary) SQLite database: idempotency and offline conflicts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DB_FILE = path.join(os.tmpdir(), `cubalibre-test-${process.pid}.db`);
process.env.DB_PATH = DB_FILE;
const { db, migrate } = await import('../src/db.js');
const log = await import('../src/tournament.js');
const { DomainError } = await import('../src/domain/engine.js');

migrate();
const ann = db.prepare("INSERT INTO admins (username, password_hash) VALUES ('ann', 'x')").run().lastInsertRowid;
const bob = db.prepare("INSERT INTO admins (username, password_hash) VALUES ('bob', 'x')").run().lastInsertRowid;
test.after(() => {
  db.close();
  for (const f of [DB_FILE, `${DB_FILE}-wal`, `${DB_FILE}-shm`]) fs.rmSync(f, { force: true });
});

let n = 0;
const add = (adminId, type, payload, extra = {}) => log.addAction({ clientId: `c${++n}`, type, payload, adminId, ...extra });
const fails = (code, fn) => assert.throws(fn, (e) => e instanceof DomainError && e.code === code);

test('setup and start', () => {
  add(ann, 'group.add', { id: 'A', name: 'Group A' });
  for (const p of ['a1', 'a2', 'a3', 'a4']) add(ann, 'player.add', { id: p, name: p, groupId: 'A' });
  add(ann, 'tournament.start', { seed: 7 });
  assert.equal(log.getTournamentState().phase, 'groups');
});

test('a retried action is stored once', () => {
  const m = log.getTournamentState().queue[0];
  const a = { clientId: 'retry-1', type: 'match.result', payload: { id: m, winner: 1, balls: 2 }, adminId: ann };
  assert.deepEqual(log.addAction(a), { duplicate: false });
  assert.deepEqual(log.addAction(a), { duplicate: true });
});

test('offline conflict: the same match recorded by two admins, the first one wins', () => {
  const base = log.logHead();
  const m = log.getTournamentState().queue[0];
  add(ann, 'match.result', { id: m, winner: 1, balls: 3 }, { base });
  fails('conflict', () => add(bob, 'match.result', { id: m, winner: 2, balls: 0 }, { base }));
  assert.equal(log.getTournamentState().matches[m].winner, 1);
  // The same admin may correct their own result made on the same old view.
  add(ann, 'match.result', { id: m, winner: 1, balls: 5 }, { base });
  assert.equal(log.getTournamentState().matches[m].balls, 5);
});

test('offline actions on different things do not conflict', () => {
  const base = log.logHead();
  const [m1, m2] = log.getTournamentState().queue;
  add(ann, 'match.result', { id: m1, winner: 1, balls: 0 }, { base });
  add(bob, 'match.result', { id: m2, winner: 2, balls: 1 }, { base });
  add(bob, 'player.rename', { id: 'a1', name: 'Alice' }, { base });
  assert.equal(log.getTournamentState().players.a1.name, 'Alice');
});

test('a newer view of the change is not a conflict', () => {
  const m = log.getTournamentState().queue[0];
  add(ann, 'match.result', { id: m, winner: 1, balls: 0 }, { base: log.logHead() });
  add(bob, 'match.result', { id: m, winner: 2, balls: 0 }, { base: log.logHead() });
  assert.equal(log.getTournamentState().matches[m].winner, 2);
});

test('actions made for a previous tournament are rejected', () => {
  const tid = log.currentTournamentId();
  log.newTournament(ann);
  fails('tournament_changed', () => add(bob, 'group.add', { id: 'X', name: 'X' }, { tournamentId: tid }));
  add(bob, 'group.add', { id: 'X', name: 'X' }, { tournamentId: log.currentTournamentId() });
});
