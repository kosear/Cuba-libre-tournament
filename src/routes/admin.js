// Admin API: every change to the tournament is an action in the log (see src/tournament.js).
// Pattern for every mutation: write to DB -> broadcast('state', getState()).
import { Router } from 'express';
import { broadcast } from '../events.js';
import { getState } from './public.js';
import { DomainError } from '../domain/engine.js';
import { addAction, undo, redo, cancelTournament, journal, getTournamentState, currentTournamentId, logHead } from '../tournament.js';
import { snapshot } from '../domain/view.js';
import { getSettings, setSetting } from '../settings.js';

export const adminRoutes = Router();

// raw + head + tournamentId let the page apply its offline actions locally (public/admin/app.js).
function adminState() {
  const raw = getTournamentState();
  const tournamentId = currentTournamentId();
  return { tournament: snapshot(raw), journal: journal(), raw, head: logHead(tournamentId), tournamentId, settings: getSettings() };
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
  const { clientId, type, payload, base, tournamentId } = req.body || {};
  run(res, () => addAction({ clientId, type, payload, adminId: req.admin.id, base, tournamentId }));
});

// Screen settings, e.g. { lizards: true } for lots of geckos on every screen.
adminRoutes.post('/settings', (req, res) => {
  const { lizards } = req.body || {};
  if (typeof lizards !== 'boolean') return res.status(400).json({ error: 'bad_setting' });
  setSetting('lizards', lizards);
  broadcast('state', getState());
  res.json({ ok: true, settings: getSettings() });
});

adminRoutes.post('/undo', (req, res) => run(res, () => { undo(); }));
adminRoutes.post('/redo', (req, res) => run(res, () => { redo(); }));
// Cancel the tournament: the current one is deleted completely, a new empty one starts.
adminRoutes.post('/tournaments', (req, res) => run(res, () => { cancelTournament(req.admin.id); }));
