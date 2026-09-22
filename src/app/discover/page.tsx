import { redirect } from "next/navigation";
import DiscoveryClient from "./DiscoveryClient";
import { findDiscoveryProfiles } from "@/lib/discovery";
import { getCurrentUserId } from "@/lib/session";

export default async function DiscoverPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const profiles = await findDiscoveryProfiles(userId);
  return <main><DiscoveryClient initialProfiles={profiles} /></main>;
}
