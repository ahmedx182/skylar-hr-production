import type { AuthSession } from "@/types/auth";

export function companyDisplayName(session: Pick<AuthSession, "companyId" | "companyName" | "email">): string {
  if (session.companyName?.trim()) return session.companyName.trim();

  const domain = session.email?.split("@")[1]?.split(".")[0];
  if (domain) {
    return domain
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return session.companyId;
}
