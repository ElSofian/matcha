import { redirect } from "next/navigation";
import OnboardingClient from "./OnboardingClient";
import { query } from "@/lib/db";
import { getProfileReadiness } from "@/lib/profile-readiness";
import { getCurrentUserId } from "@/lib/session";

export default async function OnboardingPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const readiness = await getProfileReadiness(userId);
  if (readiness.complete) redirect("/discover");
  const { rows } = await query<{ first_name: string; last_name: string; birth_date: Date | null; gender: string | null; sexual_preference: string; bio: string | null; city: string | null; location_source: string; latitude: number | null; longitude: number | null }>("SELECT first_name, last_name, birth_date, gender, sexual_preference, bio, city, location_source, latitude, longitude FROM users WHERE id = $1", [userId]);
  const user = rows[0]; if (!user) redirect("/login");
  const initialStep = !readiness.adult || !readiness.hasGender ? 1 : !readiness.hasLocation ? 2 : 3;
  return <OnboardingClient initialProfile={{ firstName: user.first_name, lastName: user.last_name, birthDate: user.birth_date?.toISOString().slice(0, 10) ?? "", gender: user.gender ?? "", sexualPreference: user.sexual_preference, bio: user.bio ?? "", city: user.city ?? "", locationSource: user.location_source, latitude: user.latitude?.toString() ?? "", longitude: user.longitude?.toString() ?? "" }} initialStep={initialStep} />;
}
