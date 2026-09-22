import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { deleteImage, ImageValidationError, normalizeImage, saveImage } from "@/lib/uploads";

export const runtime = "nodejs";

interface PhotoRow {
  id: string;
  url: string;
  is_profile: boolean;
  created_at: string;
}

class PhotoLimitError extends Error {}

function unauthorized() {
  return NextResponse.json({ error: "Authentication required." }, { status: 401 });
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { rows } = await query<PhotoRow>(
    "SELECT id, url, is_profile, created_at FROM photos WHERE user_id = $1 ORDER BY created_at",
    [userId],
  );
  return NextResponse.json({ photos: rows });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 5_500_000) {
    return NextResponse.json({ error: "Image upload is too large." }, { status: 413 });
  }

  const formData = await request.formData().catch(() => null);
  const uploaded = formData?.get("file");
  if (!uploaded || typeof uploaded === "string") {
    return NextResponse.json({ error: "A photo file is required." }, { status: 400 });
  }

  let imageUrl: string | null = null;
  try {
    const normalized = await normalizeImage(uploaded);
    imageUrl = await saveImage(normalized.filename, normalized.buffer);

    const photo = await withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [userId]);
      const { rows: countRows } = await client.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM photos WHERE user_id = $1",
        [userId],
      );
      const isProfile = Number(countRows[0].count) === 0;
      if (Number(countRows[0].count) >= 5) throw new PhotoLimitError();

      const { rows } = await client.query<PhotoRow>(
        `INSERT INTO photos (user_id, url, is_profile)
         VALUES ($1, $2, $3)
         RETURNING id, url, is_profile, created_at`,
        [userId, imageUrl, isProfile],
      );
      if (isProfile) {
        await client.query("UPDATE users SET profile_photo_id = $1 WHERE id = $2", [
          rows[0].id,
          userId,
        ]);
      }
      return rows[0];
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    if (imageUrl) await deleteImage(imageUrl);
    if (error instanceof ImageValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof PhotoLimitError) {
      return NextResponse.json({ error: "A profile can contain at most 5 photos." }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to save this photo." }, { status: 500 });
  }
}
