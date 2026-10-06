import type { AppUser } from "@/types/auth";

/** Only serializable fields needed by the client-side team table. */
export type TeamMember = Pick<AppUser, "id" | "email" | "displayName" | "role">;

export function toTeamMember(user: AppUser): TeamMember {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}
