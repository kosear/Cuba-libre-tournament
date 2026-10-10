// Admin authentication: username + password, session cookie.
// Accounts live in the `admins` table and are managed with scripts/admin.js.
// Passwords are hashed with scrypt (node:crypto), sessions are random tokens in `sessions`.

import crypto from 'node:crypto';
import { Router } from 'express';
import { db } from './db.js';

const COOKIE = 'session';
const SESSION_DAYS = 30; // admins log in from their phones; keep them logged in
const FAILED_LOGIN_DELAY_MS = 1000;

// ---------- passwords ----------

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored).split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// ---------- sessions ----------

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function currentAdmin(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) return null;
  return db.prepare(`
    SELECT a.id, a.username FROM sessions s JOIN admins a ON a.id = s.admin_id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token) || null;
}

function setSessionCookie(req, res, token, maxAgeSec) {
  // Secure only over HTTPS (behind Caddy), so local http://localhost still works.
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`);
}

// ---------- middleware ----------

// For /api/admin/*: 401 JSON when not logged in.
export function requireAdminApi(req, res, next) {
  req.admin = currentAdmin(req);
  if (req.admin) return next();
  res.status(401).json({ error: 'not authenticated' });
}

// For /admin pages: redirect to the login page when not logged in.
// The login page itself and shared static files stay public.
const PUBLIC_ADMIN_FILES = new Set(['/login.html', '/login.js', '/style.css', '/sw.js']);
export function requireAdminPage(req, res, next) {
  if (PUBLIC_ADMIN_FILES.has(req.path)) return next();
  req.admin = currentAdmin(req);
  if (req.admin) return next();
  res.redirect('/admin/login.html');
}

// ---------- routes: /api/auth ----------

export const authRoutes = Router();

authRoutes.post('/login', async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const admin = db.prepare('SELECT id, password_hash FROM admins WHERE username = ?').get(username);

  if (!admin || !verifyPassword(password, admin.password_hash)) {
    await new Promise((r) => setTimeout(r, FAILED_LOGIN_DELAY_MS)); // slow down guessing
    return res.status(401).json({ error: 'invalid username or password' });
  }

  db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare(`INSERT INTO sessions (token, admin_id, expires_at) VALUES (?, ?, datetime('now', ?))`)
    .run(token, admin.id, `+${SESSION_DAYS} days`);
  setSessionCookie(req, res, token, SESSION_DAYS * 86400);
  res.json({ ok: true });
});

authRoutes.post('/logout', (req, res) => {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  setSessionCookie(req, res, '', 0);
  res.json({ ok: true });
});

authRoutes.get('/me', (req, res) => {
  const admin = currentAdmin(req);
  if (!admin) return res.status(401).json({ error: 'not authenticated' });
  res.json(admin);
});
