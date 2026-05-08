import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'data');
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, 'pglaps.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS task_types (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT    UNIQUE NOT NULL,
    name        TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    icon        TEXT    NOT NULL DEFAULT '📋',
    color       TEXT    NOT NULL DEFAULT '#007bff',
    field_schema TEXT   NOT NULL DEFAULT '[]',
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    type_id       INTEGER NOT NULL REFERENCES task_types(id) ON DELETE RESTRICT,
    name          TEXT    NOT NULL,
    description   TEXT    NOT NULL DEFAULT '',
    location      TEXT    NOT NULL DEFAULT '',
    data          TEXT    NOT NULL DEFAULT '{}',
    waypoints     TEXT    NOT NULL DEFAULT '[]',
    legs          TEXT    NOT NULL DEFAULT '[]',
    xctsk_content TEXT,
    created_at    TEXT    DEFAULT (datetime('now')),
    updated_at    TEXT    DEFAULT (datetime('now'))
  );
`);

export { db };
