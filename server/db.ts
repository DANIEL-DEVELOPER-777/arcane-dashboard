import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure the pg Pool with sensible timeouts so connection attempts fail fast
// when the database is unreachable instead of hanging indefinitely.
const connectionString = process.env.DATABASE_URL;
const wantSsl = process.env.DATABASE_SSL === 'true' || process.env.PGSSLMODE === 'require' || /sslmode=(require|verify-full|require-full)/i.test(connectionString || '');

export const pool = new Pool({
  connectionString,
  // milliseconds to wait for a connection to be established
  connectionTimeoutMillis: 5000,
  // maximum number of clients in the pool
  max: 10,
  // milliseconds a client must sit idle in the pool before being closed
  idleTimeoutMillis: 30000,
  // optionally enable SSL (useful for managed DBs that require it)
  ...(wantSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  // allow the process to exit even if clients are idle
  allowExitOnIdle: true,
});

pool.on('error', (err: any) => {
  console.error('Postgres pool error:', err);
});

export const db = drizzle(pool, { schema });
