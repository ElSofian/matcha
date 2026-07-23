import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL as string;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${APP_URL}/login?error=invalid_token`);
  }

  const { rows } = await query<{ user_id: string }>(
    `SELECT user_id FROM email_tokens
     WHERE token = $1 AND type = 'email_verification' AND used = FALSE AND expires_at > NOW()`,
    [token],
  );

  if (rows.length === 0) {
    return NextResponse.redirect(`${APP_URL}/login?error=invalid_token`);
  }

  const userId = rows[0].user_id;

  await withTransaction(async (client) => {
    await client.query("UPDATE users SET is_verified = TRUE WHERE id = $1", [
      userId,
    ]);
    await client.query("UPDATE email_tokens SET used = TRUE WHERE token = $1", [
      token,
    ]);
  });

  return NextResponse.redirect(`${APP_URL}/login?verified=1`);
}
