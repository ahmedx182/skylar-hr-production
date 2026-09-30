import "server-only";
import Stripe from "stripe";
import { ExternalServiceError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env/server";

let stripeClient: Stripe | undefined;

export function stripe() {
  const { STRIPE_SECRET_KEY } = getServerEnv();
  if (!STRIPE_SECRET_KEY) {
    throw new ExternalServiceError("Stripe is not configured yet.");
  }

  stripeClient ??= new Stripe(STRIPE_SECRET_KEY);

  return stripeClient;
}

export function stripePriceId() {
  const { STRIPE_PRICE_ID } = getServerEnv();
  if (!STRIPE_PRICE_ID) {
    throw new ExternalServiceError("Stripe price is not configured yet.");
  }

  return STRIPE_PRICE_ID;
}
