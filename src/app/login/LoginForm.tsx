"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import CornerFrame from "@/components/CornerFrame";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified") === "1";
  const tokenError = searchParams.get("error") === "invalid_token";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification(event: React.FormEvent) {
    event.preventDefault();
    setResendStatus(null);
    const response = await fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: resendEmail }) });
    const data = await response.json();
    setResendStatus(response.ok ? data.message : (data.error ?? "Unable to request a new link."));
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <CornerFrame className="w-full max-w-sm border border-accent/30 bg-white/60 p-8 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-1 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="CyberLife" className="h-12 w-12" />
          <h1 className="font-display text-4xl tracking-wide">CY//MATCH</h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
            CyberLife Social Compatibility Program
          </p>
        </div>

        {verified && (
          <p className="font-mono mb-4 border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">
            Unit activated. You may now log in.
          </p>
        )}
        {tokenError && (
          <p className="font-mono mb-4 border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs text-red-600">
            This activation link is invalid or expired.
          </p>
        )}
        {tokenError && <form className="mb-4 border border-foreground/15 p-3" onSubmit={resendVerification}><p className="font-mono text-xs opacity-70">Need a new activation link?</p><div className="mt-2 flex gap-2"><input aria-label="Email for activation link" className="min-w-0 flex-1 border border-foreground/20 bg-white/70 px-2 py-1 text-sm" onChange={(event) => setResendEmail(event.target.value)} required type="email" value={resendEmail} /><button className="border border-foreground/30 px-2 font-mono text-xs" type="submit">Resend</button></div>{resendStatus && <p className="mt-2 font-mono text-xs" role="status">{resendStatus}</p>}</form>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-60">
              Unit ID
            </span>
            <input
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="connor-rk800"
              className="font-mono border border-foreground/20 bg-white/70 px-3 py-2 outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-60">
              Access Code
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-mono border border-foreground/20 bg-white/70 px-3 py-2 outline-none focus:border-accent"
            />
          </label>

          {error && (
            <p className="font-mono text-xs text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="font-display mt-2 bg-foreground py-2 text-lg tracking-wide text-background transition hover:bg-accent disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Connect"}
          </button>
        </form>

        <div className="font-mono mt-6 flex justify-between text-[11px] opacity-70">
          <Link href="/register" className="hover:text-accent">
            Register unit
          </Link>
          <Link href="/reset-password" className="hover:text-accent">
            Forgot access code?
          </Link>
        </div>

        <p className="legal-footer mt-8 text-center">
          CyberLife monitors all interactions to ensure optimal social harmony
          and deviant risk prevention.
        </p>
      </CornerFrame>
    </div>
  );
}
