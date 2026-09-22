import "dotenv/config";
import bcrypt from "bcrypt";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const tags = ["art", "cinema", "cooking", "gaming", "hiking", "music", "reading", "sport", "travel", "tech"];
const cities = [
  ["Paris", 48.8566, 2.3522],
  ["Lyon", 45.764, 4.8357],
  ["Lille", 50.6292, 3.0573],
  ["Bordeaux", 44.8378, -0.5792],
  ["Marseille", 43.2965, 5.3698],
] as const;

async function main() {
  const passwordHash = await bcrypt.hash("FixtureMatcha!42", 12);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tagIds = new Map<string, string>();
    for (const name of tags) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO tags (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [name],
      );
      tagIds.set(name, rows[0].id);
    }

    for (let index = 1; index <= 500; index += 1) {
      const padded = String(index).padStart(3, "0");
      const [city, latitude, longitude] = cities[index % cities.length];
      const gender = ["male", "female", "non_binary"][index % 3];
      const preference = ["male", "female", "bisexual"][index % 3];
      const birthDate = `${1980 + (index % 25)}-${String((index % 12) + 1).padStart(2, "0")}-${String((index % 28) + 1).padStart(2, "0")}`;
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO users (
          email, username, serial_number, first_name, last_name, password_hash,
          birth_date, gender, sexual_preference, bio, city, location_source,
          latitude, longitude, is_verified, fame_rating
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::gender_enum, $9::preference_enum, $10, $11, 'approximate', $12, $13, TRUE, $14)
        ON CONFLICT (username) DO UPDATE SET is_verified = TRUE
        RETURNING id`,
        [`fixture-${padded}@cymatch.local`, `fixture-${padded}`, `FX-${padded}`, `Unit${padded}`, "Fixture", passwordHash, birthDate, gender, preference, `Fixture profile ${padded} for local discovery testing.`, city, latitude, longitude, index % 100],
      );
      const userId = rows[0].id;
      for (const offset of [0, 3, 7]) {
        await client.query(
          "INSERT INTO user_tags (user_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [userId, tagIds.get(tags[(index + offset) % tags.length])],
        );
      }
      await client.query(
        `INSERT INTO photos (user_id, url, is_profile)
         SELECT $1, '/logo.svg', TRUE
         WHERE NOT EXISTS (SELECT 1 FROM photos WHERE user_id = $1)`,
        [userId],
      );
      await client.query(
        `UPDATE users SET profile_photo_id = (
          SELECT id FROM photos WHERE user_id = $1 AND is_profile = TRUE LIMIT 1
        ) WHERE id = $1`,
        [userId],
      );
    }
    await client.query("COMMIT");
    console.log("Seed ready: 500 fixture profiles (password: FixtureMatcha!42).");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error("Fixture seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => pool.end());
