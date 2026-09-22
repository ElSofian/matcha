import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import ProfileActions from "./ProfileActions";
import { query, withTransaction } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { emitNotification } from "@/lib/realtime";
import { refreshFameRating } from "@/lib/fame";
import { characterFor } from "@/lib/characters";

interface PublicUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  birth_date: Date | null;
  gender: string | null;
  sexual_preference: string;
  bio: string | null;
  city: string | null;
  fame_rating: number;
  is_online: boolean;
  last_seen: Date | null;
}

interface Tag { id: string; name: string }
interface RelationshipRow { viewer_likes: boolean; liked_you: boolean; own_has_primary_photo: boolean }

function age(birthDate: Date | null) {
  if (!birthDate) return null;
  const today = new Date();
  let value = today.getFullYear() - birthDate.getFullYear();
  if (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())) value -= 1;
  return value;
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const viewerId = await getCurrentUserId();
  if (!viewerId) redirect("/login");
  const { username } = await params;
  const { rows } = await query<PublicUser>(
    `SELECT u.id, u.username, u.first_name, u.last_name, u.birth_date, u.gender,
            u.sexual_preference, u.bio, u.city, u.fame_rating, u.is_online, u.last_seen
     FROM users u
     WHERE u.username = $1 AND u.is_verified = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM blocks b
         WHERE (b.blocker_id = $2 AND b.blocked_id = u.id)
            OR (b.blocker_id = u.id AND b.blocked_id = $2)
       )`,
    [username, viewerId],
  );
  const user = rows[0];
  if (!user) notFound();

  const [{ rows: tags }, { rows: relationshipRows }] = await Promise.all([
    query<Tag>(`SELECT t.id, t.name FROM tags t JOIN user_tags ut ON ut.tag_id = t.id WHERE ut.user_id = $1 ORDER BY t.name`, [user.id]),
    query<RelationshipRow>(
      `SELECT
        EXISTS (SELECT 1 FROM likes WHERE liker_id = $1 AND liked_id = $2) AS viewer_likes,
        EXISTS (SELECT 1 FROM likes WHERE liker_id = $2 AND liked_id = $1) AS liked_you,
        EXISTS (SELECT 1 FROM photos WHERE user_id = $1 AND is_profile = TRUE) AS own_has_primary_photo`,
      [viewerId, user.id],
    ),
  ]);
  if (user.id !== viewerId) {
    const notificationCreated = await withTransaction(async (client) => {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext($1::text || ':' || $2::text || ':profile-view'))",
        [viewerId, user.id],
      );
      await client.query("INSERT INTO profile_views (viewer_id, viewed_id) VALUES ($1, $2)", [viewerId, user.id]);
      const { rows: muted } = await client.query<{ exists: boolean }>(
        "SELECT EXISTS (SELECT 1 FROM notification_mutes WHERE user_id = $1 AND muted_user_id = $2) AS exists",
        [user.id, viewerId],
      );
      if (muted[0].exists) return false;
      const { rows: recent } = await client.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM notifications
           WHERE user_id = $1 AND from_user_id = $2 AND type = 'view'
             AND created_at > NOW() - INTERVAL '24 hours'
         ) AS exists`,
        [user.id, viewerId],
      );
      if (recent[0].exists) return false;
      await client.query(
        "INSERT INTO notifications (user_id, from_user_id, type) VALUES ($1, $2, 'view')",
        [user.id, viewerId],
      );
      return true;
    });
    await refreshFameRating(user.id);
    if (notificationCreated) emitNotification(user.id, { type: "view" });
  }

  const userAge = age(user.birth_date);
  const relation = relationshipRows[0];
  const isSelf = user.id === viewerId;
  const character = characterFor(user.username);

  return <main className="site-grid cyber-page relative overflow-hidden"><section className="relative min-h-[calc(100vh-6.5rem)]"><Image alt={`${user.first_name}'s profile`} className="pointer-events-none absolute bottom-0 left-1/2 h-[70vh] w-auto max-w-none -translate-x-1/2 object-contain" priority src={character.image} /><div className="absolute left-3 top-[25%] z-10 max-w-sm sm:left-7"><p className="font-display text-[clamp(3.8rem,7.5vw,7.5rem)] leading-none tracking-[-0.08em]">{character.model}</p><div className="mt-3 flex items-center gap-4"><span className="h-px w-24 bg-foreground" /><h1 className="text-3xl font-medium">{user.first_name}</h1></div><ul className="mt-6 space-y-1.5 text-base"><li>− &nbsp; Age: {userAge ?? "Not specified"}</li><li>− &nbsp; Location: {user.city ?? "Not specified"}</li><li>− &nbsp; Fame rating: {user.fame_rating}</li><li>− &nbsp; Status: {user.is_online ? "Online" : "Offline"}</li></ul>{user.bio && <p className="mt-12 max-w-sm text-base leading-snug">{user.bio}</p>}<div className="mt-6 flex flex-wrap gap-2">{tags.map((tag) => <span className="font-medium" key={tag.id}>#{tag.name}</span>)}</div>{!isSelf && <ProfileActions canLike={relation.own_has_primary_photo} initialRelationship={{ viewerLikes: relation.viewer_likes, likedYou: relation.liked_you, isMatch: relation.viewer_likes && relation.liked_you }} username={user.username} />}</div></section></main>;
}
