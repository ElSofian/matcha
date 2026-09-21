import "dotenv/config";
import bcrypt from "bcrypt";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const passwordHash = await bcrypt.hash("MatchaDemo!42", 12);
  await pool.query(
    `INSERT INTO users (
      email, username, serial_number, first_name, last_name, password_hash,
      birth_date, gender, sexual_preference, bio, city, location_source,
      is_verified
    ) VALUES (
      'demo@cymatch.local', 'demo-unit', 'RK800-DEV-001', 'Demo', 'Unit', $1,
      '1998-06-15', 'non_binary', 'bisexual',
      'Development account for local Matcha testing.', 'Paris', 'approximate',
      TRUE
    )
    ON CONFLICT (username) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        is_verified = TRUE,
        updated_at = NOW()`,
    [passwordHash],
  );

  console.log("Development account ready: demo-unit / MatchaDemo!42");
}

main()
  .catch((error) => {
    console.error("Development seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
