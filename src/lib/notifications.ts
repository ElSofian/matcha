import { query } from "@/lib/db";

export async function unreadNotificationCount(userId: string) {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM notifications n
     WHERE n.user_id = $1 AND n.is_read = FALSE
       AND NOT EXISTS (
         SELECT 1 FROM blocks b
         WHERE (b.blocker_id = $1 AND b.blocked_id = n.from_user_id)
            OR (b.blocker_id = n.from_user_id AND b.blocked_id = $1)
       )`,
    [userId],
  );
  return Number(rows[0]?.count ?? 0);
}
