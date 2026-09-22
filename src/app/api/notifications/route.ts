import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { action?: unknown; notificationId?: unknown } | null;
  if (!body || (body.action !== "mark-all-read" && body.action !== "mark-read")) {
    return NextResponse.json({ error: "Invalid notification action." }, { status: 400 });
  }
  if (body.action === "mark-read" && !isUuid(body.notificationId)) {
    return NextResponse.json({ error: "Invalid notification identifier." }, { status: 400 });
  }

  if (body.action === "mark-all-read") {
    await query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE", [userId]);
  } else {
    await query("UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2", [body.notificationId, userId]);
  }
  return NextResponse.json({ message: "Notifications updated." });
}
