import { NextResponse } from "next/server";

const attempts = new Map<string, number[]>();

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  return null;
}

export function isRateLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((time) => time > now - windowMs);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > limit;
}
