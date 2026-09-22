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
      className="whitespace-nowrap border-l border-[#cfd9e4] pl-5 text-sm text-[#7e93b3] hover:text-foreground"
    >
      Disconnect
    </button>
  );
}
