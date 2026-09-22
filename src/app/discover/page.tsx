import { redirect } from "next/navigation";
import DiscoveryClient from "./DiscoveryClient";
import Link from "next/link";
import { findDiscoveryProfiles } from "@/lib/discovery";
import { getProfileReadiness } from "@/lib/profile-readiness";
import { getCurrentUserId } from "@/lib/session";

export default async function DiscoverPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  if (!(await getProfileReadiness(userId)).complete) return <main className="mx-auto w-full max-w-2xl px-4 py-10"><h1 className="font-display text-5xl">Profile completion required</h1><p className="mt-4">Complete your adult profile, location and primary photo before using matching.</p><Link className="mt-6 inline-block font-mono underline" href="/onboarding">Continue onboarding</Link></main>;
  const profiles = await findDiscoveryProfiles(userId);
  return <main><DiscoveryClient initialProfiles={profiles} /></main>;
}
