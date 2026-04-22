import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(process.cwd(), 'pm-system.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,
      email           TEXT    UNIQUE,
      password_hash   TEXT,
      role            TEXT,
      is_admin        INTEGER NOT NULL DEFAULT 0,
      can_see_master  INTEGER NOT NULL DEFAULT 1,
      can_see_spec    INTEGER NOT NULL DEFAULT 1,
      can_see_design  INTEGER NOT NULL DEFAULT 1,
      can_see_dev     INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token       TEXT    PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at  TEXT    NOT NULL,
      created_at  TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id                  TEXT    PRIMARY KEY,
      parent_id           TEXT    REFERENCES tasks(id) ON DELETE SET NULL,
      sequence            INTEGER NOT NULL,
      title               TEXT    NOT NULL,
      description         TEXT,
      responsible_team    TEXT    NOT NULL CHECK(responsible_team IN ('Specification','Design','Development')),
      status              TEXT    NOT NULL,
      priority            TEXT    NOT NULL DEFAULT 'Medium' CHECK(priority IN ('Low','Medium','High','Urgent')),
      assignee_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
      backend_dev_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      frontend_dev_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      backend_effort      REAL,
      frontend_effort     REAL,
      tests_passed        INTEGER NOT NULL DEFAULT 0,
      sort_order          INTEGER NOT NULL DEFAULT 0,
      is_archived         INTEGER NOT NULL DEFAULT 0,
      archived_sprint_id  INTEGER REFERENCES sprints(id),
      created_at          TEXT    DEFAULT (datetime('now')),
      updated_at          TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      start_date TEXT    NOT NULL,
      end_date   TEXT    NOT NULL,
      created_at TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_vacations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      start_date TEXT    NOT NULL,
      end_date   TEXT    NOT NULL,
      note       TEXT,
      created_at TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_links (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id    TEXT    NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      url        TEXT    NOT NULL,
      label      TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS comments (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id           TEXT    NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
      author_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
      author_name       TEXT,
      body              TEXT    NOT NULL,
      created_at        TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sprints (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      sprint_order      INTEGER NOT NULL UNIQUE,
      name              TEXT    NOT NULL,
      start_date        TEXT,
      code_freeze_date  TEXT,
      status            TEXT    NOT NULL DEFAULT 'active',
      completed_at      TEXT,
      preprod_date      TEXT,
      prod_date         TEXT,
      sprint_number     INTEGER,
      updated_at        TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type        TEXT    NOT NULL,
      message     TEXT    NOT NULL,
      link        TEXT,
      is_read     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_vacations_user    ON user_vacations(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_team_status ON tasks(responsible_team, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_sequence    ON tasks(sequence);
    CREATE INDEX IF NOT EXISTS idx_comments_task     ON comments(task_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token    ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  `);

  // ── Column migrations ─────────────────────────────────────────────────────
  const userCols = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  const addUserCol = (col: string, def: string) => {
    if (!userCols.some(c => c.name === col))
      db.exec(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
  };
  addUserCol('role',           'TEXT');
  addUserCol('password_hash',  'TEXT');
  addUserCol('is_admin',       'INTEGER NOT NULL DEFAULT 0');
  addUserCol('can_see_master', 'INTEGER NOT NULL DEFAULT 1');
  addUserCol('can_see_spec',   'INTEGER NOT NULL DEFAULT 1');
  addUserCol('can_see_design', 'INTEGER NOT NULL DEFAULT 1');
  addUserCol('can_see_dev',    'INTEGER NOT NULL DEFAULT 1');

  const taskCols = db.prepare("PRAGMA table_info(tasks)").all() as Array<{ name: string }>;
  for (const col of ['dev_start_date', 'dev_end_date', 'test_start_date', 'test_end_date']) {
    if (!taskCols.some(c => c.name === col))
      db.exec(`ALTER TABLE tasks ADD COLUMN ${col} TEXT`);
  }
  if (!taskCols.some(c => c.name === 'is_archived'))
    db.exec('ALTER TABLE tasks ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0');
  if (!taskCols.some(c => c.name === 'archived_sprint_id'))
    db.exec('ALTER TABLE tasks ADD COLUMN archived_sprint_id INTEGER REFERENCES sprints(id)');

  const sprintCols = db.prepare("PRAGMA table_info(sprints)").all() as Array<{ name: string }>;
  const addSprintCol = (col: string, def: string) => {
    if (!sprintCols.some(c => c.name === col))
      db.exec(`ALTER TABLE sprints ADD COLUMN ${col} ${def}`);
  };
  addSprintCol('status',             "TEXT NOT NULL DEFAULT 'active'");
  addSprintCol('completed_at',       'TEXT');
  addSprintCol('preprod_date',       'TEXT');
  addSprintCol('prod_date',          'TEXT');
  addSprintCol('sprint_number',      'INTEGER');
  addSprintCol('testing_start_date', 'TEXT');
  addSprintCol('testing_end_date',   'TEXT');
  addSprintCol('qa_date',            'TEXT');

  if (!taskCols.some(c => c.name === 'wip_from_sprint_id'))
    db.exec('ALTER TABLE tasks ADD COLUMN wip_from_sprint_id INTEGER REFERENCES sprints(id)');

  addUserCol('daily_hours', 'REAL');

  // ── Seed admin user ───────────────────────────────────────────────────────
  const adminEmail = 'danielba@elad.co.il';
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existing) {
    const hash = bcrypt.hashSync('6474546', 10);
    db.prepare(`
      INSERT INTO users (name, email, password_hash, is_admin,
        can_see_master, can_see_spec, can_see_design, can_see_dev)
      VALUES (?, ?, ?, 1, 1, 1, 1, 1)
    `).run('דני בן עמי', adminEmail, hash);
  }

  // ── Seed default sprints ──────────────────────────────────────────────────
  db.prepare("INSERT OR IGNORE INTO sprints (sprint_order, name) VALUES (0, 'ספרינט נוכחי')").run();
  db.prepare("INSERT OR IGNORE INTO sprints (sprint_order, name) VALUES (1, 'ספרינט הבא')").run();
  db.prepare("INSERT OR IGNORE INTO sprints (sprint_order, name) VALUES (2, 'ספרינט הבא הבא')").run();

  // Clean expired sessions
  db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
}

// ── Session helpers ───────────────────────────────────────────────────────────

export function createSession(userId: number): string {
  const db = getDb();
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  return token;
}

export function getUserBySession(token: string) {
  const db = getDb();
  return db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.is_admin,
           u.can_see_master, u.can_see_spec, u.can_see_design, u.can_see_dev
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token) as SessionUser | undefined;
}

export function deleteSession(token: string): void {
  getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: string | null;
  is_admin: number;
  can_see_master: number;
  can_see_spec: number;
  can_see_design: number;
  can_see_dev: number;
}

// ── Task ID helpers ───────────────────────────────────────────────────────────

export function getNextTaskId(): { id: string; sequence: number } {
  const db = getDb();
  const row = db.prepare('SELECT MAX(sequence) as maxSeq FROM tasks').get() as { maxSeq: number | null };
  const sequence = (row.maxSeq ?? 0) + 1;
  return { id: String(sequence), sequence };
}

export function getDuplicateTaskId(parentId: string, parentSequence: number): string {
  const db = getDb();
  let decimal = 5;
  while (decimal < 100) {
    const candidateId = `${parentSequence}.${decimal}`;
    if (!db.prepare('SELECT id FROM tasks WHERE id = ?').get(candidateId)) return candidateId;
    decimal++;
  }
  return `${parentSequence}.${Date.now()}`;
}

export default getDb;
