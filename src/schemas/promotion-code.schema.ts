import { z } from "zod";

export const promotionCodeInputSchema = z.object({
  /** Stripe accepts letters, digits and dashes. Codes are matched case-insensitively, so they are stored upper-case. */
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{3,32}$/)
    .transform((code) => code.toUpperCase()),
  percentOff: z.number().min(1).max(100),
  duration: z.enum(["once", "repeating", "forever"]),
  durationInMonths: z.number().int().min(1).max(36).nullable().default(null),
  /** Stripe fixes the expiry when a code is created; it can't be edited afterwards. */
  expiresAtMs: z.number().int().nullable().default(null),
  maxRedemptions: z.number().int().min(1).max(1_000_000).nullable().default(null),
});

export type PromotionCodeInput = z.infer<typeof promotionCodeInputSchema>;

/** Rules the schema can't express on its own. Returns the message to show, or null when the input is fine. */
export function promotionCodeInputProblem(input: PromotionCodeInput, nowMs = Date.now()): string | null {
  if (input.duration === "repeating" && input.durationInMonths === null) return "Enter how many months the discount lasts.";
  if (input.expiresAtMs !== null && input.expiresAtMs <= nowMs) return "The expiry date must be in the future.";
  return null;
}
