"use client";

import { FormEvent, useState } from "react";

export default function EmailForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

  return <section className="mt-12 border-t border-foreground/15 pt-8"><h2 className="font-display text-3xl">Account email</h2><p className="mt-1 text-sm opacity-70">Confirm your current password before changing the sign-in email address.</p><form className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto]" onSubmit={submit}><label>Email<input autoComplete="email" className="mt-1 w-full border border-foreground/20 bg-white/70 px-3 py-2 outline-none focus:border-accent" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label><label>Current password<input autoComplete="current-password" className="mt-1 w-full border border-foreground/20 bg-white/70 px-3 py-2 outline-none focus:border-accent" onChange={(event) => setCurrentPassword(event.target.value)} required type="password" value={currentPassword} /></label><div className="flex items-end"><button className="bg-foreground px-4 py-2 font-mono text-sm text-background disabled:opacity-50" disabled={pending} type="submit">{pending ? "Saving…" : "Update email"}</button></div></form>{status && <p className="mt-3 font-mono text-sm" role="status">{status}</p>}</section>;
}
