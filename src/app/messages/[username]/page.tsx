import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ChatClient from "./ChatClient";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";

interface Partner { id: string; username: string; first_name: string; last_name: string }
interface OwnUser { username: string }
interface MessageRow { id: string; sender_username: string; content: string; created_at: Date }

export default async function MessagesPage({ params }: { params: Promise<{ username: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const { username } = await params;
  const [{ rows: partners }, { rows: ownUsers }] = await Promise.all([
    query<Partner>(
      `SELECT u.id, u.username, u.first_name, u.last_name
       FROM users u
       WHERE u.username = $1 AND u.is_verified = TRUE
         AND EXISTS (SELECT 1 FROM likes WHERE liker_id = $2 AND liked_id = u.id)
         AND EXISTS (SELECT 1 FROM likes WHERE liker_id = u.id AND liked_id = $2)
         AND NOT EXISTS (
           SELECT 1 FROM blocks b
           WHERE (b.blocker_id = $2 AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = $2)
         )`,
      [username, userId],
    ),
    query<OwnUser>("SELECT username FROM users WHERE id = $1", [userId]),
  ]);
  const partner = partners[0];
  const ownUser = ownUsers[0];
  if (!partner || !ownUser) notFound();

  const { rows } = await query<MessageRow>(
    `SELECT * FROM (
       SELECT m.id, sender.username AS sender_username, m.content, m.created_at
       FROM messages m
       JOIN users sender ON sender.id = m.sender_id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at DESC LIMIT 100
     ) conversation
     ORDER BY created_at ASC`,
    [userId, partner.id],
  );
  const initialMessages = rows.map((message) => ({ ...message, created_at: message.created_at.toISOString() }));

  return <main className="mx-auto w-full max-w-3xl px-4 py-10"><Link className="font-mono text-sm underline" href={`/users/${partner.username}`}>← Back to profile</Link><p className="font-mono mt-8 text-xs uppercase tracking-[0.2em] opacity-50">Secure connection channel</p><h1 className="font-display mt-2 text-5xl">{partner.first_name} {partner.last_name}</h1><p className="mt-2 opacity-70">You are connected through mutual likes. Messages are delivered in real time.</p><ChatClient initialMessages={initialMessages} ownUsername={ownUser.username} partnerUsername={partner.username} /></main>;
}
