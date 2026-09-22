import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { emailChangeSchema } from "@/lib/validation";

interface AccountRow { email: string; password_hash: string }

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = emailChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid email change." }, { status: 400 });
  }

  const { rows } = await query<AccountRow>("SELECT email, password_hash FROM users WHERE id = $1", [userId]);
  const account = rows[0];
  if (!account) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (!(await verifyPassword(parsed.data.currentPassword, account.password_hash))) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
  }
  if (account.email === parsed.data.email) {
    return NextResponse.json({ message: "This email is already in use by your account.", email: account.email });
  }

  const { rows: existing } = await query<{ id: string }>("SELECT id FROM users WHERE email = $1 AND id <> $2", [parsed.data.email, userId]);
  if (existing[0]) return NextResponse.json({ error: "This email address is already in use." }, { status: 409 });

  const { rows: updated } = await query<{ email: string }>(
    "UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2 RETURNING email",
    [parsed.data.email, userId],
  );
  return NextResponse.json({ message: "Email address updated.", email: updated[0].email });
}
