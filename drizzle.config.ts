import { defineConfig } from "drizzle-kit";

// Migrations are generated from the schema (no database connection needed):
//   npm run db:generate
// and applied by the app (PGlite in development) or `npm run db:migrate` (PostgreSQL).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
});
