import "server-only";
import { notFound } from "next/navigation";
import { AuthorizationError } from "@/lib/errors";
import type { AuthSession } from "@/types/auth";
import { requirePageSession, requireSession } from "./require-session";

/** Pages: anyone else gets a 404, so the console's existence isn't revealed. */
export async function requirePlatformAdminPage(): Promise<AuthSession> {
  const session = await requirePageSession();
  if (!session.isPlatformAdmin) notFound();
  return session;
}

/** Route handlers: maps to a 403. */
export async function requirePlatformAdmin(): Promise<AuthSession> {
  const session = await requireSession();
  if (!session.isPlatformAdmin) throw new AuthorizationError("Platform access required.");
  return session;
}
