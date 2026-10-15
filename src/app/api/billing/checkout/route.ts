import { NextResponse } from "next/server";
import { z } from "zod";
import { BILLING_PATH, BRIEFING_PATH } from "@/constants/routes";
import { getServerEnv } from "@/lib/env/server";
import { isPurchasable } from "@/features/pricing/package";
import { ConflictError } from "@/lib/errors";
import { requireRole } from "@/server/auth/require-role";
import { requireSession } from "@/server/auth/require-session";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";
import { parseJsonBody } from "@/server/http/parse-json-body";
import { getPackage } from "@/server/repositories/pricing.repository";
import {
  getOrCreateCompanyBillingState,
  saveCheckoutSessionForCompany,
  setStripeCustomerForCompany,
} from "@/server/repositories/billing.repository";
import { stripe } from "@/server/stripe/client";

export const dynamic = "force-dynamic";

const checkoutInputSchema = z.object({ packageId: z.string().trim().min(1).max(100) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const { packageId } = await parseJsonBody(request, checkoutInputSchema);
    const pkg = await getPackage(packageId);
    if (!pkg || !isPurchasable(pkg)) throw new ConflictError("That plan isn't available right now.");

    const billing = await getOrCreateCompanyBillingState(session);
    if (billing.stripeSubscriptionId && (billing.status === "active" || billing.status === "past_due")) {
      throw new ConflictError("This workspace already has a subscription. Use the customer portal to manage it.");
    }
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
      line_items: [{ price: pkg.stripePriceId as string, quantity: 1 }],
      success_url: `${appUrl}${BRIEFING_PATH}?billing=success`,
      cancel_url: `${appUrl}${BILLING_PATH}?billing=cancelled`,
      subscription_data: {
        metadata: {
          companyId: session.companyId,
          packageId: pkg.id,
        },
      },
      metadata: {
        companyId: session.companyId,
        packageId: pkg.id,
      },
      ui_mode: "hosted_page",
      billing_address_collection: "auto",
      phone_number_collection: { enabled: false },
      automatic_tax: { enabled: false },
      allow_promotion_codes: false,
      payment_method_collection: "always",
      submit_type: "auto",
      integration_identifier: "hosted_web_0001",
      origin_context: "web",
    });

    await saveCheckoutSessionForCompany(session, checkout.id);

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    return errorResponse(error, "POST /api/billing/checkout");
  }
}
