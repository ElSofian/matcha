import { NextResponse } from "next/server";
import { getProfileReadiness } from "@/lib/profile-readiness";
import { getCurrentUserId } from "@/lib/session";
export async function GET() { const userId = await getCurrentUserId(); if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 }); return NextResponse.json({ readiness: await getProfileReadiness(userId) }); }
