import { NextResponse } from "next/server";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { packageActionSchema, packageInputSchema, toPackageInput } from "@/schemas/pricing.schema";
import { requirePlatformAdmin } from "@/server/auth/platform-admin";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";
import { parseJsonBody } from "@/server/http/parse-json-body";
import { getPackage, setPackageArchived, updatePackage } from "@/server/repositories/pricing.repository";
import { syncPackageToStripe } from "@/server/stripe/pricing-sync";

export const dynamic = "force-dynamic";

type Context = { params: { packageId: string } };

export async function PUT(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const session = await requirePlatformAdmin();
    const payload = await parseJsonBody(request, packageInputSchema);
    const checked = toPackageInput(payload, { id: params.packageId });
    if (!checked.ok) throw new ValidationError(checked.message);

    const updated = await updatePackage(params.packageId, checked.input, session);
    const stripeResult = await syncPackageToStripe(updated);

    return NextResponse.json({ packageId: updated.id, stripe: stripeResult });
  } catch (error) {
    return errorResponse(error, "PUT /api/platform/pricing/[packageId]");
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const session = await requirePlatformAdmin();
    const { action } = await parseJsonBody(request, packageActionSchema);

    if (action === "sync") {
      const pkg = await getPackage(params.packageId);
      if (!pkg) throw new NotFoundError("Package not found.");
      return NextResponse.json({ packageId: pkg.id, stripe: await syncPackageToStripe(pkg) });
    }

    const pkg = await setPackageArchived(params.packageId, action === "archive", session);
    return NextResponse.json({ packageId: pkg.id });
  } catch (error) {
    return errorResponse(error, "POST /api/platform/pricing/[packageId]");
  }
}
