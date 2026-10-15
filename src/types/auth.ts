import type { z } from "zod";
import type { ROLES } from "@/constants/auth";
import type { appUserSchema } from "@/schemas/auth.schema";

export type Role = (typeof ROLES)[number];

/** Application user record (`users/{uid}`), keyed by the Firebase uid. */
export type AppUser = z.infer<typeof appUserSchema> & { id: string };

/** Server-resolved identity. Never build this from client input. */
export interface AuthSession {
  uid: string;
  email: string | null;
  displayName?: string | null;
  companyId: string;
  companyName?: string | null;
  role: Role;
  /** Firestore employee record id linked to this user account. Set for employee-role users. */
  linkedEmployeeId?: string | null;
  /** Skylar staff with cross-workspace access (PLATFORM_ADMIN_EMAILS). Absent means false. */
  isPlatformAdmin?: boolean;
  /** Set when a platform admin has suspended or deleted this workspace. */
  workspaceBlocked?: boolean;
  /** When the workspace is soft-deleted: the time its data will be permanently removed. */
  workspaceDeleteAfterMs?: number | null;
}
