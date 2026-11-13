import { formatDollars } from "@/features/pricing/package";

/** A Stripe promotion code as the platform console shows it. Stripe owns the data; nothing is stored here. */
export type PromotionCodeSummary = {
  id: string;
  code: string;
  /** The code's own switch. Stripe also needs the coupon behind it to still be valid. */
  active: boolean;
  couponValid: boolean;
  couponName: string | null;
  percentOff: number | null;
  amountOffCents: number | null;
  currency: string | null;
  duration: "once" | "repeating" | "forever";
  durationInMonths: number | null;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAtMs: number | null;
};

export type PromotionCodeState = "active" | "off" | "expired";

/** "expired" means turning it back on is pointless: Stripe rejects it. */
export function promotionCodeState(code: PromotionCodeSummary, nowMs = Date.now()): PromotionCodeState {
  const expired = !code.couponValid || (code.expiresAtMs !== null && code.expiresAtMs <= nowMs);
  if (expired) return "expired";
  return code.active ? "active" : "off";
}

/** "100% off for 1 month", "$20 off the first payment". */
export function describeDiscount(code: PromotionCodeSummary): string {
  const amount =
    code.percentOff !== null
      ? `${Number(code.percentOff.toFixed(2))}% off`
      : code.amountOffCents !== null
        ? `${code.currency && code.currency !== "usd" ? `${(code.amountOffCents / 100).toFixed(2)} ${code.currency.toUpperCase()}` : formatDollars(code.amountOffCents)} off`
        : "Discount";

  if (code.duration === "forever") return `${amount} forever`;
  if (code.duration === "repeating") {
    const months = code.durationInMonths ?? 1;
    return `${amount} for ${months} ${months === 1 ? "month" : "months"}`;
  }
  return `${amount} on the first payment`;
}
