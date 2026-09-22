import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import ProfileForm from "./ProfileForm";
import PhotoManager from "./PhotoManager";
import TagManager from "./TagManager";
import EmailForm from "./EmailForm";
import Image from "next/image";
import { characterFor } from "@/lib/characters";

interface ProfileRow {
  username: string;
  serial_number: string;
  email: string;
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
    `SELECT username, serial_number, email, first_name, last_name, birth_date, gender, sexual_preference,
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

  const character = characterFor(profile.username);
  return <main className="site-grid cyber-page relative overflow-hidden py-7"><div className="flex gap-6 text-2xl"><span className="bg-accent px-6 py-3 text-white">Profile</span><a className="border border-foreground px-6 py-3" href="#settings">Settings</a><a className="border border-foreground px-6 py-3" href="#photos">Photos</a></div><div className="relative mt-16 grid min-h-[72vh] gap-8 lg:grid-cols-[minmax(0,1fr)_42rem]"><section className="max-w-2xl"><h1 className="cyber-label">Unit informations</h1><dl className="mt-7 grid grid-cols-[12rem_1fr] gap-y-4 text-xl"><dt className="text-[#9aa0a8]">MODEL</dt><dd className="font-medium">{character.model}</dd><dt className="text-[#9aa0a8]">GENDER</dt><dd>{profile.gender ?? "Not specified"}</dd><dt className="text-[#9aa0a8]">PREFERENCE</dt><dd>{profile.sexual_preference}</dd><dt className="text-[#9aa0a8]">LOCATION</dt><dd>{profile.city ?? "Not specified"}</dd></dl><details className="mt-12 border-t border-[#b8c4ce] pt-7"><summary className="cursor-pointer text-[#7189a7]">✎ &nbsp; Edit unit informations</summary><ProfileForm initialProfile={initialProfile} /></details><section className="mt-14 border-t border-[#b8c4ce] pt-12"><div className="flex items-center justify-between"><h2 className="cyber-label">Biography</h2><span className="text-[#7189a7]">✎</span></div><p className="mt-7 max-w-xl whitespace-pre-wrap text-xl leading-relaxed text-[#5f6871]">{profile.bio || "No biography yet."}</p></section><section className="mt-14 border-t border-[#b8c4ce] pt-12"><div className="flex items-center justify-between"><h2 className="cyber-label">Interest tags</h2><span className="text-[#7189a7]">✎</span></div><div className="mt-6 flex flex-wrap gap-3">{tags.map((tag) => <span className="border border-[#cbd6df] px-3 py-2 text-lg text-[#5f6871]" key={tag.id}>#{tag.name}</span>)}{tags.length === 0 && <span className="text-[#8293a8]">No tags yet</span>}</div><details className="mt-5"><summary className="cursor-pointer text-[#7189a7]">Edit tags</summary><TagManager initialTags={tags} /></details></section></section><div className="pointer-events-none relative hidden min-h-[68rem] lg:block"><Image alt="Your unit portrait" className="absolute bottom-0 right-0 h-full w-auto max-w-none object-contain" priority src={character.image} /></div></div><section className="mt-4" id="photos"><PhotoManager initialPhotos={photos} /></section><section className="mt-10 border-t border-[#b8c4ce] pt-10" id="settings"><EmailForm initialEmail={profile.email} /></section></main>;
}
