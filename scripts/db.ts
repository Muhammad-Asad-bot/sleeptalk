/**
 * Database CLI:  npm run db:migrate | db:seed | db:reset
 *
 * Works against DATABASE_URL (PostgreSQL) or the embedded PGlite store in ./.data/pglite.
 * PGlite is single-process — stop `next dev` before running these against it.
 */
import fs from "node:fs";
import { sql } from "drizzle-orm";
import { connectForScript, databaseKind, migrationsFolder, pgliteDir } from "../src/db/client";
import { markets } from "../src/db/schema";

async function migrate() {
  const db = await connectForScript();
  if (databaseKind() === "postgres") {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(db, { migrationsFolder });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as never, { migrationsFolder });
  }
  console.info(`[db] Migrations applied (${databaseKind()}).`);
  return db;
}

async function main() {
  const command = process.argv[2];
  if (command === "migrate") {
    await migrate();
  } else if (command === "seed") {
    const db = await migrate();
    const existing = await db.select().from(markets).limit(1);
    if (existing.length) {
      console.info("[db] Data already present — ensuring admin account only.");
      const { ensureAdmin } = await import("../src/db/seed");
      await ensureAdmin(db);
    } else {
      const { seed } = await import("../src/db/seed");
      await seed(db);
    }
  } else if (command === "reset") {
    if (databaseKind() === "postgres") {
      if (process.env.ALLOW_DB_RESET !== "true") {
        throw new Error("Refusing to reset PostgreSQL. Set ALLOW_DB_RESET=true to confirm (destroys all data).");
      }
      const db = await connectForScript();
      await db.execute(sql`DROP SCHEMA public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;`);
    } else {
      fs.rmSync(pgliteDir(), { recursive: true, force: true });
      console.info(`[db] Removed embedded database at ${pgliteDir()}`);
    }
    const db = await migrate();
    const { seed } = await import("../src/db/seed");
    await seed(db);
  } else {
    console.error("Usage: db.ts <migrate|seed|reset>");
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
