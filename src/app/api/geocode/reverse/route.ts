import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { latitude?: unknown; longitude?: unknown } | null;
  const latitude = typeof body?.latitude === "number" ? body.latitude : NaN;
  const longitude = typeof body?.longitude === "number" ? body.longitude : NaN;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=14`, { headers: { "User-Agent": "CY-MATCH/1.0 (42 educational project)", Accept: "application/json" }, signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!response.ok) throw new Error("Geocoding failed.");
    const data = await response.json() as { address?: Record<string, string> };
    const address = data.address ?? {};
    const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county ?? "";
    const area = address.neighbourhood ?? address.suburb ?? "";
    const label = [area, city].filter(Boolean).join(", ").slice(0, 255);
    return NextResponse.json({ location: label || null });
  } catch {
    return NextResponse.json({ error: "Unable to identify this location." }, { status: 502 });
  }
}
