import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { characterFor } from "@/lib/characters";

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

  return <main className="site-grid cyber-page py-16"><label className="cyber-frame block"><span className="corner-tr" /><span className="corner-bl" /><input className="w-full border-0 px-5 py-4 text-xl" placeholder="Search through your conversations..." type="search" /></label><div className="mt-10 grid min-h-[52rem] gap-7 lg:grid-cols-[25rem_1fr]"><section className="cyber-frame cyber-panel"><span className="corner-tr" /><span className="corner-bl" /><ul className="px-8 pt-8">{conversations.map((conversation) => { const character = characterFor(conversation.username); return <li className="border-b border-[#d5dce2]" key={conversation.username}><Link className="flex items-center gap-4 py-5" href={`/messages/${conversation.username}`}><div className="relative size-13 shrink-0 overflow-hidden rounded-full bg-[#d9e8f2]"><Image alt="" className="absolute bottom-0 h-full w-auto max-w-none object-contain" src={character.image} /></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><h2 className="text-lg">{character.model} - {conversation.first_name}</h2><span className="text-xs text-[#7a8088]">{conversation.last_message_at?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div><p className="truncate text-sm text-[#656b72]">{conversation.last_message ?? "No messages yet."}</p></div><span className={`size-3 rounded-full ${conversation.is_online ? "bg-[#47ce62]" : "bg-[#8295ad]"}`} /></Link></li>; })}</ul><p className="absolute bottom-4 left-0 right-0 text-center text-sm text-[#7a8088]">{conversations.length} conversation{conversations.length === 1 ? "" : "s"}</p></section><section className="cyber-frame cyber-panel"><span className="corner-tr" /><span className="corner-bl" /></section></div></main>;
}
