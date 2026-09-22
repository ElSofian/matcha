"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { DiscoveryProfile } from "@/lib/discovery";

function age(birthDate: Date | string | null) {
  if (!birthDate) return null;
  const birthday = new Date(birthDate);
  const today = new Date();
  let value = today.getFullYear() - birthday.getFullYear();
  if (today < new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate())) value -= 1;
  return value;
}

function ProfileCard({ profile }: { profile: DiscoveryProfile }) {
  const profileAge = age(profile.birth_date);
  return <article className="border border-foreground/15 bg-white/60 p-3"><Link href={`/users/${profile.username}`} className="block focus:outline-none focus:ring-2 focus:ring-accent"><Image alt={`${profile.first_name}'s profile`} className="aspect-square w-full object-cover" height={440} src={profile.profile_photo_url ?? "/logo.svg"} width={440} /><h2 className="font-display mt-3 text-3xl">{profile.first_name} {profile.last_name}</h2><p className="font-mono text-xs opacity-60">@{profile.username} · {profileAge ?? "?"} years</p><dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><div><dt className="opacity-60">Fame</dt><dd>{profile.fame_rating}</dd></div><div><dt className="opacity-60">Shared tags</dt><dd>{profile.common_tags}</dd></div><div className="col-span-2"><dt className="opacity-60">Location</dt><dd>{profile.city ?? "Not specified"}{profile.distance_km === null ? "" : ` · ${Math.round(profile.distance_km)} km`}</dd></div></dl>{profile.bio && <p className="mt-3 line-clamp-2 text-sm opacity-80">{profile.bio}</p>}</Link></article>;
}

export default function DiscoveryClient({ initialProfiles }: { initialProfiles: DiscoveryProfile[] }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const name of ["minAge", "maxAge", "minFame", "maxFame", "location", "sort"]) {
      const value = String(data.get(name) ?? "").trim();
      if (value) params.set(name, value);
    }
    String(data.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean).forEach((tag) => params.append("tag", tag));
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/discovery?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Search failed.");
      setProfiles(payload.profiles);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search failed.");
    } finally {
      setPending(false);
    }
  }

  return <div className="mx-auto w-full max-w-6xl px-4 py-10"><p className="font-mono text-xs uppercase tracking-[0.2em] opacity-50">Compatibility discovery</p><h1 className="font-display mt-2 text-5xl">Find compatible units</h1><p className="mt-3 max-w-2xl opacity-70">Suggestions prioritize your area, then distance, shared interests and fame rating. Only mutually compatible, verified and unblocked profiles are shown.</p><form className="mt-8 grid gap-3 border border-foreground/15 bg-white/60 p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={submit}><label className="text-sm">Minimum age<input className="mt-1 w-full border border-foreground/25 bg-transparent p-2" min="18" name="minAge" type="number" /></label><label className="text-sm">Maximum age<input className="mt-1 w-full border border-foreground/25 bg-transparent p-2" min="18" name="maxAge" type="number" /></label><label className="text-sm">Minimum fame<input className="mt-1 w-full border border-foreground/25 bg-transparent p-2" min="0" name="minFame" type="number" /></label><label className="text-sm">Maximum fame<input className="mt-1 w-full border border-foreground/25 bg-transparent p-2" min="0" name="maxFame" type="number" /></label><label className="text-sm">City or area<input className="mt-1 w-full border border-foreground/25 bg-transparent p-2" maxLength={255} name="location" type="search" /></label><label className="text-sm">Tags (comma-separated)<input className="mt-1 w-full border border-foreground/25 bg-transparent p-2" name="tags" placeholder="music, hiking" type="text" /></label><label className="text-sm">Sort by<select className="mt-1 w-full border border-foreground/25 bg-transparent p-2" defaultValue="recommended" name="sort"><option value="recommended">Recommended</option><option value="distance">Distance</option><option value="tags">Shared tags</option><option value="fame">Fame</option><option value="age">Age</option></select></label><div className="flex items-end"><button className="w-full bg-foreground px-4 py-2 font-mono text-sm text-background disabled:opacity-50" disabled={pending} type="submit">{pending ? "Searching…" : "Apply filters"}</button></div></form>{error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}<p className="mt-6 font-mono text-sm opacity-60" aria-live="polite">{profiles.length} compatible profile{profiles.length === 1 ? "" : "s"} found</p><section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Compatible profiles">{profiles.map((profile) => <ProfileCard key={profile.username} profile={profile} />)}</section>{profiles.length === 0 && <p className="mt-6 border border-foreground/15 p-4 opacity-70">No compatible profile matches these criteria yet. Try fewer filters or complete your profile preferences.</p>}</div>;
}
