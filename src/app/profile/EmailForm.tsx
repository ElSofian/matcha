"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket-client";

export default function EmailForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    try {
      const response = await fetch("/api/account/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, currentPassword }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to update email.");
      setEmail(payload.email);
      setCurrentPassword("");
      setStatus(payload.message);
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Unable to update email.");
    } finally {
      setPending(false);
    }
  }

  async function deleteAccount() { setPending(true); setStatus(null); try { const response = await fetch("/api/account/email", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: deletePassword }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Unable to delete account."); getSocket().disconnect(); router.push("/login"); router.refresh(); } catch (cause) { setStatus(cause instanceof Error ? cause.message : "Unable to delete account."); setPending(false); } }

  return <section className="mt-12 border-t border-foreground/15 pt-8"><h2 className="font-display text-3xl">Account email</h2><p className="mt-1 text-sm opacity-70">Confirm your current password before changing the sign-in email address.</p><form className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto]" onSubmit={submit}><label>Email<input autoComplete="email" className="mt-1 w-full border border-foreground/20 bg-white/70 px-3 py-2 outline-none focus:border-accent" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label><label>Current password<input autoComplete="current-password" className="mt-1 w-full border border-foreground/20 bg-white/70 px-3 py-2 outline-none focus:border-accent" onChange={(event) => setCurrentPassword(event.target.value)} required type="password" value={currentPassword} /></label><div className="flex items-end"><button className="bg-foreground px-4 py-2 font-mono text-sm text-background disabled:opacity-50" disabled={pending} type="submit">{pending ? "Saving…" : "Update email"}</button></div></form><div className="mt-8 border border-red-700/30 p-4"><h3 className="font-display text-2xl text-red-700">Delete account</h3><p className="mt-1 text-sm">This permanently deletes your profile, photos, matches, messages and related data.</p><button className="mt-3 border border-red-700 px-3 py-2 font-mono text-sm text-red-700" onClick={() => setDeleteOpen(true)} type="button">Delete my account</button></div>{deleteOpen && <div aria-labelledby="delete-account-title" className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="alertdialog"><div className="w-full max-w-sm border border-red-700 bg-background p-6 shadow-xl"><h3 className="font-display text-3xl text-red-700" id="delete-account-title">Delete account?</h3><p className="mt-2 text-sm">This cannot be undone. Enter your current password to confirm.</p><input autoComplete="current-password" className="mt-4 w-full border border-foreground/25 bg-transparent p-2" onChange={(event) => setDeletePassword(event.target.value)} placeholder="Current password" type="password" value={deletePassword} /><div className="mt-5 flex justify-end gap-3"><button className="border border-foreground/30 px-3 py-2 font-mono text-sm" disabled={pending} onClick={() => setDeleteOpen(false)} type="button">Cancel</button><button className="bg-red-700 px-3 py-2 font-mono text-sm text-white disabled:opacity-50" disabled={pending || !deletePassword} onClick={deleteAccount} type="button">{pending ? "Deleting…" : "Delete permanently"}</button></div></div></div>}{status && <p className="mt-3 font-mono text-sm" role="status">{status}</p>}</section>;
}
