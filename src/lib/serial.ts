import { randomInt } from "node:crypto";
import { query } from "./db";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomLetter(): string {
  return LETTERS[randomInt(LETTERS.length)];
}

function randomSerial(): string {
  const prefix = `${randomLetter()}${randomLetter()}`;
  const digits = randomInt(1000, 10000);
  const suffix = randomLetter();
  return `${prefix}-${digits}-${suffix}`;
}

// CyberLife-flavored Serial No., e.g. "SE-4821-B". Backs the subject's
// required unique `username` field but is never chosen by the user.
export async function generateUniqueSerial(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = randomSerial();
    const { rows } = await query<{ exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM users WHERE username = $1) AS exists",
      [candidate],
    );
    if (!rows[0]?.exists) {
      return candidate;
    }
  }
  throw new Error("Could not generate a unique serial number");
}
