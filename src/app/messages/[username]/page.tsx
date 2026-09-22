import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ChatClient from "./ChatClient";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import Image from "next/image";
import { characterFor } from "@/lib/characters";

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

  const character = characterFor(partner.username);
  return <main className="site-grid cyber-page relative overflow-hidden py-8"><Link className="absolute left-[40%] top-8 z-10 text-4xl text-[#6e86a5]" href="/messages">←</Link><p className="absolute left-[68%] top-10 z-10 text-lg">Private line</p><section className="grid min-h-[calc(100vh-9rem)] grid-cols-1 gap-8 lg:grid-cols-[35%_1fr]"><div className="relative hidden overflow-hidden lg:block"><Image alt={`${partner.first_name} ${partner.last_name}`} className="absolute bottom-0 left-1/2 h-[88%] w-auto max-w-none -translate-x-1/2 object-contain" priority src={character.image} /><p className="absolute bottom-24 left-1/2 w-80 -translate-x-1/2 bg-[#1f57a4] px-8 py-3 text-center text-2xl text-white">{character.model} - {partner.first_name}</p></div><div className="relative pt-20"><ChatClient initialMessages={initialMessages} ownUsername={ownUser.username} partnerUsername={partner.username} /></div></section></main>;
}
