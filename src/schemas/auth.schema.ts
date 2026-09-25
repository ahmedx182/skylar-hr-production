import { z } from "zod";
import { ROLES } from "@/constants/auth";

/** Firebase ID tokens are about 1 KB; the cap only rejects abuse. */
const MAX_ID_TOKEN_LENGTH = 4096;

export const sessionRequestSchema = z.object({
  idToken: z.string().min(1).max(MAX_ID_TOKEN_LENGTH),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Enter a valid work email." })),
});

/** Shape of `users/{uid}`. Validated on read so a bad record fails closed. */
export const appUserSchema = z.object({
  companyId: z.string().min(1),
  email: z.string(),
  displayName: z.string().optional(),
  role: z.enum(ROLES),
  status: z.enum(["active", "disabled"]),
});
