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

  return <section className="flex h-[calc(100vh-13rem)] min-h-[32rem] flex-col"><div className="flex-1 space-y-6 overflow-y-auto px-2 py-5" aria-live="polite">{messages.map((message) => <article className={`max-w-[70%] ${message.sender_username === ownUsername ? "mr-auto" : "ml-auto"}`} key={message.id}><p className={`mb-1 text-right text-xs text-[#555b62] ${message.sender_username === ownUsername ? "pr-5" : ""}`}>{time(message.created_at)}</p><p className={`rounded-[1.45rem] px-5 py-3 text-[1.08rem] leading-snug shadow-sm ${message.sender_username === ownUsername ? "rounded-tl-none bg-[#2059a4] text-white" : "rounded-tr-none border border-[#d4d4d4] bg-white text-[#273d6a]"}`}>{message.content}</p></article>)}{messages.length === 0 && <p className="grid h-full place-items-center text-lg text-[#7a8795]">No messages yet. Start the conversation.</p>}</div><form className="cyber-frame mt-4 flex items-center bg-white" onSubmit={submit}><span className="corner-tr" /><span className="corner-bl" /><label className="sr-only" htmlFor="message-content">Message</label><textarea className="min-h-14 flex-1 border-0 p-3 text-lg" id="message-content" maxLength={1000} onChange={(event) => setContent(event.target.value)} placeholder="Write your answer..." value={content} /><button aria-label="Send message" className="mr-3 grid size-10 place-items-center bg-[#c7edff] text-2xl leading-none" disabled={pending || !content.trim()} type="submit">⌁</button></form>{status && <p className="mt-3 text-sm text-red-700" role="alert">{status}</p>}</section>;
}
