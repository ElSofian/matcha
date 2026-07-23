import { cookies } from "next/headers";
import { verifyAccessToken } from "./auth";
import { SESSION_COOKIE_NAME } from "./session-cookie";

// Node-runtime-only helper for Route Handlers and Server Components. This is
// the authoritative check — middleware only does an optimistic presence
// check for redirects, this is what actually gates access to data.
export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifyAccessToken(token);
  return payload?.sub ?? null;
}
