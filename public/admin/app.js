// Admin page. Browser already sent Basic auth to get here; fetch() reuses it.
const $form = document.getElementById('form');
const $text = document.getElementById('text');
const $list = document.getElementById('list');

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
  await fetch('/api/admin/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: $text.value }),
  });
  $text.value = '';
});

$list.addEventListener('click', async (e) => {
  const id = e.target.dataset.id;
  if (id) await fetch(`/api/admin/messages/${id}`, { method: 'DELETE' });
});

// Admin also listens to SSE so the list updates without reload.
const es = new EventSource('/api/events');
es.onopen = () => fetch('/api/state').then((r) => r.json()).then(render);
es.addEventListener('state', (e) => render(JSON.parse(e.data)));
