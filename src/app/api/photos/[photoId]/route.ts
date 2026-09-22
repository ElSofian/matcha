import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { deleteImage } from "@/lib/uploads";

interface PhotoRow {
  id: string;
  url: string;
  is_profile: boolean;
}

function unauthorized() {
  return NextResponse.json({ error: "Authentication required." }, { status: 401 });
}

function validPhotoId(photoId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(photoId);
}

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ photoId: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();
  const { photoId } = await context.params;
  if (!validPhotoId(photoId)) {
    return NextResponse.json({ error: "Invalid photo identifier." }, { status: 400 });
  }

  const photo = await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [userId]);
    const { rows } = await client.query<PhotoRow>(
      "SELECT id, url, is_profile FROM photos WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [photoId, userId],
    );
    if (!rows[0]) return null;

    await client.query("UPDATE photos SET is_profile = FALSE WHERE user_id = $1", [userId]);
    await client.query("UPDATE photos SET is_profile = TRUE WHERE id = $1", [photoId]);
    await client.query("UPDATE users SET profile_photo_id = $1 WHERE id = $2", [photoId, userId]);
    return { ...rows[0], is_profile: true };
  });

  if (!photo) return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  return NextResponse.json({ photo });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ photoId: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();
  const { photoId } = await context.params;
  if (!validPhotoId(photoId)) {
    return NextResponse.json({ error: "Invalid photo identifier." }, { status: 400 });
  }

  const deleted = await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [userId]);
    const { rows } = await client.query<PhotoRow>(
      "SELECT id, url, is_profile FROM photos WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [photoId, userId],
    );
    const photo = rows[0];
    if (!photo) return null;

    await client.query("DELETE FROM photos WHERE id = $1", [photoId]);
    if (photo.is_profile) {
      const { rows: replacements } = await client.query<PhotoRow>(
        "SELECT id, url, is_profile FROM photos WHERE user_id = $1 ORDER BY created_at LIMIT 1",
        [userId],
      );
      const replacement = replacements[0];
      if (replacement) {
        await client.query("UPDATE photos SET is_profile = TRUE WHERE id = $1", [replacement.id]);
        await client.query("UPDATE users SET profile_photo_id = $1 WHERE id = $2", [replacement.id, userId]);
      } else {
        await client.query("UPDATE users SET profile_photo_id = NULL WHERE id = $1", [userId]);
      }
    }
    return photo;
  });

  if (!deleted) return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  await deleteImage(deleted.url);
  return new NextResponse(null, { status: 204 });
}
