// Deployed git commit. Shown in /api/health and sent to every SSE client,
// so open pages can reload themselves after a deploy.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let commit = 'unknown';
try { commit = execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {}

export const COMMIT = commit;
