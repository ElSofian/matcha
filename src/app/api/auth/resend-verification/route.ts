import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { isRateLimited } from "@/lib/security";
import { generateToken, hashToken } from "@/lib/tokens";
import { requestPasswordResetSchema } from "@/lib/validation";

const response = () => NextResponse.json({ message: "If this account is awaiting activation, a new link has been sent." });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestPasswordResetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const email = parsed.data.email;
  if (isRateLimited(`verify:${email}`, 3, 60 * 60_000)) return response();
  const { rows } = await query<{ id: string; is_verified: boolean }>("SELECT id, is_verified FROM users WHERE email = $1", [email]);
  const account = rows[0];
  if (!account || account.is_verified) return response();
  const token = generateToken();
  try {
    await withTransaction(async (client) => {
      await client.query("UPDATE email_tokens SET used = TRUE WHERE user_id = $1 AND type = 'email_verification' AND used = FALSE", [account.id]);
      await client.query("INSERT INTO email_tokens (user_id, token, type, expires_at) VALUES ($1, $2, 'email_verification', NOW() + INTERVAL '1 hour')", [account.id, hashToken(token)]);
    });
    await sendVerificationEmail(email, token);
  } catch {
    await query("UPDATE email_tokens SET used = TRUE WHERE token = $1", [hashToken(token)]).catch(() => undefined);
  }
  return response();
}
