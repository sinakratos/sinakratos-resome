import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { initialResume, validateResume } from './resume.mjs';

export function database() {
  const filename = path.resolve(process.env.DATABASE_PATH || 'data/resume.sqlite');
  mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS resume_content (
      id INTEGER PRIMARY KEY, content TEXT NOT NULL, revision INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS profile_photos (
      id TEXT PRIMARY KEY, content BLOB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY, failures INTEGER NOT NULL, reset_at INTEGER NOT NULL
    );`);
  return db;
}

export function readResume() {
  const db = database();
  try {
    const row = db.prepare('SELECT content, revision FROM resume_content WHERE id = 1').get();
    return row
      ? { resume: validateResume(JSON.parse(String(row.content))), revision: Number(row.revision) }
      : { resume: initialResume, revision: 0 };
  } finally { db.close(); }
}

export function saveResume(resume, revision) {
  const db = database();
  try {
    const result = revision === 0
      ? db.prepare('INSERT OR IGNORE INTO resume_content (id, content, revision) VALUES (1, ?, 1)').run(JSON.stringify(resume))
      : db.prepare('UPDATE resume_content SET content = ?, revision = revision + 1 WHERE id = 1 AND revision = ?').run(JSON.stringify(resume), revision);
    return Number(result.changes) === 1;
  } finally { db.close(); }
}

export function storePhoto(id, content) {
  const db = database();
  try { db.prepare('INSERT OR IGNORE INTO profile_photos (id, content) VALUES (?, ?)').run(id, content); }
  finally { db.close(); }
}
export function readPhoto(id) {
  const db = database();
  try {
    const row = db.prepare('SELECT content FROM profile_photos WHERE id = ?').get(id);
    return row?.content instanceof Uint8Array ? row.content : null;
  } finally { db.close(); }
}
