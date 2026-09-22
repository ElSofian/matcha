import MainNavigation from "@/components/MainNavigation";

export function SiteHeader({ authenticated = false, unreadNotifications = 0 }: { authenticated?: boolean; unreadNotifications?: number }) {
  if (!authenticated) return null;
  return <header><MainNavigation unreadNotifications={unreadNotifications} /></header>;
}

export function SiteFooter() {
  return null;
}
