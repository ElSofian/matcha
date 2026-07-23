import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { generateToken } from "@/lib/tokens";
import { requestPasswordResetSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestPasswordResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { email } = parsed.data;

  const { rows } = await query<{ id: string }>(
    "SELECT id FROM users WHERE email = $1",
    [email],
  );

  // Always behave the same whether or not the email exists, to avoid
  // leaking which emails are registered.
  if (rows.length > 0) {
    const token = generateToken();
    await query(
      `INSERT INTO email_tokens (user_id, token, type, expires_at)
       VALUES ($1, $2, 'password_reset', NOW() + INTERVAL '1 hour')`,
      [rows[0].id, token],
    );
    await sendPasswordResetEmail(email, token);
  }

  return NextResponse.json({
    message: "If this email is registered, a reset link has been sent.",
  });
}
