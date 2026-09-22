import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import ProfileForm from "./ProfileForm";
import PhotoManager from "./PhotoManager";
import TagManager from "./TagManager";

interface ProfileRow {
  first_name: string;
  last_name: string;
  birth_date: Date | null;
  gender: "male" | "female" | "non_binary" | "other" | null;
  sexual_preference: "male" | "female" | "bisexual";
  bio: string | null;
  city: string | null;
  location_source: "unset" | "precise" | "approximate";
  latitude: number | null;
  longitude: number | null;
}

interface PhotoRow {
  id: string;
  url: string;
  is_profile: boolean;
}

interface TagRow {
  id: string;
  name: string;
}

export default async function ProfilePage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login");
  }

  const { rows } = await query<ProfileRow>(
    `SELECT first_name, last_name, birth_date, gender, sexual_preference,
            bio, city, location_source, latitude, longitude
     FROM users WHERE id = $1`,
    [userId],
  );
  const profile = rows[0];
  if (!profile) {
    redirect("/login");
  }

  const { rows: photos } = await query<PhotoRow>(
    "SELECT id, url, is_profile FROM photos WHERE user_id = $1 ORDER BY created_at",
    [userId],
  );

  const { rows: tags } = await query<TagRow>(
    `SELECT t.id, t.name FROM tags t
     JOIN user_tags ut ON ut.tag_id = t.id
     WHERE ut.user_id = $1 ORDER BY t.name`,
    [userId],
  );

  const initialProfile = {
    ...profile,
    birth_date: profile.birth_date?.toISOString().slice(0, 10) ?? null,
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] opacity-50">
        Unit Profile
      </p>
      <h1 className="font-display mt-2 text-5xl">Profile calibration</h1>
      <ProfileForm initialProfile={initialProfile} />
      <PhotoManager initialPhotos={photos} />
      <TagManager initialTags={tags} />
    </main>
  );
}
