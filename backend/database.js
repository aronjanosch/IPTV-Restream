require('dotenv').config();
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'streamhub.db');

// Ensure parent directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT,
    role          TEXT    NOT NULL DEFAULT 'user',
    oidc_sub      TEXT    UNIQUE,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

// Bootstrap: create initial admin from env vars if no users exist yet
async function seedAdminUser() {
  const ADMIN_NAME = process.env.ADMIN_NAME;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) return;

  const count = db.prepare('SELECT COUNT(*) AS cnt FROM users').get();
  if (count.cnt > 0) return;

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  db.prepare(
    'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(ADMIN_NAME, ADMIN_EMAIL.toLowerCase(), hash, 'admin');

  console.log(`Admin user "${ADMIN_NAME}" created from environment variables.`);
}

module.exports = { db, seedAdminUser };
