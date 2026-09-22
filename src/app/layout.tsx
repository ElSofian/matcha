import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getCurrentUserId } from "@/lib/session";
import { unreadNotificationCount } from "@/lib/notifications";
import "./globals.css";

export const metadata: Metadata = {
  title: "CY//MATCH",
  description: "CyberLife social compatibility program.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userId = await getCurrentUserId();
  const unreadNotifications = userId ? await unreadNotificationCount(userId) : 0;

  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader authenticated={Boolean(userId)} unreadNotifications={unreadNotifications} />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
