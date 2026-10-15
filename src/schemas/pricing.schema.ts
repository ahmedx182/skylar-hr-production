import { z } from "zod";
import { FREE_PACKAGE_ID, MIN_PAID_PRICE_CENTS, type PricingPackageInput } from "@/features/pricing/package";

const MAX_PRICE_CENTS = 10_000_000;

const featureList = z
  .array(z.string().trim().max(120, "Keep each feature under 120 characters."))
  .transform((items) => items.filter(Boolean))
  .pipe(z.array(z.string()).max(12, "Keep it to 12 features."));

export const packageInputSchema = z.object({
  name: z.string().trim().min(2, "Enter a package name.").max(40, "Keep the name under 40 characters."),
  description: z.string().trim().max(160, "Keep the description under 160 characters.").default(""),
  /** Dollars as typed by the admin; converted to whole cents. */
  priceUsd: z.number().min(0).max(MAX_PRICE_CENTS / 100),
  interval: z.enum(["month", "year"]),
  features: featureList,
  advisorMessageLimit: z.number().int().min(0).max(100_000).nullable().default(null),
  highlighted: z.boolean().default(false),
  badge: z
    .string()
    .trim()
    .max(24, "Keep the badge under 24 characters.")
    .nullable()
    .default(null)
    .transform((value) => value || null),
  published: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

export type PackageInputPayload = z.infer<typeof packageInputSchema>;

export const packageActionSchema = z.object({
  action: z.enum(["archive", "restore", "sync"]),
});

/** Applies the rules that depend on whether this is the free package. Returns the cleaned input or an error message. */
export function toPackageInput(
  payload: PackageInputPayload,
  { id }: { id: string | null },
): { ok: true; input: PricingPackageInput } | { ok: false; message: string } {
  const isFree = id === FREE_PACKAGE_ID;
  const priceCents = isFree ? 0 : Math.round(payload.priceUsd * 100);

  if (!isFree && priceCents < MIN_PAID_PRICE_CENTS) {
    return { ok: false, message: "Paid packages must cost at least $0.50. The Free package is the only $0 package." };
  }
  if (isFree && payload.advisorMessageLimit === null) {
    return { ok: false, message: "Set how many advisor messages the Free package includes." };
  }

  return {
    ok: true,
    input: {
      name: payload.name,
      description: payload.description,
      priceCents,
      interval: payload.interval,
      features: payload.features,
      advisorMessageLimit: isFree ? payload.advisorMessageLimit : null,
      highlighted: payload.highlighted,
      badge: payload.badge,
      published: payload.published,
      sortOrder: payload.sortOrder,
    },
  };
}
