"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationLink from "@/components/NotificationLink";
import LogoutButton from "@/components/LogoutButton";

const items = [
  { href: "/discover", label: "Discover" },
  { href: "/search", label: "Search" },
  { href: "/messages", label: "Messages" },
  { href: "/profile", label: "Profile" },
];

export default function MainNavigation({ unreadNotifications }: { unreadNotifications: number }) {
  const pathname = usePathname();
  return <nav className="site-grid flex items-center gap-6 overflow-x-auto py-6 text-[1.05rem] font-light sm:gap-10 sm:text-[1.45rem]" aria-label="Primary navigation">
    {items.map((item) => <Link className={`whitespace-nowrap ${pathname === item.href || (item.href === "/messages" && pathname.startsWith("/messages/")) ? "text-foreground" : "text-[#7e93b3] hover:text-foreground"}`} href={item.href} key={item.href}>{item.label}</Link>)}
    <NotificationLink initialUnread={unreadNotifications} key={unreadNotifications} />
    <div className="ml-auto"><LogoutButton /></div>
  </nav>;
}
