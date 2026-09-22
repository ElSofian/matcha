import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";

interface ConversationRow {
  username: string;
  first_name: string;
  last_name: string;
  is_online: boolean;
  last_seen: Date | null;
  profile_photo_url: string | null;
  last_message: string | null;
  last_message_at: Date | null;
  unread_messages: number;
}

export default async function MessagesPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const { rows: conversations } = await query<ConversationRow>(
    `SELECT u.username, u.first_name, u.last_name, u.is_online, u.last_seen,
            photo.url AS profile_photo_url, latest.content AS last_message,
            latest.created_at AS last_message_at,
            (
              SELECT COUNT(*)::int FROM notifications n
              WHERE n.user_id = $1 AND n.from_user_id = u.id
                AND n.type = 'message' AND n.is_read = FALSE
            ) AS unread_messages
     FROM users u
     JOIN photos photo ON photo.user_id = u.id AND photo.is_profile = TRUE
     LEFT JOIN LATERAL (
       SELECT content, created_at FROM messages
       WHERE (sender_id = $1 AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = $1)
       ORDER BY created_at DESC LIMIT 1
     ) latest ON TRUE
     WHERE u.is_verified = TRUE
       AND EXISTS (SELECT 1 FROM likes WHERE liker_id = $1 AND liked_id = u.id)
       AND EXISTS (SELECT 1 FROM likes WHERE liker_id = u.id AND liked_id = $1)
       AND NOT EXISTS (
         SELECT 1 FROM blocks b
         WHERE (b.blocker_id = $1 AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = $1)
       )
     ORDER BY latest.created_at DESC NULLS LAST, u.first_name, u.last_name`,
    [userId],
  );

  return <main className="mx-auto w-full max-w-4xl px-4 py-10"><p className="font-mono text-xs uppercase tracking-[0.2em] opacity-50">Connection channels</p><h1 className="font-display mt-2 text-5xl">Messages</h1><p className="mt-3 opacity-70">Only mutual connections can appear here or exchange messages.</p><ul className="mt-8 divide-y divide-foreground/15 border-y border-foreground/15">{conversations.map((conversation) => <li key={conversation.username}><Link className="flex items-center gap-4 py-4 transition hover:bg-white/50" href={`/messages/${conversation.username}`}>{conversation.profile_photo_url && <Image alt="" className="size-14 object-cover" height={56} src={conversation.profile_photo_url} width={56} />}<div className="min-w-0 flex-1"><h2 className="font-display text-2xl">{conversation.first_name} {conversation.last_name}</h2><p className="font-mono text-xs opacity-60">@{conversation.username} · {conversation.is_online ? "Online" : conversation.last_seen ? `Last seen ${conversation.last_seen.toLocaleString()}` : "Offline"}</p><p className="mt-1 truncate text-sm opacity-75">{conversation.last_message ?? "No messages yet."}</p></div>{conversation.unread_messages > 0 && <span aria-label={`${conversation.unread_messages} unread messages`} className="grid size-6 place-items-center rounded-full bg-accent font-mono text-xs text-background">{conversation.unread_messages > 9 ? "9+" : conversation.unread_messages}</span>}</Link></li>)}</ul>{conversations.length === 0 && <p className="mt-6 border border-foreground/15 p-4 opacity-70">No mutual connections yet. Like a profile that likes you back to start a conversation.</p>}</main>;
}
