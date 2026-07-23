import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  signAccessToken,
  verifyPassword,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

interface UserRow {
  id: string;
  password_hash: string;
  is_verified: boolean;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { username, password } = parsed.data;

  const { rows } = await query<UserRow>(
    "SELECT id, password_hash, is_verified FROM users WHERE username = $1",
    [username],
  );

  const invalid = () =>
    NextResponse.json(
      { error: "Invalid Serial No. or Access Code." },
      { status: 401 },
    );

  if (rows.length === 0) {
    return invalid();
  }

  const user = rows[0];
  const validPassword = await verifyPassword(password, user.password_hash);
  if (!validPassword) {
    return invalid();
  }

  if (!user.is_verified) {
    return NextResponse.json(
      { error: "Account not activated yet. Check your email." },
      { status: 403 },
    );
  }

  const token = signAccessToken(user.id);
  const response = NextResponse.json({ message: "Logged in." });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });

  return response;
}
