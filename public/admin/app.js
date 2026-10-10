// Temporary admin page until the real admin panel (plan, stage 2).
import { live } from '/shared/live.js';

document.getElementById('logout').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.href = '/admin/login.html';
});

fetch('/api/auth/me').then((r) => (r.status === 401 ? (location.href = '/admin/login.html') : r.json())).then((me) => {
  if (me) document.getElementById('me').textContent = me.username;
});

live({
  stateUrl: '/api/admin/state',
  onState: ({ tournament: t, journal: j }) => {
    document.getElementById('summary').textContent = `Phase: ${t.phase}. Players: ${t.players.length}. Actions: ${j.entries.length}.`;
  },
});
