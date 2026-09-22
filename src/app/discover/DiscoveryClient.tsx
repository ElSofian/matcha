"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { DiscoveryProfile } from "@/lib/discovery";
import { characterFor } from "@/lib/characters";

function compatibility(profile: DiscoveryProfile) {
  return Math.min(98, 58 + (profile.common_tags * 7) + Math.round(profile.fame_rating / 5));
}

export default function DiscoveryClient({ initialProfiles }: { initialProfiles: DiscoveryProfile[] }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const profile = profiles[0];
  const character = profile ? characterFor(profile.username) : null;

  function skip() {
    setProfiles((current) => current.slice(1));
    setStatus(null);
  }

  async function askForLink() {
    if (!profile) return;
    setPending(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/users/${profile.username}/relationship`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "like" }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to send your request.");
      setStatus(payload.relationship?.isMatch ? "Connection established. Your private line is open." : "Link request sent.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Unable to send your request.");
    } finally { setPending(false); }
  }

  if (!profile || !character) return <main className="site-grid cyber-page grid place-items-center"><div className="cyber-frame cyber-panel max-w-xl p-10 text-center"><span className="corner-tr" /><span className="corner-bl" /><p className="text-xl">No compatible unit is available right now.</p><Link className="mt-6 inline-block text-accent underline" href="/search">Refine your search</Link></div></main>;

  return <main className="site-grid cyber-page relative overflow-hidden pb-6"><section className="relative min-h-[calc(100vh-6.5rem)] overflow-hidden"><Image alt="" aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 hidden w-[35rem] max-w-none -translate-x-[64%] opacity-[0.10] blur-[1px] lg:block" src={character.image} /><Image alt="" aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 hidden w-[35rem] max-w-none -translate-x-[43%] opacity-[0.12] blur-[1px] lg:block" src={character.image} /><Image alt={`${profile.first_name} ${profile.last_name}`} className="pointer-events-none absolute bottom-0 left-1/2 h-[70vh] w-auto max-w-none -translate-x-1/2 object-contain" priority src={character.image} />
    <div className="absolute left-3 top-[29%] z-10 max-w-sm sm:left-7"><p className="font-display text-[clamp(3.8rem,7.5vw,7.5rem)] leading-none tracking-[-0.08em]">{character.model}</p><div className="mt-3 flex items-center gap-4"><span className="h-px w-24 bg-foreground" /><h1 className="text-3xl font-medium">{profile.first_name}</h1></div><ul className="mt-6 space-y-1.5 text-base"><li>− &nbsp; Compatibility: {compatibility(profile)}%</li><li>− &nbsp; Proximity: {profile.distance_km === null ? "Unknown" : `${Math.round(profile.distance_km)} km`}</li><li>− &nbsp; Fame rating: {profile.fame_rating}</li><li>− &nbsp; Shared tags:</li><li className="pl-5 font-semibold">{profile.common_tags ? `${profile.common_tags} in common` : "No shared tags yet"}</li></ul>{profile.bio && <p className="mt-12 max-w-sm text-base leading-snug">{profile.bio}</p>}</div>
    <div className="absolute bottom-8 left-0 right-0 z-20 flex items-end justify-between gap-4 px-4 sm:px-6"><button className="cyber-frame cyber-button cyber-button--compact min-w-32" onClick={skip} type="button"><span className="corner-tr" /><span className="corner-bl" />Skip</button><div className="flex gap-2"><span className="size-4 rounded-full bg-[#4f91cc]" /><span className="size-4 rounded-full border border-[#7897b8]" /><span className="size-4 rounded-full border border-[#7897b8]" /></div><button className="cyber-frame cyber-button cyber-button--compact min-w-48" disabled={pending} onClick={askForLink} type="button"><span className="corner-tr" /><span className="corner-bl" />{pending ? "Sending…" : "Ask for link"}</button></div>
    {status && <p className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 bg-white/85 px-4 py-2 text-sm shadow-sm" role="status">{status}</p>}
  </section></main>;
}
