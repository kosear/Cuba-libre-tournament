// Server-Sent Events hub.
// TV screens (and admin pages) subscribe to GET /api/events.
// Any handler that changes data calls broadcast(type, payload) and every
// connected client receives it instantly. EventSource in the browser
// reconnects automatically if the server restarts.

const clients = new Set();

export function sseHandler(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 1000\n\n');
  clients.add(res);
  req.on('close', () => clients.delete(res));
}

export function broadcast(type, payload = {}) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) res.write(msg);
}

// Heartbeat keeps proxies (Caddy) from closing idle connections.
setInterval(() => {
  for (const res of clients) res.write(': ping\n\n');
}, 25_000).unref();

export function clientCount() {
  return clients.size;
}
