// Pure constants only — no jsonwebtoken/bcrypt imports here, so this file
// stays safe to import from Edge middleware.
export const SESSION_COOKIE_NAME = "matcha_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days
