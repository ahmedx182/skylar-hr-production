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
  companyId: string;
  role: Role;
}
