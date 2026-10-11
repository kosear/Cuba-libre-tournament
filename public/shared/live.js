// Live connection shared by the TV and admin pages.
// - Subscribes to SSE, calls onState(state) with every new snapshot.
// - Reloads the page when the server runs a different commit (a deploy happened),
//   so the TV never keeps old JS/CSS after an update.
// - EventSource reconnects by itself; onStatus(true/false) reports the connection.
// - The server pings every 15 s. A connection silent for longer than STALE_MS is treated as dead
//   and reopened: a dropped Wi-Fi often leaves the old stream hanging without an error.
// - The state is also loaded right away and again on every stale check, without waiting for SSE: some TV browsers
//   (Yandex Browser TV lite) open the stream but never deliver its events, the page would stay empty.
//   For the same reason the commit is also checked over /api/health, so such a TV still reloads after a deploy.
const STALE_MS = 40_000;

export function live({ stateUrl = '/api/state', onState, onStatus = () => {} }) {
  let commit = null;
  let es = null;
  let lastSeen = Date.now();

  async function load() {
    try {
      const res = await fetch(stateUrl, { cache: 'no-store' });
      if (res.status === 401) { location.href = '/admin/login.html'; return; }
      if (res.ok) onState(await res.json());
    } catch {
      // Network hiccup: keep showing the last state; SSE reconnect will load again.
    }
  }

  function sameCommit(c) {
    if (commit && c !== commit) { location.reload(); return false; }
    commit = c;
    return true;
  }

  async function checkCommit() {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (res.ok) sameCommit((await res.json()).commit);
    } catch {
      // offline: the next check will try again
    }
  }

  function seen() {
    lastSeen = Date.now();
    onStatus(true);
  }

  function connect() {
    es?.close();
    lastSeen = Date.now();
    es = new EventSource('/api/events');
    es.addEventListener('hello', (e) => {
      if (!sameCommit(JSON.parse(e.data).commit)) return;
      seen();
      load();
    });
    es.addEventListener('state', () => { seen(); load(); });
    es.addEventListener('ping', seen);
    es.onerror = () => onStatus(false);
  }

  setInterval(() => {
    if (Date.now() - lastSeen > STALE_MS) {
      onStatus(false);
      checkCommit();
      load();
      connect();
    }
  }, 5000);

  checkCommit();
  load();
  connect();
  return { reload: load };
}
