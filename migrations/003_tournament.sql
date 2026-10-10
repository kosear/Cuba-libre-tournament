-- Replace the placeholder `messages` table with the tournament action log.
-- The whole tournament state is computed from `actions` (see src/domain/).
DROP TABLE messages;

CREATE TABLE tournaments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- status: 'active' (applied), 'undone' (can be redone), 'discarded' (undone, then a new action was made)
CREATE TABLE actions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  client_id     TEXT NOT NULL UNIQUE,
  admin_id      INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  type          TEXT NOT NULL,
  payload       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX actions_tournament ON actions(tournament_id, id);
