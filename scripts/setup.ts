import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureEnvironment() {
  const envPath = join(process.cwd(), ".env");
  if (existsSync(envPath)) return;

  const examplePath = join(process.cwd(), ".env.example");
  copyFileSync(examplePath, envPath);
  const env = readFileSync(envPath, "utf8").replace(
    "JWT_SECRET=replace-with-a-long-random-secret",
    `JWT_SECRET=${randomBytes(32).toString("hex")}`,
  );
  writeFileSync(envPath, env, { mode: 0o600 });
  console.log("Created .env with a local JWT secret. Configure Resend before testing emails.");
}

function main() {
  ensureEnvironment();
  console.log("\nDatabase must already be running: npm run db:start\n");
  run("npm", ["run", "db:migrate"]);
  run("npm", ["run", "db:seed"]);
  run("npm", ["run", "lint"]);
  run("npx", ["tsc", "--noEmit", "--incremental", "false"]);
  console.log("\nSetup complete. Start the app with: npm run dev");
}

main();
