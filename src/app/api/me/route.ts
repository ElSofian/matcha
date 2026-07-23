import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";

interface MeRow {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  fame_rating: number;
  is_verified: boolean;
  created_at: string;
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rows } = await query<MeRow>(
    `SELECT id, username, first_name, last_name, email, fame_rating, is_verified, created_at
     FROM users WHERE id = $1`,
    [userId],
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ user: rows[0] });
}
