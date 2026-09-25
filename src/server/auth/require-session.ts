import "server-only";
import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/constants/routes";
import { AuthenticationError } from "@/lib/errors";
import type { AuthSession } from "@/types/auth";
import { getSession } from "./get-session";

/** For route handlers and actions: throws, so the error maps to a 401. */
export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) throw new AuthenticationError();
  return session;
}

/** For Server Component pages and layouts: sends signed-out users to login. */
export async function requirePageSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) redirect(LOGIN_PATH);
  return session;
}
