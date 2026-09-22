import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { unreadNotificationCount } from "@/lib/notifications";
import { getCurrentUserId } from "@/lib/session";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { username?: unknown } | null;
  if (!body || typeof body.username !== "string" || !/^[A-Za-z0-9_-]{3,50}$/.test(body.username)) {
    return NextResponse.json({ error: "Invalid username." }, { status: 400 });
  }

  await query(
    `UPDATE notifications n
     SET is_read = TRUE
     FROM users sender
     WHERE n.user_id = $1 AND n.from_user_id = sender.id
       AND sender.username = $2 AND n.type = 'message' AND n.is_read = FALSE`,
    [userId, body.username],
  );
  return NextResponse.json({ unreadCount: await unreadNotificationCount(userId) });
}
