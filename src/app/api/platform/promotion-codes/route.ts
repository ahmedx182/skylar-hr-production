import { NextResponse } from "next/server";
import { ValidationError } from "@/lib/errors";
import { describeDiscount } from "@/features/pricing/promotion-code";
import { promotionCodeInputProblem, promotionCodeInputSchema } from "@/schemas/promotion-code.schema";
import { requirePlatformAdmin } from "@/server/auth/platform-admin";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";
import { parseJsonBody } from "@/server/http/parse-json-body";
import { recordPromotionCodeChange } from "@/server/repositories/pricing.repository";
import { createPromotionCode } from "@/server/stripe/promotion-codes";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requirePlatformAdmin();
    const input = await parseJsonBody(request, promotionCodeInputSchema);
    const problem = promotionCodeInputProblem(input);
    if (problem) throw new ValidationError(problem);

    const created = await createPromotionCode(input);
    await recordPromotionCodeChange(created, "create", session, describeDiscount(created));

    return NextResponse.json({ id: created.id, code: created.code }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/platform/promotion-codes");
  }
}
