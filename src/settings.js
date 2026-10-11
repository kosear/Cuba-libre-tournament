// Screen settings an admin switches from the admin page; every screen gets them with the state.
import { db } from './db.js';

const DEFAULTS = { lizards: false }; // lizards: lots of geckos and butterflies on every screen

export function getSettings() {
  const out = { ...DEFAULTS };
  for (const r of db.prepare('SELECT key, value FROM settings').all()) if (r.key in DEFAULTS) out[r.key] = JSON.parse(r.value);
  return out;
}

export function setSetting(key, value) {
  if (!(key in DEFAULTS) || typeof value !== typeof DEFAULTS[key]) throw new Error(`bad setting ${key}`);
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, JSON.stringify(value));
}
