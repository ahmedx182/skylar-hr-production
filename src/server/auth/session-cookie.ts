import { SESSION_MAX_AGE_MS } from "@/constants/auth";

/** One definition for set and clear, so a clear always matches the original cookie. */
export function sessionCookieOptions(maxAgeMs: number = SESSION_MAX_AGE_MS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}
