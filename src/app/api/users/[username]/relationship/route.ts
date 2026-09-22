import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { refreshFameRating } from "@/lib/fame";
import { getCurrentUserId } from "@/lib/session";
import { relationshipActionSchema } from "@/lib/validation";
import { emitNotification, type RealtimeNotification } from "@/lib/realtime";

interface TargetRow { id: string }
interface RelationRow { viewer_likes: boolean; liked_you: boolean }

function relationship(row: RelationRow) {
  return {
    viewerLikes: row.viewer_likes,
    likedYou: row.liked_you,
    isMatch: row.viewer_likes && row.liked_you,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const viewerId = await getCurrentUserId();
  if (!viewerId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = relationshipActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid action." }, { status: 400 });
  }
  const { username } = await context.params;
  if (!/^[A-Za-z0-9_-]{3,50}$/.test(username)) {
    return NextResponse.json({ error: "Invalid username." }, { status: 400 });
  }

  const realtimeEvents: Array<{ userId: string; notification: RealtimeNotification }> = [];
  let targetId: string | undefined;
  const result = await withTransaction(async (client) => {
    const { rows: targets } = await client.query<TargetRow>(
      "SELECT id FROM users WHERE username = $1 AND is_verified = TRUE",
      [username],
    );
    const target = targets[0];
    if (!target || target.id === viewerId) return { error: "Profile not found.", status: 404 } as const;
    targetId = target.id;

    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext(LEAST($1::text, $2::text) || ':' || GREATEST($1::text, $2::text)))",
      [viewerId, target.id],
    );

    const { rows: blocks } = await client.query<{ blocked: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM blocks
        WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)
      ) AS blocked`,
      [viewerId, target.id],
    );
    const isBlocked = blocks[0].blocked;
    if (isBlocked && parsed.data.action !== "unblock") {
      return { error: "This profile is unavailable.", status: 404 } as const;
    }

    if (parsed.data.action === "like") {
      const { rows: photos } = await client.query<{ has_primary_photo: boolean }>(
        "SELECT EXISTS (SELECT 1 FROM photos WHERE user_id = $1 AND is_profile = TRUE) AS has_primary_photo",
        [viewerId],
      );
      if (!photos[0].has_primary_photo) {
        return { error: "Add a primary photo before liking a profile.", status: 403 } as const;
      }
      const inserted = await client.query(
        "INSERT INTO likes (liker_id, liked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id",
        [viewerId, target.id],
      );
      const { rows: relationRows } = await client.query<RelationRow>(
        `SELECT EXISTS (SELECT 1 FROM likes WHERE liker_id = $1 AND liked_id = $2) AS viewer_likes,
                EXISTS (SELECT 1 FROM likes WHERE liker_id = $2 AND liked_id = $1) AS liked_you`,
        [viewerId, target.id],
      );
      const current = relationship(relationRows[0]);
      if (inserted.rowCount) {
        await client.query(
          "INSERT INTO notifications (user_id, from_user_id, type) VALUES ($1, $2, 'like')",
          [target.id, viewerId],
        );
        realtimeEvents.push({ userId: target.id, notification: { type: "like" } });
        if (current.isMatch) {
          await client.query(
            `INSERT INTO notifications (user_id, from_user_id, type)
             VALUES ($1, $2, 'match'), ($2, $1, 'match')`,
            [viewerId, target.id],
          );
          realtimeEvents.push({ userId: viewerId, notification: { type: "match" } });
          realtimeEvents.push({ userId: target.id, notification: { type: "match" } });
        }
      }
      return { relationship: current, message: current.isMatch ? "It is a match." : "Interest sent." } as const;
    }

    if (parsed.data.action === "unlike") {
      const { rows: beforeRows } = await client.query<RelationRow>(
        `SELECT EXISTS (SELECT 1 FROM likes WHERE liker_id = $1 AND liked_id = $2) AS viewer_likes,
                EXISTS (SELECT 1 FROM likes WHERE liker_id = $2 AND liked_id = $1) AS liked_you`,
        [viewerId, target.id],
      );
      const before = relationship(beforeRows[0]);
      const wasMatch = before.isMatch;
      const deleted = await client.query("DELETE FROM likes WHERE liker_id = $1 AND liked_id = $2", [viewerId, target.id]);
      if (deleted.rowCount && wasMatch) {
        await client.query(
          "INSERT INTO notifications (user_id, from_user_id, type) VALUES ($1, $2, 'unlike')",
          [target.id, viewerId],
        );
        realtimeEvents.push({ userId: target.id, notification: { type: "unlike" } });
      }
      return { relationship: { viewerLikes: false, likedYou: before.likedYou, isMatch: false }, message: "Interest removed." } as const;
    }

    if (parsed.data.action === "block") {
      await client.query("INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [viewerId, target.id]);
      await client.query(
        `DELETE FROM likes
         WHERE (liker_id = $1 AND liked_id = $2) OR (liker_id = $2 AND liked_id = $1)`,
        [viewerId, target.id],
      );
      return { blocked: true, message: "Profile blocked." } as const;
    }

    if (parsed.data.action === "unblock") {
      await client.query("DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2", [viewerId, target.id]);
      return { blocked: false, message: "Profile unblocked." } as const;
    }

    await client.query(
      `INSERT INTO reports (reporter_id, reported_id, reason) VALUES ($1, $2, $3)
       ON CONFLICT (reporter_id, reported_id) DO UPDATE SET reason = EXCLUDED.reason, created_at = NOW()`,
      [viewerId, target.id, parsed.data.reason || null],
    );
    return { message: "Report submitted." } as const;
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  if (targetId) await Promise.all([refreshFameRating(viewerId), refreshFameRating(targetId)]);
  realtimeEvents.forEach((event) => emitNotification(event.userId, event.notification));
  return NextResponse.json(result);
}
