import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

async function main() {
  const schemaPath = join(process.cwd(), "docs", "matcha_schema.sql");
  const sql = readFileSync(schemaPath, "utf8");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(sql);
    console.log("Schema applied successfully.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed.");
  console.error("name:", err?.name);
  console.error("code:", err?.code);
  console.error("message:", err?.message);
  process.exit(1);
});
