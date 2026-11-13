import "server-only";
import type Stripe from "stripe";
import { ConflictError } from "@/lib/errors";
import type { PromotionCodeInput } from "@/schemas/promotion-code.schema";
import type { PromotionCodeSummary } from "@/features/pricing/promotion-code";
import { stripe } from "@/server/stripe/client";

function toSummary(promotionCode: Stripe.PromotionCode, expandedCoupon?: Stripe.Coupon): PromotionCodeSummary {
  const coupon = expandedCoupon ?? (typeof promotionCode.promotion.coupon === "object" ? promotionCode.promotion.coupon : null);
  return {
    id: promotionCode.id,
    code: promotionCode.code,
    active: promotionCode.active,
    couponValid: coupon?.valid ?? true,
    couponName: coupon?.name ?? null,
    percentOff: coupon?.percent_off ?? null,
    amountOffCents: coupon?.amount_off ?? null,
    currency: coupon?.currency ?? null,
    duration: coupon?.duration === "forever" ? "forever" : coupon?.duration === "repeating" ? "repeating" : "once",
    durationInMonths: coupon?.duration_in_months ?? null,
    timesRedeemed: promotionCode.times_redeemed,
    maxRedemptions: promotionCode.max_redemptions,
    expiresAtMs: promotionCode.expires_at ? promotionCode.expires_at * 1000 : null,
  };
}

/** Newest first, as Stripe returns them. 100 is far more codes than this console is meant to hold. */
export async function listPromotionCodes(): Promise<PromotionCodeSummary[]> {
  const page = await stripe().promotionCodes.list({ limit: 100, expand: ["data.promotion.coupon"] });
  return page.data.map((promotionCode) => toSummary(promotionCode));
}

function asConflict(error: unknown, fallback: string): never {
  // Stripe refuses duplicate codes and reactivating expired ones; that is the admin's to know, not a server fault.
  if ((error as { type?: string }).type === "StripeInvalidRequestError") {
    throw new ConflictError(error instanceof Error ? error.message : fallback);
  }
  throw error;
}

/**
 * Creates the coupon and the customer-facing code together. Stripe fixes the expiry and redemption cap at
 * creation, so changing either later means creating a new code.
 */
export async function createPromotionCode(input: PromotionCodeInput): Promise<PromotionCodeSummary> {
  const client = stripe();
  const coupon = await client.coupons.create({
    name: input.code,
    percent_off: input.percentOff,
    duration: input.duration,
    ...(input.duration === "repeating" ? { duration_in_months: input.durationInMonths ?? 1 } : {}),
  });
  try {
    const created = await client.promotionCodes.create({
      promotion: { type: "coupon", coupon: coupon.id },
      code: input.code,
      ...(input.expiresAtMs !== null ? { expires_at: Math.floor(input.expiresAtMs / 1000) } : {}),
      ...(input.maxRedemptions !== null ? { max_redemptions: input.maxRedemptions } : {}),
    });
    return toSummary(created, coupon);
  } catch (error) {
    await client.coupons.del(coupon.id).catch(() => undefined);
    return asConflict(error, "Stripe could not create that promo code.");
  }
}

/**
 * Stripe can't change a live code's discount, expiry or limit, so editing means replacing it. The old code is
 * switched off first so the same code text can be reused, and switched back on if the replacement fails.
 * People who already used the old code keep their discount.
 */
export async function replacePromotionCode(oldId: string, input: PromotionCodeInput): Promise<{ created: PromotionCodeSummary; replacedCode: string }> {
  const client = stripe();
  let old: Stripe.PromotionCode;
  try {
    old = await client.promotionCodes.retrieve(oldId);
  } catch (error) {
    return asConflict(error, "That promo code no longer exists.");
  }
  if (old.active) await client.promotionCodes.update(oldId, { active: false });
  try {
    return { created: await createPromotionCode(input), replacedCode: old.code };
  } catch (error) {
    if (old.active) await client.promotionCodes.update(oldId, { active: true }).catch(() => undefined);
    throw error;
  }
}

/** Turns a code on or off at checkout. Existing subscriptions that already used it keep their discount. */
export async function setPromotionCodeActive(id: string, active: boolean): Promise<{ id: string; code: string; active: boolean }> {
  try {
    const updated = await stripe().promotionCodes.update(id, { active });
    return { id: updated.id, code: updated.code, active: updated.active };
  } catch (error) {
    return asConflict(error, "Stripe could not change that promo code.");
  }
}
