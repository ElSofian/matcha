"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket-client";

const labels = {
  like: "New like received",
  unlike: "A connection was removed",
  view: "Your profile was viewed",
  message: "New message received",
  match: "New mutual connection",
};

type IncomingNotification = { type?: keyof typeof labels; fromUsername?: string; preview?: string };

function notificationText(notification: IncomingNotification) {
  if (notification.type !== "message") return notification.type ? labels[notification.type] : "New notification";
  const preview = notification.preview?.trim() ?? "";
  const clipped = preview.length > 100 ? `${preview.slice(0, 100)}…` : preview;
  return `New message from @${notification.fromUsername ?? "unknown"}${clipped ? `: ${clipped}` : ""}`;
}

export default function NotificationLink({ initialUnread }: { initialUnread: number }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(initialUnread);
  const [latest, setLatest] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const visibleConversation = useRef<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const onNotification = (notification: IncomingNotification) => {
      if (notification.type === "message" && notification.fromUsername === visibleConversation.current) return;
      setUnread((current) => current + 1);
      setLatest(notificationText(notification));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setLatest(null), 5000);
    };
    const onUnreadCount = (event: Event) => {
      const count = (event as CustomEvent<{ count?: unknown }>).detail?.count;
      if (typeof count === "number" && count >= 0) setUnread(count);
    };
    const onVisibleMessage = (event: Event) => {
      const username = (event as CustomEvent<{ username?: unknown }>).detail?.username;
      if (typeof username !== "string") return;
      visibleConversation.current = username;
      setTimeout(() => {
        if (visibleConversation.current === username) visibleConversation.current = null;
      }, 1000);
    };
    socket.on("notification:new", onNotification);
    window.addEventListener("matcha:unread-count", onUnreadCount);
    window.addEventListener("matcha:message-visible", onVisibleMessage);
    if (!socket.connected) socket.connect();
    return () => {
      socket.off("notification:new", onNotification);
      window.removeEventListener("matcha:unread-count", onUnreadCount);
      window.removeEventListener("matcha:message-visible", onVisibleMessage);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return <><Link className={`whitespace-nowrap ${pathname === "/activity" ? "text-foreground" : "text-[#7e93b3] hover:text-foreground"}`} href="/activity">Activity{unread > 0 && <span aria-label={`${unread} unread notifications`} className="ml-2 inline-grid min-w-5 place-items-center rounded-full bg-accent px-1 align-middle font-mono text-xs text-white">{unread > 99 ? "99+" : unread}</span>}</Link>{latest && <p className="fixed right-6 top-24 z-50 max-w-sm border border-[#9fc4e0] bg-white px-4 py-3 font-mono text-xs leading-relaxed shadow-lg" role="status">{latest}</p>}</>;
}
