import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getServerEnv } from "@/lib/env/server";
import { ExternalServiceError } from "@/lib/errors";
import { errorResponse } from "@/server/http/error-response";
import {
  markCheckoutCompleted,
  syncStripeSubscription,
} from "@/server/repositories/billing.repository";
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
      await markCheckoutCompleted(
        checkout.id,
        typeof checkout.subscription === "string" ? checkout.subscription : checkout.subscription?.id,
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return errorResponse(error, "POST /api/stripe/webhook");
  }
}
