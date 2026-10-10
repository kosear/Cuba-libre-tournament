// Admin page. The session cookie is sent automatically with every fetch.
// Any 401 (session expired, or password changed) sends the admin back to the login page.
const $form = document.getElementById('form');
const $text = document.getElementById('text');
const $list = document.getElementById('list');

async function api(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    location.href = '/admin/login.html';
    throw new Error('not authenticated');
  }
  return res;
}

function render(state) {
  $list.innerHTML = state.messages.map((m) =>
    `<li><span>${escapeHtml(m.text)}</span><button class="danger" data-id="${m.id}">×</button></li>`
  ).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

$form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await api('/api/admin/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: $text.value }),
  });
  $text.value = '';
});

$list.addEventListener('click', async (e) => {
  const id = e.target.dataset.id;
  if (id) await api(`/api/admin/messages/${id}`, { method: 'DELETE' });
});

document.getElementById('logout').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.href = '/admin/login.html';
});

api('/api/auth/me').then((r) => r.json()).then((me) => {
  document.getElementById('me').textContent = me.username;
});

// Admin also listens to SSE so the list updates without reload.
const es = new EventSource('/api/events');
es.onopen = () => fetch('/api/state').then((r) => r.json()).then(render);
es.addEventListener('state', (e) => render(JSON.parse(e.data)));
