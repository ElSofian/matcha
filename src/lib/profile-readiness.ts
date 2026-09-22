import { query } from "@/lib/db";

export type ProfileReadiness = { adult: boolean; hasGender: boolean; hasLocation: boolean; hasPrimaryPhoto: boolean; complete: boolean };

export async function getProfileReadiness(userId: string): Promise<ProfileReadiness> {
  const { rows } = await query<{ birth_date: Date | null; gender: string | null; location_source: string; city: string | null; latitude: number | null; longitude: number | null; has_primary_photo: boolean }>(
    `SELECT birth_date, gender, location_source, city, latitude, longitude,
            EXISTS (SELECT 1 FROM photos WHERE user_id = users.id AND is_profile = TRUE) AS has_primary_photo
     FROM users WHERE id = $1`, [userId]);
  const user = rows[0];
  if (!user) return { adult: false, hasGender: false, hasLocation: false, hasPrimaryPhoto: false, complete: false };
  const today = new Date();
  const adult = Boolean(user.birth_date && new Date(user.birth_date) <= new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()));
  const hasLocation = (user.location_source === "precise" && user.latitude !== null && user.longitude !== null) || (user.location_source === "approximate" && Boolean(user.city));
  const complete = adult && Boolean(user.gender) && hasLocation && user.has_primary_photo;
  return { adult, hasGender: Boolean(user.gender), hasLocation, hasPrimaryPhoto: user.has_primary_photo, complete };
}
