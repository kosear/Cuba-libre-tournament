// TV screen. No interaction: load state, subscribe to SSE, re-render on every event.
const $content = document.getElementById('content');
const $status = document.getElementById('status');
const $clock = document.getElementById('clock');

function render(state) {
  if (!state.messages.length) {
    $content.innerHTML = '<p class="muted">Nothing yet</p>';
    return;
  }
  $content.innerHTML = '<ul>' + state.messages.map((m) => `<li>${escapeHtml(m.text)}</li>`).join('') + '</ul>';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function loadState() {
  const res = await fetch('/api/state');
  render(await res.json());
}

function connect() {
  const es = new EventSource('/api/events');
  es.onopen = () => { $status.textContent = 'online'; $status.className = 'status online'; loadState(); };
  es.onerror = () => { $status.textContent = 'offline'; $status.className = 'status offline'; };
  es.addEventListener('state', (e) => render(JSON.parse(e.data)));
}

setInterval(() => { $clock.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }, 1000);
connect();
