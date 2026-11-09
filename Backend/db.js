import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  const dbPath = path.join(__dirname, 'algotrack.db');

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Enable foreign keys
  await dbInstance.run('PRAGMA foreign_keys = ON;');

  // Initialize Tables
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      hashed_password TEXT NOT NULL,
      full_name TEXT,
      college TEXT DEFAULT 'NSUT',
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS connected_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      handle TEXT NOT NULL,
      rating INTEGER DEFAULT 0,
      max_rating INTEGER DEFAULT 0,
      total_solved INTEGER DEFAULT 0,
      last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
    CREATE INDEX IF NOT EXISTS idx_users_college ON users (college);
    CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON connected_accounts (user_id);
    CREATE INDEX IF NOT EXISTS idx_accounts_platform ON connected_accounts (platform);
  `);

  console.log('✅ SQLite Database initialized at:', dbPath);
  return dbInstance;
}
