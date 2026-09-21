import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

function migrationFiles() {
  const migrationsPath = join(process.cwd(), "migrations");
  return readdirSync(migrationsPath)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((filename) => ({
      filename,
      sql: readFileSync(join(migrationsPath, filename), "utf8"),
    }));
}

async function main() {
  const schemaPath = join(process.cwd(), "docs", "matcha_schema.sql");
  const sql = readFileSync(schemaPath, "utf8");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("SELECT pg_advisory_lock(42420001)");
    const { rows } = await pool.query<{ table_name: string | null }>(
      "SELECT to_regclass('public.users') AS table_name",
    );

    if (!rows[0]?.table_name) {
      await pool.query(sql);
      console.log("Base schema applied successfully.");
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const migration of migrationFiles()) {
      const applied = await pool.query(
        "SELECT 1 FROM schema_migrations WHERE filename = $1",
        [migration.filename],
      );
      if (applied.rowCount) {
        continue;
      }

      await pool.query("BEGIN");
      try {
        await pool.query(migration.sql);
        await pool.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [migration.filename],
        );
        await pool.query("COMMIT");
        console.log(`Applied migration: ${migration.filename}`);
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await pool.query("SELECT pg_advisory_unlock(42420001)").catch(() => undefined);
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Database migration failed.");
  console.error(err);
  process.exit(1);
});
