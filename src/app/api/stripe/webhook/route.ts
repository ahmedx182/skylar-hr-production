import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getServerEnv } from "@/lib/env/server";
import { ExternalServiceError } from "@/lib/errors";
import { errorResponse } from "@/server/http/error-response";
import {
  markCheckoutCompleted,
  syncStripeSubscription,
} from "@/server/repositories/billing.repository";
import { formatPackagePrice } from "@/features/pricing/package";
import { sendSubscriptionConfirmationEmail } from "@/server/email/subscription-confirmation";
import { getPackage } from "@/server/repositories/pricing.repository";
import { stripe } from "@/server/stripe/client";

export const dynamic = "force-dynamic";

const SUBSCRIPTION_EVENTS = new Set<Stripe.Event.Type>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature");
    const webhookSecret = getServerEnv().STRIPE_WEBHOOK_SECRET;
    if (!signature || !webhookSecret) {
      throw new ExternalServiceError("Stripe webhook is not configured yet.");
    }

    const event = stripe().webhooks.constructEvent(await request.text(), signature, webhookSecret);

    if (SUBSCRIPTION_EVENTS.has(event.type)) {
      await syncStripeSubscription(event.data.object as Stripe.Subscription);
    }

    if (event.type === "checkout.session.completed") {
      const checkout = event.data.object as Stripe.Checkout.Session;
      const firstDelivery = await markCheckoutCompleted(
        checkout.id,
        typeof checkout.subscription === "string" ? checkout.subscription : checkout.subscription?.id,
        checkout.metadata?.companyId,
      );
      const toEmail = checkout.customer_details?.email ?? checkout.customer_email;
      if (firstDelivery && toEmail && checkout.payment_status !== "unpaid") {
        await sendConfirmationEmail(checkout, toEmail);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return errorResponse(error, "POST /api/stripe/webhook");
  }
}

/** A failed email must never fail the webhook: Stripe would retry it and the subscription is already saved. */
async function sendConfirmationEmail(checkout: Stripe.Checkout.Session, toEmail: string) {
  const pkg = checkout.metadata?.packageId ? await getPackage(checkout.metadata.packageId).catch(() => null) : null;
  const price = pkg ? formatPackagePrice(pkg) : null;
  const invoiceId = typeof checkout.invoice === "string" ? checkout.invoice : checkout.invoice?.id;
  const invoice = invoiceId ? await stripe().invoices.retrieve(invoiceId).catch(() => null) : null;
  const result = await sendSubscriptionConfirmationEmail({
    toEmail,
    companyName: checkout.customer_details?.name ?? "Your workspace",
    planName: pkg?.name ?? "Professional",
    priceLabel: price ? `${price.amount} ${price.period}` : null,
    invoice: invoice
      ? {
          number: invoice.number,
          amountLabel: new Intl.NumberFormat("en", { style: "currency", currency: invoice.currency.toUpperCase() }).format(
            invoice.amount_paid / 100,
          ),
          url: invoice.hosted_invoice_url ?? null,
        }
      : null,
    appUrl: getServerEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, ""),
  });
  if (result.status !== "sent") {
    console.error(
      JSON.stringify({ level: "warn", event: "subscription_email_not_sent", checkoutId: checkout.id, status: result.status, reason: result.reason }),
    );
  }
}
