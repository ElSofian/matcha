"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type ActivityNotification = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  type: "like" | "unlike" | "view" | "message" | "match";
  is_read: boolean;
  created_at: string;
};

const labels: Record<ActivityNotification["type"], string> = {
  like: "liked your profile",
  unlike: "removed their like",
  view: "viewed your profile",
  message: "sent you a message",
  match: "is now connected with you",
};

function date(value: string) {
  return new Date(value).toLocaleString();
}

export default function NotificationList({ initialNotifications }: { initialNotifications: ActivityNotification[] }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function markRead(notificationId?: string) {
    setPending(notificationId ?? "all");
    setError(null);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationId ? { action: "mark-read", notificationId } : { action: "mark-all-read" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to update notifications.");
      setNotifications((current) => current.map((notification) => notificationId && notification.id !== notificationId ? notification : { ...notification, is_read: true }));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update notifications.");
    } finally {
      setPending(null);
    }
  }

  const hasUnread = notifications.some((notification) => !notification.is_read);
  return <section className="mt-10"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[0.2em] opacity-50">Notification feed</p><h2 className="font-display text-3xl">Notifications</h2></div><button className="border border-foreground/30 px-3 py-2 font-mono text-sm disabled:opacity-50" disabled={!hasUnread || pending !== null} onClick={() => markRead()} type="button">{pending === "all" ? "Updating…" : "Mark all read"}</button></div>{error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}<ul className="mt-4 divide-y divide-foreground/15 border-y border-foreground/15">{notifications.map((notification) => <li className={`flex items-center justify-between gap-4 py-3 ${notification.is_read ? "opacity-60" : ""}`} key={notification.id}><div><Link className="font-medium underline" href={`/users/${notification.username}`}>{notification.first_name} {notification.last_name}</Link><span className="ml-1">{labels[notification.type]}</span><p className="font-mono text-xs opacity-60">{date(notification.created_at)}</p></div>{!notification.is_read && <button className="shrink-0 font-mono text-xs underline disabled:opacity-50" disabled={pending !== null} onClick={() => markRead(notification.id)} type="button">{pending === notification.id ? "…" : "Mark read"}</button>}</li>)}</ul>{notifications.length === 0 && <p className="mt-4 border border-foreground/15 p-4 opacity-70">No visible notifications yet.</p>}</section>;
}
