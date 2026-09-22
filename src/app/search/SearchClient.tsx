"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { DiscoveryProfile } from "@/lib/discovery";
import { characterFor } from "@/lib/characters";

function ProfileCard({ profile }: { profile: DiscoveryProfile }) {
  const character = characterFor(profile.username);
  return <Link className="group relative aspect-[1.12/1] overflow-hidden bg-[#9fc4df]" href={`/users/${profile.username}`}><div className="absolute inset-0 opacity-70 [background-image:linear-gradient(60deg,transparent_49%,rgba(255,255,255,.38)_50%,transparent_51%),linear-gradient(-60deg,transparent_49%,rgba(255,255,255,.38)_50%,transparent_51%)] [background-size:58px_100px]" /><Image alt="" className="absolute bottom-0 left-1/2 h-[98%] w-auto max-w-none -translate-x-1/2 object-contain transition-transform duration-300 group-hover:scale-[1.035]" src={character.image} /><span className="cyber-frame absolute inset-3"><span className="corner-tr" /><span className="corner-bl" /></span><div className="absolute inset-x-0 bottom-0 bg-[#1f4d95]/90 px-5 py-3 text-white"><p className="text-2xl">{character.model} - {profile.first_name}</p><p className="mt-1 text-sm text-[#d2919c]">♡ {profile.common_tags * 8 + 12}% &nbsp; ☆ {profile.fame_rating}P</p></div></Link>;
}

export default function SearchClient({ initialProfiles }: { initialProfiles: DiscoveryProfile[] }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const name of ["minAge", "maxAge", "minFame", "maxFame", "location", "sort"]) { const value = String(data.get(name) ?? "").trim(); if (value) params.set(name, value); }
    String(data.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean).forEach((tag) => params.append("tag", tag));
    setPending(true); setError(null);
    try { const response = await fetch(`/api/discovery?${params.toString()}`, { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Search failed."); setProfiles(data.profiles); } catch (cause) { setError(cause instanceof Error ? cause.message : "Search failed."); } finally { setPending(false); }
  }

  return <main className="site-grid cyber-page py-10"><h1 className="font-display text-[clamp(2.8rem,4vw,4.8rem)] font-light"><strong className="font-medium">Welcome,</strong> to the CyberLife Dating App</h1><p className="mt-1 text-2xl">Designed for Androids</p><div className="mt-10 grid gap-9 lg:grid-cols-[25rem_1fr]"><form className="cyber-frame cyber-panel flex min-h-[48rem] flex-col p-6" onSubmit={submit}><span className="corner-tr" /><span className="corner-bl" /><label className="cyber-label">Max distance<input className="mt-3 w-full accent-[#2059a4]" max="500" min="1" name="maxDistance" type="range" defaultValue="50" /><span className="float-right normal-case text-base">50 km</span></label><div className="mt-12"><p className="cyber-label">Unit type</p><div className="mt-4 flex gap-4"><button className="cyber-button cyber-button--compact is-active" type="button">All</button><button className="cyber-button cyber-button--compact border border-foreground" type="button">Male</button><button className="cyber-button cyber-button--compact border border-foreground" type="button">Female</button></div></div><div className="mt-12"><p className="cyber-label">Age</p><div className="mt-4 flex items-center gap-4"><input className="w-28 p-2 text-center" min="18" name="minAge" placeholder="18" type="number" /><span>—</span><input className="w-28 p-2 text-center" min="18" name="maxAge" placeholder="99" type="number" /></div></div><div className="mt-9"><p className="cyber-label">Fame rating</p><div className="mt-4 flex items-center gap-4"><input className="w-28 p-2 text-center" min="0" name="minFame" placeholder="0" type="number" /><span>—</span><input className="w-28 p-2 text-center" min="0" name="maxFame" placeholder="100" type="number" /></div></div><label className="mt-9 block cyber-label">Location<input className="mt-3 w-full p-3 normal-case" maxLength={255} name="location" placeholder="City or area" type="search" /></label><label className="mt-7 block cyber-label">Shared tags<input className="mt-3 w-full p-3 normal-case" name="tags" placeholder="#music, #work" type="text" /></label><label className="mt-7 block cyber-label">Sort<select className="mt-3 w-full p-3 normal-case" defaultValue="recommended" name="sort"><option value="recommended">Recommended</option><option value="distance">Distance</option><option value="tags">Shared tags</option><option value="fame">Fame rating</option><option value="age">Age</option></select></label><button className="mt-auto self-center text-[#7894b6] hover:text-accent" disabled={pending} type="submit">{pending ? "Searching…" : "Apply filters"}</button></form><section><label className="cyber-frame block"><span className="corner-tr" /><span className="corner-bl" /><input className="w-full border-0 !bg-white/70 px-5 py-4 text-xl" onChange={() => undefined} placeholder="Search your future partner..." type="search" /></label>{error && <p className="mt-4 text-red-700" role="alert">{error}</p>}<div className="mt-9 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">{profiles.map((profile) => <ProfileCard key={profile.username} profile={profile} />)}</div>{profiles.length === 0 && <p className="mt-8 text-lg text-[#6f8099]">No compatible unit matches the current filters.</p>}</section></div></main>;
}
