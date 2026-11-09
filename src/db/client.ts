import path from "node:path";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * Database bootstrap.
 *
 *  - DATABASE_URL=postgres://...  → real PostgreSQL via node-postgres (production).
 *  - DATABASE_URL unset / "pglite:<dir>" → embedded PostgreSQL (PGlite) stored on disk
 *    in ./.data/pglite. Migrations run automatically and demo data is seeded on first use.
 *
 * Both drivers expose the same Drizzle PostgreSQL API, so app code is driver-agnostic.
 * NOTE: PGlite is single-process. Stop `next dev` before running `npm run db:*` scripts.
 */
export type Db = NodePgDatabase<typeof schema>;

type GlobalDb = { __sleepTalkDb?: Promise<Db> };
const globalForDb = globalThis as unknown as GlobalDb;

export const migrationsFolder = path.join(process.cwd(), "drizzle");

export function databaseKind(): "postgres" | "pglite" {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgres://") || url.startsWith("postgresql://") ? "postgres" : "pglite";
}

export function pgliteDir() {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("pglite:") ? url.slice("pglite:".length) : path.join(process.cwd(), ".data", "pglite");
}

async function connect(options: { migrate: boolean; autoSeed: boolean }): Promise<Db> {
  if (databaseKind() === "postgres") {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    });
    const db = drizzle(pool, { schema });
    if (options.migrate && process.env.DB_AUTO_MIGRATE === "true") {
      const { migrate } = await import("drizzle-orm/node-postgres/migrator");
      await migrate(db, { migrationsFolder });
    }
    return db;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const fs = await import("node:fs");
  fs.mkdirSync(path.dirname(pgliteDir()), { recursive: true });
  const client = new PGlite(pgliteDir());
  const db = drizzle(client, { schema }) as unknown as Db;
  if (options.migrate) {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as never, { migrationsFolder });
  }
  if (options.autoSeed && process.env.SEED_DEMO_DATA !== "false") {
    const existing = await db.select({ id: schema.markets.code }).from(schema.markets).limit(1);
    if (existing.length === 0) {
      const { seed } = await import("./seed");
      await seed(db);
    }
  }
  return db;
}

/** Shared connection for the Next.js server (memoised across hot reloads). */
export function getDb(): Promise<Db> {
  if (!globalForDb.__sleepTalkDb) {
    globalForDb.__sleepTalkDb = connect({ migrate: true, autoSeed: true }).catch((error) => {
      globalForDb.__sleepTalkDb = undefined;
      throw error;
    });
  }
  return globalForDb.__sleepTalkDb;
}

/** Standalone connection for CLI scripts (no auto-seed). */
export function connectForScript(): Promise<Db> {
  return connect({ migrate: false, autoSeed: false });
}
