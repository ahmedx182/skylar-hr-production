import { ArrowUpRight } from "lucide-react";
import type { BillingHistoryItem } from "@/server/stripe/billing-history";
import { cn } from "@/lib/utils/cn";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

const statusStyle: Record<BillingHistoryItem["status"], { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-success/15 text-success" },
  open: { label: "Unpaid", className: "bg-attention/15 text-attention" },
  uncollectible: { label: "Failed", className: "bg-risk/15 text-risk" },
  void: { label: "Void", className: "bg-paper/10 text-paper-2" },
  draft: { label: "Draft", className: "bg-paper/10 text-paper-2" },
};

function formatAmount(item: BillingHistoryItem): string {
  return new Intl.NumberFormat("en", { style: "currency", currency: item.currency.toUpperCase() }).format(item.amountCents / 100);
}

/** `items` is null when Stripe couldn't be reached. */
export function BillingHistory({ items }: { items: BillingHistoryItem[] | null }) {
  return (
    <div className="rounded-[20px] bg-ink-2/70 p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.04)]">
      <p className="font-mono text-xs uppercase text-paper-3">Billing history</p>
      {items === null ? (
        <p className="mt-3 text-sm leading-6 text-paper-2">Billing history isn&apos;t available right now. Try again in a moment.</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-paper-2">No invoices yet. They&apos;ll appear here after your first payment.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-xs text-paper-3">
              <tr>
                <th scope="col" className="pb-2 pr-4 font-normal">Date</th>
                <th scope="col" className="pb-2 pr-4 font-normal">Description</th>
                <th scope="col" className="pb-2 pr-4 text-right font-normal">Amount</th>
                <th scope="col" className="pb-2 pr-4 font-normal">Status</th>
                <th scope="col" className="pb-2 text-right font-normal">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const status = statusStyle[item.status];
                const link = item.receiptUrl ?? item.pdfUrl;
                return (
                  <tr key={item.id} className="border-t border-paper/10">
                    <td className="whitespace-nowrap py-3 pr-4 text-paper-2">{dateFormat.format(item.createdMs)}</td>
                    <td className="py-3 pr-4">
                      <span className="text-paper">{item.description}</span>
                      {item.number && <span className="ml-2 text-xs text-paper-3">{item.number}</span>}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-right font-semibold text-paper">{formatAmount(item)}</td>
                    <td className="py-3 pr-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", status.className)}>{status.label}</span>
                    </td>
                    <td className="py-3 text-right">
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-paper-2 transition-colors hover:text-paper"
                        >
                          View
                          <ArrowUpRight className="size-3.5" aria-hidden="true" />
                          <span className="sr-only"> invoice {item.number ?? item.id}</span>
                        </a>
                      ) : (
                        <span className="text-paper-3">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
