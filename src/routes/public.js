// Public API: read-only, used by the TV screen. No auth.
import { Router } from 'express';
import { getTournamentState } from '../tournament.js';
import { snapshot } from '../domain/view.js';
import { getSettings } from '../settings.js';

export const publicRoutes = Router();

// TEMPORARY: what the TV's browser sees of the podium mascots' props (podium.js reports), for a bug seen only there.
// Lands in the service log: journalctl -u cubalibre@dev | grep client
publicRoutes.post('/client-log', (req, res) => {
  console.log('[client]', JSON.stringify(req.body).slice(0, 1500));
  res.json({ ok: true });
});

// Full state snapshot. TV loads this on start and after every SSE reconnect.
export function getState() {
  return {
    tournament: snapshot(getTournamentState()),
    settings: getSettings(),
    now: new Date().toISOString(),
  };
}

publicRoutes.get('/state', (req, res) => res.json(getState()));
