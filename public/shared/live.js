// Live connection shared by the TV and admin pages.
// - Subscribes to SSE, calls onState(state) with every new snapshot.
// - Reloads the page when the server runs a different commit (a deploy happened),
//   so the TV never keeps old JS/CSS after an update.
// - EventSource reconnects by itself; onStatus(true/false) reports the connection.
// - The server pings every 15 s. A connection silent for longer than STALE_MS is treated as dead
//   and reopened: a dropped Wi-Fi often leaves the old stream hanging without an error.
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

  function seen() {
    lastSeen = Date.now();
    onStatus(true);
  }

  function connect() {
    es?.close();
    lastSeen = Date.now();
    es = new EventSource('/api/events');
    es.addEventListener('hello', (e) => {
      const c = JSON.parse(e.data).commit;
      if (commit && c !== commit) { location.reload(); return; }
      commit = c;
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
      connect();
    }
  }, 5000);

  connect();
  return { reload: load };
}
