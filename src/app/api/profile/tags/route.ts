import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { profileTagsSchema } from "@/lib/validation";

interface TagRow {
  id: string;
  name: string;
}

function unauthorized() {
  return NextResponse.json({ error: "Authentication required." }, { status: 401 });
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { rows } = await query<TagRow>(
    `SELECT t.id, t.name FROM tags t
     JOIN user_tags ut ON ut.tag_id = t.id
     WHERE ut.user_id = $1 ORDER BY t.name`,
    [userId],
  );
  return NextResponse.json({ tags: rows });
}

export async function PUT(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = profileTagsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid tags." },
      { status: 400 },
    );
  }

  const tags = await withTransaction(async (client) => {
    await client.query("DELETE FROM user_tags WHERE user_id = $1", [userId]);
    const savedTags: TagRow[] = [];
    for (const name of parsed.data.tags) {
      const { rows } = await client.query<TagRow>(
        `INSERT INTO tags (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, name`,
        [name],
      );
      await client.query(
        "INSERT INTO user_tags (user_id, tag_id) VALUES ($1, $2)",
        [userId, rows[0].id],
      );
      savedTags.push(rows[0]);
    }
    return savedTags;
  });

  return NextResponse.json({ tags });
}
