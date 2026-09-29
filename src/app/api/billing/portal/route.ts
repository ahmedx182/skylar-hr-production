import { NextResponse } from "next/server";
import { BILLING_PATH } from "@/constants/routes";
import { getServerEnv } from "@/lib/env/server";
import { ConflictError } from "@/lib/errors";
import { requireRole } from "@/server/auth/require-role";
import { requireSession } from "@/server/auth/require-session";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";
import { getOrCreateCompanyBillingState } from "@/server/repositories/billing.repository";
import { stripe } from "@/server/stripe/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const billing = await getOrCreateCompanyBillingState(session);
    if (!billing.stripeCustomerId) {
      throw new ConflictError("Start billing before opening the customer portal.");
    }

    const appUrl = getServerEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    const portal = await stripe().billingPortal.sessions.create({
      customer: billing.stripeCustomerId,
      return_url: `${appUrl}${BILLING_PATH}`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    return errorResponse(error, "POST /api/billing/portal");
  }
}
