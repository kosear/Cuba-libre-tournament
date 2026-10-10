import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from './db.js';
import { sseHandler, clientCount } from './events.js';
import { authRoutes, requireAdminApi, requireAdminPage } from './auth.js';
import { publicRoutes } from './routes/public.js';
import { adminRoutes } from './routes/admin.js';
import { COMMIT } from './version.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;

migrate();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback'); // behind Caddy: req.secure reflects the real HTTPS
app.use(express.json());

// API
app.get('/api/health', (req, res) => res.json({ ok: true, commit: COMMIT, sse_clients: clientCount() }));
app.get('/api/events', sseHandler);
app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/admin', requireAdminApi, adminRoutes);

// Static files are always revalidated (ETag), so a reload after a deploy picks up new code.
const staticOpts = { setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache') };

// Static: / -> start screen, /board -> TV scoreboard, /admin -> admin panel (login required, except the login page)
app.use('/shared', express.static(path.join(ROOT, 'public/shared'), staticOpts));
// The rules engine also runs in the admin page, to show actions made offline before they reach the server.
app.use('/domain', express.static(path.join(ROOT, 'src/domain'), staticOpts));
app.use('/assets', express.static(path.join(ROOT, 'public/assets'), staticOpts));
app.use('/admin', requireAdminPage, express.static(path.join(ROOT, 'public/admin'), staticOpts));
app.use('/board', express.static(path.join(ROOT, 'public/board'), staticOpts));
app.use('/lab', express.static(path.join(ROOT, 'public/lab'), staticOpts)); // animation playground, fake data
app.use('/', express.static(path.join(ROOT, 'public/start'), staticOpts));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

app.listen(PORT, '127.0.0.1', () => console.log(`[server] listening on http://127.0.0.1:${PORT} (commit ${COMMIT})`));
