import Link from "next/link";
import { redirect } from "next/navigation";
import NotificationList, { type ActivityNotification } from "./NotificationList";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";

interface PersonRow {
  username: string;
  first_name: string;
  last_name: string;
  fame_rating: number;
  happened_at: Date;
  is_match?: boolean;
}

function PersonList({ people, empty, label, likes = false }: { people: PersonRow[]; empty: string; label: string; likes?: boolean }) {
  return <section className="surface p-5"><p className="eyebrow">{label}</p><ul className="mt-4 divide-y divide-foreground/15">{people.map((person) => <li className="flex items-center justify-between gap-3 py-3" key={person.username}><div><Link className="font-display text-2xl hover:text-accent" href={`/users/${person.username}`}>{person.first_name} {person.last_name}</Link><p className="font-mono text-xs opacity-60">@{person.username} · Fame {person.fame_rating} · {person.happened_at.toLocaleString()}</p></div>{likes && person.is_match && <Link className="ghost-button shrink-0 !px-3 !py-2" href={`/messages/${person.username}`}>Chat ↗</Link>}</li>)}</ul>{people.length === 0 && <p className="mt-4 text-sm opacity-70">{empty}</p>}</section>;
}

export default async function ActivityPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const [{ rows: visitors }, { rows: likes }, { rows: notifications }] = await Promise.all([
    query<PersonRow>(
      `SELECT * FROM (
         SELECT DISTINCT ON (u.id) u.username, u.first_name, u.last_name, u.fame_rating, pv.viewed_at AS happened_at
         FROM profile_views pv
         JOIN users u ON u.id = pv.viewer_id
         WHERE pv.viewed_id = $1
           AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = $1 AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = $1))
         ORDER BY u.id, pv.viewed_at DESC
       ) recent_visitors
       ORDER BY happened_at DESC LIMIT 50`,
      [userId],
    ),
    query<PersonRow>(
      `SELECT u.username, u.first_name, u.last_name, u.fame_rating, l.created_at AS happened_at,
              EXISTS (SELECT 1 FROM likes mine WHERE mine.liker_id = $1 AND mine.liked_id = l.liker_id) AS is_match
       FROM likes l
       JOIN users u ON u.id = l.liker_id
       WHERE l.liked_id = $1
         AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = $1 AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = $1))
       ORDER BY l.created_at DESC LIMIT 50`,
      [userId],
    ),
    query<ActivityNotification>(
      `SELECT n.id, u.username, u.first_name, u.last_name, n.type, n.is_read, n.created_at
       FROM notifications n
       JOIN users u ON u.id = n.from_user_id
       WHERE n.user_id = $1
         AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = $1 AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = $1))
       ORDER BY n.created_at DESC LIMIT 50`,
      [userId],
    ),
  ]);

  const serializedNotifications = notifications.map((notification) => ({ ...notification, created_at: new Date(notification.created_at).toISOString() }));
  return <main className="site-grid py-12 sm:py-16"><p className="cyber-label">Activity</p><div className="mt-5 border-b border-[#c6d0da] pb-8"><h1 className="text-5xl font-light">Your activity</h1><p className="mt-3 max-w-xl text-[#6f8099]">Review profile visits, received likes and recent notifications.</p></div><div className="mt-8 grid gap-5 md:grid-cols-2"><PersonList empty="No profile visits yet." label="Recent profile visitors" people={visitors} /><PersonList empty="No active likes received yet." label="Profiles that like you" likes people={likes} /></div><NotificationList initialNotifications={serializedNotifications} /></main>;
}
