// Public API: read-only, used by the TV screen. No auth.
import { Router } from 'express';
import { getTournamentState } from '../tournament.js';
import { snapshot } from '../domain/view.js';

export const publicRoutes = Router();

// Full state snapshot. TV loads this on start and after every SSE reconnect.
export function getState() {
  return {
    tournament: snapshot(getTournamentState()),
    now: new Date().toISOString(),
  };
}

publicRoutes.get('/state', (req, res) => res.json(getState()));
