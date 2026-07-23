"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import CornerFrame from "@/components/CornerFrame";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Request failed.");
        return;
      }
      setMessage(data.message);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Reset failed.");
        return;
      }
      setMessage(data.message);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <CornerFrame className="w-full max-w-sm border border-accent/30 bg-white/60 p-8 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-1 mb-8">
          <h1 className="font-display text-4xl tracking-wide">CY//MATCH</h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
            Access Code Reset
          </p>
        </div>

        {message && (
          <p className="font-mono mb-4 border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">
            {message}
          </p>
        )}
        {error && (
          <p className="font-mono mb-4 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}

        {token ? (
          <form onSubmit={handleConfirm} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-60">
                New Access Code
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono border border-foreground/20 bg-white/70 px-3 py-2 outline-none focus:border-accent"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="font-display mt-2 bg-foreground py-2 text-lg tracking-wide text-background transition hover:bg-accent disabled:opacity-50"
            >
              {loading ? "Processing..." : "Set new Access Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRequest} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-60">
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="font-mono border border-foreground/20 bg-white/70 px-3 py-2 outline-none focus:border-accent"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="font-display mt-2 bg-foreground py-2 text-lg tracking-wide text-background transition hover:bg-accent disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <div className="font-mono mt-6 text-center text-[11px] opacity-70">
          <Link href="/login" className="hover:text-accent">
            Back to login
          </Link>
        </div>
      </CornerFrame>
    </div>
  );
}
