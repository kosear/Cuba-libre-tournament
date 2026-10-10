import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { migrate } from './db.js';
import { sseHandler, clientCount } from './events.js';
import { adminAuth } from './auth.js';
import { publicRoutes } from './routes/public.js';
import { adminRoutes } from './routes/admin.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;

// Deployed git commit, shown in /api/health to verify what is running.
let COMMIT = 'unknown';
try { COMMIT = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch {}

migrate();

const app = express();
app.disable('x-powered-by');
app.use(express.json());

// API
app.get('/api/health', (req, res) => res.json({ ok: true, commit: COMMIT, sse_clients: clientCount() }));
app.get('/api/events', sseHandler);
app.use('/api', publicRoutes);
app.use('/api/admin', adminAuth, adminRoutes);

// Static: / -> public/tv, /admin -> public/admin (password protected)
app.use('/admin', adminAuth, express.static(path.join(ROOT, 'public/admin')));
app.use('/', express.static(path.join(ROOT, 'public/tv')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

app.listen(PORT, '127.0.0.1', () => console.log(`[server] listening on http://127.0.0.1:${PORT}`));
