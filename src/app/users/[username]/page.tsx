import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";

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
    `SELECT id, username, first_name, last_name, birth_date, gender, sexual_preference,
            bio, city, fame_rating, is_online, last_seen
     FROM users WHERE username = $1 AND is_verified = TRUE`,
    [username],
  );
  const user = rows[0];
  if (!user) notFound();

  if (user.id !== viewerId) {
    await query("INSERT INTO profile_views (viewer_id, viewed_id) VALUES ($1, $2)", [viewerId, user.id]);
  }
  const [{ rows: photos }, { rows: tags }] = await Promise.all([
    query<Photo>("SELECT id, url, is_profile FROM photos WHERE user_id = $1 ORDER BY is_profile DESC, created_at", [user.id]),
    query<Tag>(`SELECT t.id, t.name FROM tags t JOIN user_tags ut ON ut.tag_id = t.id WHERE ut.user_id = $1 ORDER BY t.name`, [user.id]),
  ]);
  const profilePhoto = photos.find((photo) => photo.is_profile) ?? photos[0];
  const userAge = age(user.birth_date);

  return <main className="mx-auto w-full max-w-3xl px-4 py-10"><p className="font-mono text-xs uppercase tracking-[0.2em] opacity-50">Public unit profile</p><h1 className="font-display mt-2 text-5xl">{user.first_name} {user.last_name}</h1><p className="font-mono mt-1 opacity-60">@{user.username} · Fame {user.fame_rating}</p>{profilePhoto && <Image alt={`${user.first_name}'s profile`} className="mt-6 aspect-square w-full max-w-md object-cover" height={600} loading="eager" src={profilePhoto.url} width={600} />}<dl className="mt-6 grid gap-3 sm:grid-cols-2"><div><dt>Age</dt><dd>{userAge ?? "Not specified"}</dd></div><div><dt>Location</dt><dd>{user.city ?? "Not specified"}</dd></div><div><dt>Status</dt><dd>{user.is_online ? "Online" : user.last_seen ? `Last seen ${user.last_seen.toLocaleDateString()}` : "Offline"}</dd></div><div><dt>Compatibility</dt><dd>{user.gender ?? "Not specified"} · {user.sexual_preference}</dd></div></dl>{user.bio && <p className="mt-6 whitespace-pre-wrap">{user.bio}</p>}<div className="mt-6 flex flex-wrap gap-2">{tags.map((tag) => <span className="border border-foreground/20 px-2 py-1 font-mono text-sm" key={tag.id}>{tag.name}</span>)}</div></main>;
}
