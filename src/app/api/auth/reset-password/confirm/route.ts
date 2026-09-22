import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { checkPasswordStrength } from "@/lib/password";
import { confirmPasswordResetSchema } from "@/lib/validation";
import { hashToken } from "@/lib/tokens";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = confirmPasswordResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { token, password } = parsed.data;

  const { rows } = await query<{ user_id: string; email: string }>(
    `SELECT et.user_id, u.email FROM email_tokens et
     JOIN users u ON u.id = et.user_id
     WHERE et.token = $1 AND et.type = 'password_reset'
       AND et.used = FALSE AND et.expires_at > NOW()`,
    [hashToken(token)],
  );

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 },
    );
  }

  const { user_id: userId, email } = rows[0];

  const strength = checkPasswordStrength(password, [email.split("@")[0]]);
  if (!strength.ok) {
    return NextResponse.json({ error: strength.reason }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  const updated = await withTransaction(async (client) => {
    const { rows: consumed } = await client.query<{ user_id: string }>(
      `UPDATE email_tokens SET used = TRUE
       WHERE token = $1 AND type = 'password_reset' AND used = FALSE AND expires_at > NOW()
       RETURNING user_id`,
      [hashToken(token)],
    );
    if (!consumed[0]) return false;
    await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      passwordHash,
      userId,
    ]);
    return true;
  });

  if (!updated) return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });

  return NextResponse.json({ message: "Access Code updated. You can log in now." });
}
