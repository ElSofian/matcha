import type { QueryResultRow } from "pg";
import { query } from "@/lib/db";

export const discoverySorts = ["recommended", "distance", "tags", "fame", "age"] as const;
export type DiscoverySort = (typeof discoverySorts)[number];

export interface DiscoveryFilters {
  minAge?: number;
  maxAge?: number;
  minFame?: number;
  maxFame?: number;
  location?: string;
  tags?: string[];
  sort?: DiscoverySort;
  limit?: number;
}

export interface DiscoveryProfile extends QueryResultRow {
  username: string;
  first_name: string;
  last_name: string;
  birth_date: Date | null;
  gender: string | null;
  bio: string | null;
  city: string | null;
  fame_rating: number;
  profile_photo_url: string | null;
  common_tags: number;
  distance_km: number | null;
  same_area: boolean;
}

function orderFor(sort: DiscoverySort) {
  switch (sort) {
    case "distance":
      return "same_area DESC, distance_km ASC NULLS LAST, common_tags DESC, u.fame_rating DESC";
    case "tags":
      return "common_tags DESC, same_area DESC, distance_km ASC NULLS LAST, u.fame_rating DESC";
    case "fame":
      return "u.fame_rating DESC, common_tags DESC, same_area DESC, distance_km ASC NULLS LAST";
    case "age":
      return "u.birth_date DESC NULLS LAST, common_tags DESC, u.fame_rating DESC";
    default:
      return "same_area DESC, distance_km ASC NULLS LAST, common_tags DESC, u.fame_rating DESC";
  }
}

export async function findDiscoveryProfiles(userId: string, filters: DiscoveryFilters = {}) {
  const values: unknown[] = [userId];
  const conditions = [
    "u.id <> viewer.id",
    "u.is_verified = TRUE",
    "EXISTS (SELECT 1 FROM photos p WHERE p.user_id = u.id AND p.is_profile = TRUE)",
    "NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = viewer.id AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = viewer.id))",
    "(viewer.sexual_preference = 'bisexual' OR u.gender::text = viewer.sexual_preference::text)",
    "(u.sexual_preference = 'bisexual' OR viewer.gender::text = u.sexual_preference::text)",
  ];

  if (filters.minAge !== undefined) {
    values.push(filters.minAge);
    conditions.push(`u.birth_date IS NOT NULL AND EXTRACT(YEAR FROM age(CURRENT_DATE, u.birth_date)) >= $${values.length}`);
  }
  if (filters.maxAge !== undefined) {
    values.push(filters.maxAge);
    conditions.push(`u.birth_date IS NOT NULL AND EXTRACT(YEAR FROM age(CURRENT_DATE, u.birth_date)) <= $${values.length}`);
  }
  if (filters.minFame !== undefined) {
    values.push(filters.minFame);
    conditions.push(`u.fame_rating >= $${values.length}`);
  }
  if (filters.maxFame !== undefined) {
    values.push(filters.maxFame);
    conditions.push(`u.fame_rating <= $${values.length}`);
  }
  if (filters.location) {
    values.push(`%${filters.location}%`);
    conditions.push(`u.city ILIKE $${values.length}`);
  }
  if (filters.tags && filters.tags.length > 0) {
    values.push(filters.tags);
    conditions.push(`(
      SELECT COUNT(DISTINCT t.name)
      FROM user_tags ut
      JOIN tags t ON t.id = ut.tag_id
      WHERE ut.user_id = u.id AND t.name = ANY($${values.length}::text[])
    ) = cardinality($${values.length}::text[])`);
  }

  const limit = Math.min(Math.max(filters.limit ?? 24, 1), 48);
  values.push(limit);

  const { rows } = await query<DiscoveryProfile>(
    `WITH viewer AS (
       SELECT id, gender, sexual_preference, latitude, longitude, city
       FROM users
       WHERE id = $1
     )
     SELECT u.username, u.first_name, u.last_name, u.birth_date, u.gender, u.bio,
            u.city, u.fame_rating,
            profile.url AS profile_photo_url,
            COUNT(DISTINCT shared.tag_id)::int AS common_tags,
            CASE
              WHEN viewer.latitude IS NOT NULL AND viewer.longitude IS NOT NULL
               AND u.latitude IS NOT NULL AND u.longitude IS NOT NULL
              THEN 6371 * acos(LEAST(1.0, GREATEST(-1.0,
                cos(radians(viewer.latitude)) * cos(radians(u.latitude)) *
                cos(radians(u.longitude) - radians(viewer.longitude)) +
                sin(radians(viewer.latitude)) * sin(radians(u.latitude))
              )))
              ELSE NULL
            END AS distance_km,
            COALESCE((viewer.city IS NOT NULL AND lower(viewer.city) = lower(u.city)), FALSE) AS same_area
     FROM viewer
     JOIN users u ON TRUE
     JOIN photos profile ON profile.user_id = u.id AND profile.is_profile = TRUE
     LEFT JOIN user_tags mine ON mine.user_id = viewer.id
     LEFT JOIN user_tags shared ON shared.user_id = u.id AND shared.tag_id = mine.tag_id
     WHERE ${conditions.join("\n       AND ")}
     GROUP BY u.id, profile.id, viewer.id, viewer.gender, viewer.sexual_preference,
              viewer.latitude, viewer.longitude, viewer.city
     ORDER BY ${orderFor(filters.sort ?? "recommended")}
     LIMIT $${values.length}`,
    values,
  );

  return rows.map((profile) => ({
    ...profile,
    fame_rating: Number(profile.fame_rating),
    common_tags: Number(profile.common_tags),
    distance_km: profile.distance_km === null ? null : Number(profile.distance_km),
  }));
}
