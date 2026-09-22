"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket-client";

type Message = { id: string; sender_username: string; content: string; created_at: string };
type SendResult = { ok: true; message: Message } | { ok: false; error: string };

function time(value: string) {
  return new Date(value).toLocaleString();
}

export default function ChatClient({ initialMessages, partnerUsername, ownUsername }: { initialMessages: Message[]; partnerUsername: string; ownUsername: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const markConversationRead = useCallback(async () => {
    const response = await fetch("/api/notifications/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: partnerUsername }),
    });
    if (!response.ok) return;
    const payload = await response.json() as { unreadCount?: unknown };
    if (typeof payload.unreadCount === "number") {
      window.dispatchEvent(new CustomEvent("matcha:unread-count", { detail: { count: payload.unreadCount } }));
      router.refresh();
    }
  }, [partnerUsername, router]);

  useEffect(() => {
    const socket = getSocket();
    const onMessage = (message: Message) => {
      if (message.sender_username === partnerUsername) {
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
        window.dispatchEvent(new CustomEvent("matcha:message-visible", { detail: { username: partnerUsername } }));
        void markConversationRead();
      }
    };
    socket.on("message:new", onMessage);
    if (!socket.connected) socket.connect();
    return () => {
      socket.off("message:new", onMessage);
    };
  }, [partnerUsername, markConversationRead]);

  useEffect(() => {
    void markConversationRead();
  }, [markConversationRead]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = content.trim();
    if (!text || pending) return;
    setPending(true);
    setStatus(null);
    const socket = getSocket();
    socket.timeout(10_000).emit("message:send", { recipientUsername: partnerUsername, content: text }, (error: Error | null, result: SendResult) => {
      setPending(false);
      if (error) {
        setStatus("Message timeout. Please try again.");
        return;
      }
      if (!result?.ok) {
        setStatus(result?.error ?? "Unable to send the message.");
        return;
      }
      setMessages((current) => current.some((message) => message.id === result.message.id) ? current : [...current, result.message]);
      setContent("");
    });
  }

  return <section className="mt-8"><div className="max-h-[55vh] min-h-72 space-y-3 overflow-y-auto border border-foreground/15 bg-white/60 p-4" aria-live="polite">{messages.map((message) => <article className={`max-w-[85%] p-3 ${message.sender_username === ownUsername ? "ml-auto bg-foreground text-background" : "border border-foreground/20"}`} key={message.id}><p className="font-mono text-xs opacity-70">@{message.sender_username} · {time(message.created_at)}</p><p className="mt-1 whitespace-pre-wrap break-words">{message.content}</p></article>)}{messages.length === 0 && <p className="text-sm opacity-70">No messages yet. Start the conversation.</p>}</div><form className="mt-4 flex gap-3" onSubmit={submit}><label className="sr-only" htmlFor="message-content">Message</label><textarea className="min-h-12 flex-1 border border-foreground/25 bg-white/60 p-3" id="message-content" maxLength={1000} onChange={(event) => setContent(event.target.value)} placeholder="Write a message…" value={content} /><button className="bg-foreground px-5 font-mono text-sm text-background disabled:opacity-50" disabled={pending || !content.trim()} type="submit">{pending ? "Sending…" : "Send"}</button></form>{status && <p className="mt-3 text-sm text-red-700" role="alert">{status}</p>}</section>;
}
