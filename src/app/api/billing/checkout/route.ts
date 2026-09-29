import { NextResponse } from "next/server";
import { BILLING_PATH, BRIEFING_PATH } from "@/constants/routes";
import { getServerEnv } from "@/lib/env/server";
import { requireRole } from "@/server/auth/require-role";
import { requireSession } from "@/server/auth/require-session";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";
import {
  getOrCreateCompanyBillingState,
  saveCheckoutSessionForCompany,
  setStripeCustomerForCompany,
} from "@/server/repositories/billing.repository";
import { stripe, stripePriceId } from "@/server/stripe/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    requireRole(session, ["admin"]);

    const billing = await getOrCreateCompanyBillingState(session);
    const client = stripe();
    const appUrl = getServerEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    const customerId =
      billing.stripeCustomerId ??
      (
        await client.customers.create({
          email: session.email ?? undefined,
          name: session.companyName ?? undefined,
          metadata: { companyId: session.companyId },
        })
      ).id;

    if (!billing.stripeCustomerId) {
      await setStripeCustomerForCompany(session, customerId);
    }

    const checkout = await client.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: stripePriceId(), quantity: 1 }],
      success_url: `${appUrl}${BRIEFING_PATH}?billing=success`,
      cancel_url: `${appUrl}${BILLING_PATH}?billing=cancelled`,
      subscription_data: {
        metadata: {
          companyId: session.companyId,
        },
      },
      metadata: {
        companyId: session.companyId,
      },
    });

    await saveCheckoutSessionForCompany(session, checkout.id);

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    return errorResponse(error, "POST /api/billing/checkout");
  }
}
