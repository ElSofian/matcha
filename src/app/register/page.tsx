"use client";

import { useState } from "react";
import Link from "next/link";
import CornerFrame from "@/components/CornerFrame";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, firstName, lastName, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }

      setSuccess(
        `Unit ID ${data.username} created. Serial No. ${data.serialNumber}. Check your email to activate it.`,
      );
      setEmail("");
      setUsername("");
      setFirstName("");
      setLastName("");
      setPassword("");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <CornerFrame className="w-full max-w-sm border border-accent/30 bg-white/60 p-8 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-1 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="CyberLife" className="h-12 w-12" />
          <h1 className="font-display text-4xl tracking-wide">CY//MATCH</h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
            New Unit Registration
          </p>
        </div>

        {success && (
          <p className="font-mono mb-4 border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">
            {success}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-60">
              Unit ID
            </span>
            <input
              type="text"
              required
              minLength={3}
              maxLength={50}
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="connor-rk800"
              className="font-mono border border-foreground/20 bg-white/70 px-3 py-2 outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-60">
              Designation (first name)
            </span>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="font-mono border border-foreground/20 bg-white/70 px-3 py-2 outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-60">
              Owner (last name)
            </span>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="font-mono border border-foreground/20 bg-white/70 px-3 py-2 outline-none focus:border-accent"
            />
          </label>

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

          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-60">
              Access Code
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
            {loading ? "Processing..." : "Register"}
          </button>
        </form>

        <div className="font-mono mt-6 text-center text-[11px] opacity-70">
          <Link href="/login" className="hover:text-accent">
            Already have a Unit ID? Log in
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
