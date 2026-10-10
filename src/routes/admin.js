// Admin API: every change to the tournament is an action in the log (see src/tournament.js).
// Pattern for every mutation: write to DB -> broadcast('state', getState()).
import { Router } from 'express';
import { broadcast } from '../events.js';
import { getState } from './public.js';
import { DomainError } from '../domain/engine.js';
import { addAction, undo, redo, newTournament, journal, getTournamentState } from '../tournament.js';
import { snapshot } from '../domain/view.js';

export const adminRoutes = Router();

function adminState() {
  return { tournament: snapshot(getTournamentState()), journal: journal() };
}

// Domain errors become 400 with a code the admin page translates.
function run(res, fn) {
  try {
    const result = fn();
    broadcast('state', getState());
    res.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof DomainError) return res.status(400).json({ error: err.code, params: err.params });
    throw err;
  }
}

adminRoutes.get('/state', (req, res) => res.json(adminState()));

adminRoutes.post('/actions', (req, res) => {
  const { clientId, type, payload } = req.body || {};
  run(res, () => addAction({ clientId, type, payload, adminId: req.admin.id }));
});

adminRoutes.post('/undo', (req, res) => run(res, () => { undo(); }));
adminRoutes.post('/redo', (req, res) => run(res, () => { redo(); }));
adminRoutes.post('/tournaments', (req, res) => run(res, () => { newTournament(req.admin.id); }));
