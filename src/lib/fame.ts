import { query } from "@/lib/db";

// Fame is public and capped at 100. It is based only on observable social
// activity: active received likes, mutual likes, and unique profile visitors
// over the last 30 days. Recomputing it avoids counters drifting after unlike
// or block operations.
const fameUpdate = `UPDATE users u
     SET fame_rating = LEAST(100,
       (SELECT COUNT(*) * 10 FROM likes received WHERE received.liked_id = u.id)
       +
       (SELECT COUNT(*) * 15
        FROM likes received
        WHERE received.liked_id = u.id
          AND EXISTS (SELECT 1 FROM likes returned WHERE returned.liker_id = u.id AND returned.liked_id = received.liker_id))
       +
       (SELECT COUNT(DISTINCT viewed.viewer_id) * 2
        FROM profile_views viewed
        WHERE viewed.viewed_id = u.id AND viewed.viewed_at > NOW() - INTERVAL '30 days')
     )
`;

export async function refreshFameRating(userId: string) {
  await query(`${fameUpdate} WHERE u.id = $1`, [userId]);
}

export async function refreshAllFameRatings() {
  await query(fameUpdate);
}
