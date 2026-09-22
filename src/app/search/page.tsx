import { redirect } from "next/navigation";
import SearchClient from "./SearchClient";
import { findDiscoveryProfiles } from "@/lib/discovery";
import { getProfileReadiness } from "@/lib/profile-readiness";
import { getCurrentUserId } from "@/lib/session";

export default async function SearchPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  if (!(await getProfileReadiness(userId)).complete) redirect("/onboarding");
  return <SearchClient initialProfiles={await findDiscoveryProfiles(userId)} />;
}
