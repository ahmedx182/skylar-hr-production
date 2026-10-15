import "server-only";
import { getServerEnv } from "@/lib/env/server";
import { needsNewStripePrice, type ExistingStripePrice, type PricingPackage } from "@/features/pricing/package";
import { stripe } from "@/server/stripe/client";
import { attachStripeIds } from "@/server/repositories/pricing.repository";

export type StripeSyncResult =
  | { status: "synced"; stripePriceId: string; createdNewPrice: boolean }
  | { status: "skipped"; message: string }
  | { status: "failed"; message: string };

export function isStripeConfigured(): boolean {
  return Boolean(getServerEnv().STRIPE_SECRET_KEY);
}

/**
 * Makes Stripe match a paid package. Prices are immutable in Stripe, so a changed amount creates a new
 * Price and archives the old one; existing subscribers stay on the Price they signed up with.
 */
export async function syncPackageToStripe(pkg: PricingPackage): Promise<StripeSyncResult> {
  if (pkg.priceCents === 0) return { status: "skipped", message: "The Free package has nothing to sync." };
  if (!isStripeConfigured()) {
    return { status: "skipped", message: "Saved. Add STRIPE_SECRET_KEY to sync this package with Stripe." };
  }

  try {
    const client = stripe();

    let existing: ExistingStripePrice | null = null;
    let productId = pkg.stripeProductId;
    if (pkg.stripePriceId) {
      const price = await client.prices.retrieve(pkg.stripePriceId).catch(() => null);
      if (price) {
        existing = {
          active: price.active,
          unitAmount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval ?? null,
          productId: typeof price.product === "string" ? price.product : price.product.id,
        };
        productId ??= existing.productId;
      }
    }

    if (productId) {
      await client.products.update(productId, { name: pkg.name, description: pkg.description || undefined, active: true });
    } else {
      productId = (
        await client.products.create({ name: pkg.name, description: pkg.description || undefined, metadata: { packageId: pkg.id } })
      ).id;
    }

    if (existing && pkg.stripePriceId && !needsNewStripePrice(existing, pkg)) {
      await attachStripeIds(pkg.id, { stripeProductId: productId, stripePriceId: pkg.stripePriceId });
      return { status: "synced", stripePriceId: pkg.stripePriceId, createdNewPrice: false };
    }

    const created = await client.prices.create({
      product: productId,
      currency: "usd",
      unit_amount: pkg.priceCents,
      recurring: { interval: pkg.interval },
      metadata: { packageId: pkg.id },
    });
    await attachStripeIds(pkg.id, { stripeProductId: productId, stripePriceId: created.id });
    if (pkg.stripePriceId && pkg.stripePriceId !== created.id) {
      await client.prices.update(pkg.stripePriceId, { active: false }).catch(() => undefined);
    }
    return { status: "synced", stripePriceId: created.id, createdNewPrice: true };
  } catch (error) {
    console.error(
      JSON.stringify({ level: "error", event: "stripe_package_sync_failed", packageId: pkg.id, error: error instanceof Error ? error.message : "unknown" }),
    );
    return { status: "failed", message: "Saved, but Stripe could not be updated. Use Sync to Stripe to retry." };
  }
}
