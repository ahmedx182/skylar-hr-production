import { NextResponse } from "next/server";
import { z } from "zod";
import { ValidationError } from "@/lib/errors";
import { describeDiscount } from "@/features/pricing/promotion-code";
import { promotionCodeInputProblem, promotionCodeInputSchema } from "@/schemas/promotion-code.schema";
import { requirePlatformAdmin } from "@/server/auth/platform-admin";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";
import { parseJsonBody } from "@/server/http/parse-json-body";
import { recordPromotionCodeChange } from "@/server/repositories/pricing.repository";
import { replacePromotionCode, setPromotionCodeActive } from "@/server/stripe/promotion-codes";

export const dynamic = "force-dynamic";

const PROMOTION_CODE_ID = /^promo_[A-Za-z0-9]+$/;
const bodySchema = z.object({ active: z.boolean() });

type Context = { params: { promotionCodeId: string } };

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const session = await requirePlatformAdmin();
    const id = params.promotionCodeId;
    if (!PROMOTION_CODE_ID.test(id)) throw new ValidationError("That promo code id isn't valid.");
    const { active } = await parseJsonBody(request, bodySchema);

    const updated = await setPromotionCodeActive(id, active);
    await recordPromotionCodeChange(updated, updated.active ? "activate" : "deactivate", session);

    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error, "PATCH /api/platform/promotion-codes/[promotionCodeId]");
  }
}

/** Editing a code replaces it: Stripe fixes a code's discount, expiry and limit when it is created. */
export async function PUT(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const session = await requirePlatformAdmin();
    const id = params.promotionCodeId;
    if (!PROMOTION_CODE_ID.test(id)) throw new ValidationError("That promo code id isn't valid.");
    const input = await parseJsonBody(request, promotionCodeInputSchema);
    const problem = promotionCodeInputProblem(input);
    if (problem) throw new ValidationError(problem);

    const { created, replacedCode } = await replacePromotionCode(id, input);
    await recordPromotionCodeChange(created, "replace", session, `Replaces ${replacedCode}: ${describeDiscount(created)}`);

    return NextResponse.json({ id: created.id, code: created.code });
  } catch (error) {
    return errorResponse(error, "PUT /api/platform/promotion-codes/[promotionCodeId]");
  }
}
