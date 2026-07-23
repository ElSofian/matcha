import { existsSync } from "node:fs";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";

// Local-only dev database: no system PostgreSQL install available in this
// environment, so we run a self-contained Postgres cluster out of .pgdata.
// Keep this script alive while developing (it owns the child process); it
// is never used in production, where DATABASE_URL points at a real server.
const dataDir = join(process.cwd(), ".pgdata");
const alreadyInitialised = existsSync(join(dataDir, "PG_VERSION"));

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "matcha",
  password: "matcha",
  port: 5432,
  persistent: true,
});

async function main() {
  if (!alreadyInitialised) {
    await pg.initialise();
  }
  await pg.start();

  try {
    await pg.createDatabase("matcha");
  } catch {
    // database already exists, ignore
  }

  console.log(
    "Embedded Postgres ready: postgresql://matcha:matcha@localhost:5432/matcha",
  );
  console.log("Press Ctrl+C to stop.");
}

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) {
    // second signal: something's stuck, bail out immediately
    process.exit(0);
  }
  shuttingDown = true;
  console.log(`\nReceived ${signal}, stopping Postgres...`);
  // Safety net in case pg.stop() hangs.
  const forceExit = setTimeout(() => process.exit(0), 5000);
  forceExit.unref();
  await pg.stop();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
