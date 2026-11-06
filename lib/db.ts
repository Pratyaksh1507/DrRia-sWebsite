import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
  if (!pool) {
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString && typeof window === 'undefined') {
      try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
          const match = fs.readFileSync(envPath, 'utf8').match(/^DATABASE_URL=(.+)$/m);
          if (match) connectionString = match[1].trim();
        }
      } catch {}
    }
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not defined.');
    }

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

export async function queryDb<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const p = getDbPool();
  return p.query<T>(text, params);
}

