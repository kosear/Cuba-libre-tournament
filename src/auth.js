// HTTP Basic auth for /admin and /api/admin/*.
// User: admin, password: ADMIN_PASSWORD from .env.

export function adminAuth(req, res, next) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return next(); // no password configured => open (dev only)

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':');
    if (user === 'admin' && pass === expected) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="admin"');
  res.status(401).send('Unauthorized');
}
