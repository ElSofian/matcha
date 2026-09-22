import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import ProfileActions from "./ProfileActions";
import { query, withTransaction } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { emitNotification } from "@/lib/realtime";
import { refreshFameRating } from "@/lib/fame";

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

interface Photo { id: string; url: string; is_profile: boolean }
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

  const [{ rows: photos }, { rows: tags }, { rows: relationshipRows }] = await Promise.all([
    query<Photo>("SELECT id, url, is_profile FROM photos WHERE user_id = $1 ORDER BY is_profile DESC, created_at", [user.id]),
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

  const profilePhoto = photos.find((photo) => photo.is_profile) ?? photos[0];
  const userAge = age(user.birth_date);
  const relation = relationshipRows[0];
  const isSelf = user.id === viewerId;

  return <main className="mx-auto w-full max-w-3xl px-4 py-10"><p className="font-mono text-xs uppercase tracking-[0.2em] opacity-50">Public unit profile</p><h1 className="font-display mt-2 text-5xl">{user.first_name} {user.last_name}</h1><p className="font-mono mt-1 opacity-60">@{user.username} · Fame {user.fame_rating}</p>{profilePhoto && <Image alt={`${user.first_name}'s profile`} className="mt-6 aspect-square w-full max-w-md object-cover" height={600} loading="eager" src={profilePhoto.url} width={600} />}<dl className="mt-6 grid gap-3 sm:grid-cols-2"><div><dt>Age</dt><dd>{userAge ?? "Not specified"}</dd></div><div><dt>Location</dt><dd>{user.city ?? "Not specified"}</dd></div><div><dt>Status</dt><dd>{user.is_online ? "Online" : user.last_seen ? `Last seen ${user.last_seen.toLocaleString()}` : "Offline"}</dd></div><div><dt>Compatibility</dt><dd>{user.gender ?? "Not specified"} · {user.sexual_preference}</dd></div></dl>{user.bio && <p className="mt-6 whitespace-pre-wrap">{user.bio}</p>}<div className="mt-6 flex flex-wrap gap-2">{tags.map((tag) => <span className="border border-foreground/20 px-2 py-1 font-mono text-sm" key={tag.id}>{tag.name}</span>)}</div>{!isSelf && <ProfileActions canLike={relation.own_has_primary_photo} initialRelationship={{ viewerLikes: relation.viewer_likes, likedYou: relation.liked_you, isMatch: relation.viewer_likes && relation.liked_you }} username={user.username} />}</main>;
}
