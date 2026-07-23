import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export { SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from "./session-cookie";
import { SESSION_DURATION_SECONDS } from "./session-cookie";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

export interface AccessTokenPayload {
  sub: string;
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET as string, {
    expiresIn: SESSION_DURATION_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string);
    if (typeof decoded === "object" && decoded !== null && "sub" in decoded) {
      return { sub: String((decoded as jwt.JwtPayload).sub) };
    }
    return null;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
