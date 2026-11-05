import "server-only";
import { notFound } from "next/navigation";
import { AuthorizationError } from "@/lib/errors";
import type { AuthSession } from "@/types/auth";
import { requirePageSession, requireSession } from "./require-session";

/** HR advisors and super admins may work the advisor desk. */
export function isAdvisor(session: Pick<AuthSession, "isPlatformAdmin" | "isHrAdvisor">): boolean {
  return Boolean(session.isPlatformAdmin || session.isHrAdvisor);
}

/** Pages: anyone else gets a 404, so the desk's existence isn't revealed. */
export async function requireAdvisorPage(): Promise<AuthSession> {
  const session = await requirePageSession();
  if (!isAdvisor(session)) notFound();
  return session;
}

/** Route handlers: maps to a 403. */
export async function requireAdvisor(): Promise<AuthSession> {
  const session = await requireSession();
  if (!isAdvisor(session)) throw new AuthorizationError("Advisor access required.");
  return session;
}
