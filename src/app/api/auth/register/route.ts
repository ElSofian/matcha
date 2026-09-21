import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { checkPasswordStrength } from "@/lib/password";
import { sendVerificationEmail } from "@/lib/email";
import { generateUniqueSerial } from "@/lib/serial";
import { generateToken } from "@/lib/tokens";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { email, username, firstName, lastName, password } = parsed.data;

  const strength = checkPasswordStrength(password, [
    email.split("@")[0],
    username,
    firstName,
    lastName,
  ]);
  if (!strength.ok) {
    return NextResponse.json({ error: strength.reason }, { status: 400 });
  }

  const { rows: existing } = await query<{ id: string }>(
    "SELECT id FROM users WHERE email = $1 OR username = $2",
    [email, username],
  );
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "An account already exists for this email or Unit ID." },
      { status: 409 },
    );
  }

  const serialNumber = await generateUniqueSerial();
  const passwordHash = await hashPassword(password);

  const token = generateToken();
  await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO users (email, username, serial_number, first_name, last_name, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [email, username, serialNumber, firstName, lastName, passwordHash],
    );

    await client.query(
      `INSERT INTO email_tokens (user_id, token, type, expires_at)
       VALUES ($1, $2, 'email_verification', NOW() + INTERVAL '1 hour')`,
      [rows[0].id, token],
    );
  });

  await sendVerificationEmail(email, token);

  return NextResponse.json(
    { message: "Account created. Check your email to activate it.", username, serialNumber },
    { status: 201 },
  );
}
