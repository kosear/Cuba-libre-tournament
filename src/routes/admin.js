// Admin API: mutations. Protected by Basic auth (see auth.js).
// Pattern for every mutation: write to DB -> broadcast('state', getState()).
// Broadcasting the full state is the simplest reliable approach for one bar.
import { Router } from 'express';
import { db } from '../db.js';
import { broadcast } from '../events.js';
import { getState } from './public.js';

export const adminRoutes = Router();

adminRoutes.post('/messages', (req, res) => {
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text is required' });
  const info = db.prepare('INSERT INTO messages (text) VALUES (?)').run(text);
  broadcast('state', getState());
  res.status(201).json({ id: info.lastInsertRowid });
});

adminRoutes.delete('/messages/:id', (req, res) => {
  db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  broadcast('state', getState());
  res.status(204).end();
});
