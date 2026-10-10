// Manage admin accounts from the command line (run in the project folder).
//   node scripts/admin.js list
//   node scripts/admin.js add <username> <password>
//   node scripts/admin.js passwd <username> <password>   (also logs the admin out everywhere)
//   node scripts/admin.js remove <username>
// On the server run it as the app user, from /srv/cubalibre/prod or /srv/cubalibre/dev:
//   runuser -u cubalibre -- node scripts/admin.js list

import { db, migrate } from '../src/db.js';
import { hashPassword } from '../src/auth.js';

migrate();
const [cmd, username, password] = process.argv.slice(2);

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function findAdmin(name) {
  const admin = db.prepare('SELECT id FROM admins WHERE username = ?').get(name);
  if (!admin) fail(`no admin "${name}"`);
  return admin;
}

switch (cmd) {
  case 'list': {
    const rows = db.prepare('SELECT username, created_at FROM admins ORDER BY id').all();
    if (!rows.length) console.log('no admins');
    for (const r of rows) console.log(`${r.username}\t(created ${r.created_at} UTC)`);
    break;
  }
  case 'add': {
    if (!username || !password) fail('usage: add <username> <password>');
    if (password.length < 6) fail('password must be at least 6 characters');
    try {
      db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hashPassword(password));
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) fail(`admin "${username}" already exists`);
      throw e;
    }
    console.log(`added admin "${username}"`);
    break;
  }
  case 'passwd': {
    if (!username || !password) fail('usage: passwd <username> <password>');
    if (password.length < 6) fail('password must be at least 6 characters');
    const admin = findAdmin(username);
    db.transaction(() => {
      db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hashPassword(password), admin.id);
      db.prepare('DELETE FROM sessions WHERE admin_id = ?').run(admin.id);
    })();
    console.log(`password changed for "${username}", all sessions closed`);
    break;
  }
  case 'remove': {
    if (!username) fail('usage: remove <username>');
    db.prepare('DELETE FROM admins WHERE id = ?').run(findAdmin(username).id);
    console.log(`removed admin "${username}"`);
    break;
  }
  default:
    fail('usage: node scripts/admin.js list | add <user> <pass> | passwd <user> <pass> | remove <user>');
}
