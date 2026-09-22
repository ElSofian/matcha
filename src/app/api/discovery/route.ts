import { NextResponse } from "next/server";
import { discoverySorts, findDiscoveryProfiles, type DiscoveryFilters, type DiscoverySort } from "@/lib/discovery";
import { getProfileReadiness } from "@/lib/profile-readiness";
import { getCurrentUserId } from "@/lib/session";

function integer(value: string | null, minimum: number, maximum: number) {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function filtersFrom(request: Request): DiscoveryFilters | null {
  const params = new URL(request.url).searchParams;
  const minAge = integer(params.get("minAge"), 18, 120);
  const maxAge = integer(params.get("maxAge"), 18, 120);
  const minFame = integer(params.get("minFame"), 0, 10000);
  const maxFame = integer(params.get("maxFame"), 0, 10000);
  if (minAge === null || maxAge === null || minFame === null || maxFame === null) return null;
  if ((minAge !== undefined && maxAge !== undefined && minAge > maxAge) || (minFame !== undefined && maxFame !== undefined && minFame > maxFame)) return null;

  const location = params.get("location")?.trim();
  if (location && location.length > 255) return null;
  const tags = [...new Set(params.getAll("tag").map((tag) => tag.trim().toLowerCase()).filter((tag) => /^[a-z0-9][a-z0-9 -]{0,49}$/.test(tag)))];
  if (tags.length !== params.getAll("tag").filter(Boolean).length || tags.length > 10) return null;
  const sort = params.get("sort") ?? "recommended";
  if (!discoverySorts.includes(sort as DiscoverySort)) return null;

  return { minAge: minAge ?? undefined, maxAge: maxAge ?? undefined, minFame: minFame ?? undefined, maxFame: maxFame ?? undefined, location: location || undefined, tags, sort: sort as DiscoverySort };
}

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!(await getProfileReadiness(userId)).complete) return NextResponse.json({ error: "Complete your adult profile, location and primary photo before using matching." }, { status: 403 });
  const filters = filtersFrom(request);
  if (!filters) return NextResponse.json({ error: "Invalid discovery filters." }, { status: 400 });

  const profiles = await findDiscoveryProfiles(userId, filters);
  return NextResponse.json({ profiles });
}
