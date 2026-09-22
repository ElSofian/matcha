"use client";

import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket-client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    getSocket().disconnect();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="font-mono border border-foreground/30 px-4 py-2 text-xs uppercase tracking-[0.15em] transition hover:border-accent hover:text-accent"
    >
      Disconnect
    </button>
  );
}
