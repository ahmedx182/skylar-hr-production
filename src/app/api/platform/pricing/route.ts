import { NextResponse } from "next/server";
import { ValidationError } from "@/lib/errors";
import { packageInputSchema, toPackageInput } from "@/schemas/pricing.schema";
import { requirePlatformAdmin } from "@/server/auth/platform-admin";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";
import { parseJsonBody } from "@/server/http/parse-json-body";
import { createPackage } from "@/server/repositories/pricing.repository";
import { syncPackageToStripe } from "@/server/stripe/pricing-sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requirePlatformAdmin();
    const payload = await parseJsonBody(request, packageInputSchema);
    const checked = toPackageInput(payload, { id: null });
    if (!checked.ok) throw new ValidationError(checked.message);

    const created = await createPackage(checked.input, session);
    const stripeResult = await syncPackageToStripe(created);

    return NextResponse.json({ packageId: created.id, stripe: stripeResult }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/platform/pricing");
  }
}
