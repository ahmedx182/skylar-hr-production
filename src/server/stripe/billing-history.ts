import "server-only";
import { stripe } from "@/server/stripe/client";

export type BillingHistoryItem = {
  id: string;
  number: string | null;
  description: string;
  createdMs: number;
  amountCents: number;
  currency: string;
  status: "paid" | "open" | "void" | "uncollectible" | "draft";
  receiptUrl: string | null;
  pdfUrl: string | null;
};

const HISTORY_LIMIT = 24;

/**
 * The workspace's invoices, newest first, straight from Stripe (the source of truth for what was charged).
 * Drafts are skipped: they were never sent to the customer. Returns null when Stripe can't be reached,
 * so the page can say so instead of showing an empty history.
 */
export async function listBillingHistory(stripeCustomerId: string): Promise<BillingHistoryItem[] | null> {
  try {
    const invoices = await stripe().invoices.list({ customer: stripeCustomerId, limit: HISTORY_LIMIT });
    return invoices.data
      .filter((invoice) => invoice.status && invoice.status !== "draft")
      .map((invoice) => ({
        id: invoice.id as string,
        number: invoice.number,
        description: invoice.lines.data[0]?.description ?? "Skylar subscription",
        createdMs: invoice.created * 1000,
        amountCents: invoice.status === "paid" ? invoice.amount_paid : invoice.amount_due,
        currency: invoice.currency,
        status: invoice.status as BillingHistoryItem["status"],
        receiptUrl: invoice.hosted_invoice_url ?? null,
        pdfUrl: invoice.invoice_pdf ?? null,
      }));
  } catch (error) {
    console.error(
      JSON.stringify({ level: "error", event: "billing_history_failed", error: error instanceof Error ? error.message : "unknown" }),
    );
    return null;
  }
}
