import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import NotificationLink from "@/components/NotificationLink";

export function SiteHeader({ authenticated = false, unreadNotifications = 0 }: { authenticated?: boolean; unreadNotifications?: number }) {
  return (
    <header className="border-b border-foreground/15 px-4 py-3">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4" aria-label="Primary navigation">
        <Link className="font-display text-2xl" href="/">CY//MATCH</Link>
        <div className="flex items-center gap-4 font-mono text-sm"><Link href="/">Home</Link><Link href="/discover">Discover</Link><Link href="/profile">Profile</Link>{authenticated && <Link href="/messages">Messages</Link>}{authenticated && <NotificationLink initialUnread={unreadNotifications} key={unreadNotifications} />}{authenticated && <LogoutButton />}</div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return <footer className="mt-auto border-t border-foreground/15 px-4 py-4 text-center legal-footer">CyberLife monitors all interactions to ensure optimal social harmony.</footer>;
}
