/** Stripe's answer when an id was saved under the other mode's keys (test vs live) or has been deleted. */
export function isMissingInStripe(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "resource_missing";
}
