import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL as string;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${APP_URL}/login?error=invalid_token`);
  }

  const userId = await withTransaction(async (client) => {
    const { rows } = await client.query<{ user_id: string }>(
      `UPDATE email_tokens
       SET used = TRUE
       WHERE token = $1 AND type = 'email_verification'
         AND used = FALSE AND expires_at > NOW()
       RETURNING user_id`,
      [hashToken(token)],
    );

    if (rows.length === 0) {
      return null;
    }

    await client.query("UPDATE users SET is_verified = TRUE WHERE id = $1", [
      rows[0].user_id,
    ]);

    return rows[0].user_id;
  });

  if (!userId) {
    return NextResponse.redirect(`${APP_URL}/login?error=invalid_token`);
  }

  return NextResponse.redirect(`${APP_URL}/login?verified=1`);
}
