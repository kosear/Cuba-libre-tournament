// Temporary TV page until the real scoreboard (plan, stage 3). Reloads itself after every deploy.
import { live } from '/shared/live.js';

const $content = document.getElementById('content');
const $status = document.getElementById('status');

live({
  onState: ({ tournament: t }) => {
    $content.innerHTML = `<p class="muted">Tournament phase: ${t.phase}. Players: ${t.players.length}. Queue: ${t.queue.length}.</p>`;
  },
  onStatus: (on) => { $status.textContent = on ? 'online' : 'offline'; $status.className = `status ${on ? 'online' : 'offline'}`; },
});
