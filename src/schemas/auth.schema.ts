import { z } from "zod";
import { ROLES } from "@/constants/auth";

/** Firebase ID tokens are about 1 KB; the cap only rejects abuse. */
const MAX_ID_TOKEN_LENGTH = 4096;

export const sessionRequestSchema = z.object({
  idToken: z.string().min(1).max(MAX_ID_TOKEN_LENGTH),
  signup: z
    .object({
      companyName: z.string().trim().min(2).max(120),
    })
    .optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Enter a valid work email." })),
});

export const signupSchema = loginSchema.extend({
  companyName: z.string().trim().min(2, "Enter your company name.").max(120),
});

export const accountSettingsSchema = z.object({
  displayName: z.string().trim().max(80, "Keep your name under 80 characters.").optional(),
  companyName: z.string().trim().min(2, "Enter your company name.").max(120),
});

export type AccountSettingsInput = z.infer<typeof accountSettingsSchema>;

/** Shape of `users/{uid}`. Validated on read so a bad record fails closed. */
export const appUserSchema = z.object({
  companyId: z.string().min(1),
  email: z.string(),
  displayName: z.string().optional(),
  role: z.enum(ROLES),
  status: z.enum(["active", "disabled"]),
});
