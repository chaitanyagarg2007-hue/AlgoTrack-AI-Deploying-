import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbWrapper = null;

// Helper to convert SQLite '?' placeholders to Postgres '$1, $2...'
function convertSqlForPostgres(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

export async function getDb() {
  if (dbWrapper) return dbWrapper;

  const rawUrl = process.env.DATABASE_URL || '';
  const isPostgres = rawUrl.startsWith('postgres://') || rawUrl.startsWith('postgresql://');

  if (isPostgres) {
    console.log('🐘 Connecting to PostgreSQL Database in Cloud...');
    const pool = new pg.Pool({
      connectionString: rawUrl,
      ssl: { rejectUnauthorized: false }
    });

    // Create Postgres Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        full_name VARCHAR(255),
        college VARCHAR(255) DEFAULT 'NSUT',
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS connected_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        handle VARCHAR(255) NOT NULL,
        rating INTEGER DEFAULT 0,
        max_rating INTEGER DEFAULT 0,
        total_solved INTEGER DEFAULT 0,
        last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
      CREATE INDEX IF NOT EXISTS idx_users_college ON users (college);
      CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON connected_accounts (user_id);
    `);

    console.log('✅ PostgreSQL Database connected & tables initialized!');

    dbWrapper = {
      isPostgres: true,
      async get(sql, params = []) {
        const pgSql = convertSqlForPostgres(sql);
        const res = await pool.query(pgSql, params);
        return res.rows[0];
      },
      async all(sql, params = []) {
        const pgSql = convertSqlForPostgres(sql);
        const res = await pool.query(pgSql, params);
        return res.rows;
      },
      async run(sql, params = []) {
        let pgSql = convertSqlForPostgres(sql);
        // If it's an INSERT and doesn't have RETURNING, append RETURNING id
        if (/^\s*INSERT\s+INTO/i.test(pgSql) && !/RETURNING/i.test(pgSql)) {
          pgSql += ' RETURNING id';
        }
        const res = await pool.query(pgSql, params);
        return {
          lastID: res.rows[0]?.id || 0,
          changes: res.rowCount
        };
      }
    };

    return dbWrapper;
  }

  // Fallback to SQLite (for local development)
  console.log('📦 Using Local SQLite Database...');
  const dbPath = path.join(__dirname, 'algotrack.db');

  const sqliteDb = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await sqliteDb.run('PRAGMA foreign_keys = ON;');

  await sqliteDb.exec(`
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
  `);

  console.log('✅ SQLite Database initialized at:', dbPath);

  dbWrapper = sqliteDb;
  return dbWrapper;
}
