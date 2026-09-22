import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { profileSchema } from "@/lib/validation";

export const runtime = "nodejs";

interface ProfileRow {
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: "male" | "female" | "non_binary" | "other" | null;
  sexual_preference: "male" | "female" | "bisexual";
  bio: string | null;
  city: string | null;
  location_source: "unset" | "precise" | "approximate";
  latitude: number | null;
  longitude: number | null;
}

const profileColumns = `
  first_name, last_name, birth_date, gender, sexual_preference, bio,
  city, location_source, latitude, longitude
`;

function profileResponse(row: ProfileRow) {
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date,
    gender: row.gender,
    sexualPreference: row.sexual_preference,
    bio: row.bio,
    city: row.city,
    locationSource: row.location_source,
    latitude: row.latitude,
    longitude: row.longitude,
  };
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { rows } = await query<ProfileRow>(
    `SELECT ${profileColumns} FROM users WHERE id = $1`,
    [userId],
  );
  if (!rows[0]) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ profile: profileResponse(rows[0]) });
}

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid profile data." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  if (data.birthDate && new Date(`${data.birthDate}T00:00:00Z`) > new Date()) {
    return NextResponse.json({ error: "Birth date cannot be in the future." }, { status: 400 });
  }
  if (data.birthDate) {
    const today = new Date();
    const adultCutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    if (new Date(`${data.birthDate}T00:00:00Z`) > adultCutoff) return NextResponse.json({ error: "CY//MATCH is reserved for adults aged 18 or over." }, { status: 400 });
  }

  const { rows } = await query<ProfileRow>(
    `UPDATE users
     SET first_name = $1, last_name = $2, birth_date = $3, gender = $4,
         sexual_preference = $5, bio = $6, city = $7, location_source = $8,
         latitude = $9, longitude = $10, updated_at = NOW()
     WHERE id = $11
     RETURNING ${profileColumns}`,
    [
      data.firstName, data.lastName, data.birthDate, data.gender,
      data.sexualPreference, data.bio, data.city, data.locationSource,
      data.latitude, data.longitude, userId,
    ],
  );

  if (!rows[0]) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ profile: profileResponse(rows[0]) });
}
