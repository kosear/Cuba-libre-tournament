// Public API: read-only, used by the TV screen. No auth.
import { Router } from 'express';
import { db } from '../db.js';

export const publicRoutes = Router();

// Full state snapshot. TV loads this on start and after every SSE reconnect.
// Extend this object as the domain grows; keep it "everything the TV needs".
export function getState() {
  return {
    messages: db.prepare('SELECT * FROM messages ORDER BY id DESC LIMIT 20').all(),
    now: new Date().toISOString(),
  };
}

publicRoutes.get('/state', (req, res) => res.json(getState()));
