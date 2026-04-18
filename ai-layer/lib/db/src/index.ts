// ============================================================
// LIB/DB/SRC/INDEX.TS — Database Layer
// FIXED: Proper TypeScript types for db (was typed as unknown)
// ============================================================

import * as schema from "./schema/index.js";

export { schema };

const HAS_DB = !!(process.env["DATABASE_URL"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pool: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;

if (HAS_DB) {
  try {
    const pg = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const Pool = pg.default.Pool;
    _pool = new Pool({
      connectionString: process.env["DATABASE_URL"],
      max: 20,                   // FIX: connection pool limit
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    _db = drizzle(_pool, { schema });
  } catch (err) {
    console.warn("[DB] Failed to connect to PostgreSQL — running in local-state-only mode", err);
  }
}

export const pool = _pool;
export const db   = _db;
export const dbMode: "postgres" | "local" = HAS_DB && _db ? "postgres" : "local";

export * from "./schema/index.js";

export function isDbAvailable(): boolean {
  return dbMode === "postgres" && !!_db;
}

export function getDbInfo() {
  return {
    mode:      dbMode,
    connected: isDbAvailable(),
    hasUrl:    HAS_DB,
    message:   isDbAvailable()
      ? "Connected to PostgreSQL"
      : "Running in local-state-only mode (no DATABASE_URL)",
  };
}
