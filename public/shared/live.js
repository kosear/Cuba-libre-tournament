// Live connection shared by the TV and admin pages.
// - Subscribes to SSE, calls onState(state) with every new snapshot.
// - Reloads the page when the server runs a different commit (a deploy happened),
//   so the TV never keeps old JS/CSS after an update.
// - EventSource reconnects by itself; onStatus(true/false) reports the connection.
export function live({ stateUrl = '/api/state', onState, onStatus = () => {} }) {
  let commit = null;

  async function load() {
    try {
      const res = await fetch(stateUrl, { cache: 'no-store' });
      if (res.status === 401) { location.href = '/admin/login.html'; return; }
      if (res.ok) onState(await res.json());
    } catch {
      // Network hiccup: keep showing the last state; SSE reconnect will load again.
    }
  }

  const es = new EventSource('/api/events');
  es.addEventListener('hello', (e) => {
    const c = JSON.parse(e.data).commit;
    if (commit && c !== commit) { location.reload(); return; }
    commit = c;
    onStatus(true);
    load();
  });
  es.addEventListener('state', () => load());
  es.onerror = () => onStatus(false);
  return { reload: load };
}
