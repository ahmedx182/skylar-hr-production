"use client";

import { ArrowUpFromLine, Archive, CheckCircle2, ChevronDown, CloudCheck, CloudOff, Pencil } from "lucide-react";
import { useState } from "react";
import { displayFeatures, formatPackagePrice, isFreePackage } from "@/features/pricing/package";
import { cn } from "@/lib/utils/cn";
import type { PackageWithStats } from "@/components/platform/pricing-manager";

type Status = { tone: "live" | "attention" | "hidden"; label: string; detail: string };

/** What a customer can actually do with this package right now. */
function statusOf(pkg: PackageWithStats): Status {
  if (!pkg.published) return { tone: "hidden", label: "Draft", detail: "Hidden from customers." };
  if (!isFreePackage(pkg) && !pkg.stripePriceId) {
    return { tone: "attention", label: "Needs sync", detail: "Shown to customers, but it can't be bought until it is synced to Stripe." };
  }
  return { tone: "live", label: "Live", detail: "Shown on the landing page and in Billing." };
}

const dotClass: Record<Status["tone"], string> = { live: "bg-success", attention: "bg-sun", hidden: "bg-paper-3" };

const actionBase =
  "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40 disabled:cursor-wait disabled:opacity-60";

const COLUMNS = 6;

export function PlansTable({
  packages,
  busy,
  workingId,
  onEdit,
  onSync,
  onArchive,
}: {
  packages: PackageWithStats[];
  busy: boolean;
  /** The package whose own request is in flight. */
  workingId: string | null;
  onEdit: (pkg: PackageWithStats) => void;
  onSync: (pkg: PackageWithStats) => void;
  onArchive: (pkg: PackageWithStats) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-[22px] bg-paper/[0.04] ring-1 ring-paper/[0.08]">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead>
          <tr className="text-xs text-paper-3">
            <th scope="col" className="px-5 py-3 font-medium">Plan</th>
            <th scope="col" className="px-3 py-3 font-medium">Price</th>
            <th scope="col" className="px-3 py-3 font-medium">Status</th>
            <th scope="col" className="px-3 py-3 font-medium">Stripe</th>
            <th scope="col" className="px-3 py-3 text-right font-medium">On plan</th>
            <th scope="col" className="px-5 py-3 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        {packages.map((pkg) => {
          const isFree = isFreePackage(pkg);
          const synced = Boolean(pkg.stripePriceId);
          const price = formatPackagePrice(pkg);
          const status = statusOf(pkg);
          const open = openId === pkg.id;
          const detailId = `plan-details-${pkg.id}`;
          const features = displayFeatures(pkg);

          return (
            <tbody key={pkg.id} className="border-t border-paper/[0.06]">
              <tr className={cn("align-middle transition-colors", open ? "bg-paper/[0.03]" : "hover:bg-paper/[0.02]")}>
                <td className="px-5 py-4">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={detailId}
                    onClick={() => setOpenId(open ? null : pkg.id)}
                    className="group flex w-full min-w-0 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40"
                  >
                    <ChevronDown
                      className={cn("size-4 shrink-0 text-paper-3 transition-transform duration-200 group-hover:text-paper", open && "rotate-180")}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold text-paper">{pkg.name}</span>
                        {isFree && <span className="rounded-full bg-paper/[0.08] px-2 py-0.5 text-[11px] font-semibold text-paper-2">Default plan</span>}
                        {pkg.badge && <span className="rounded-full bg-sun/15 px-2 py-0.5 text-[11px] font-semibold text-sun">{pkg.badge}</span>}
                      </span>
                      <span className="mt-0.5 block max-w-[44ch] truncate text-xs text-paper-3">{pkg.description || "No description yet."}</span>
                    </span>
                  </button>
                </td>
                <td className="whitespace-nowrap px-3 py-4">
                  <span className="text-[15px] font-semibold tabular-nums text-paper">{price.amount}</span>{" "}
                  <span className="text-xs text-paper-3">{price.period}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-4" title={status.detail}>
                  <span className={cn("inline-flex items-center gap-2 text-sm", status.tone === "attention" ? "text-sun" : "text-paper-2")}>
                    <span className={cn("size-1.5 rounded-full", dotClass[status.tone])} aria-hidden="true" />
                    {status.label}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4">
                  {isFree ? (
                    <span className="text-sm text-paper-3">Not needed</span>
                  ) : (
                    <span className={cn("inline-flex items-center gap-1.5 text-sm", synced ? "text-paper-2" : "text-sun")}>
                      {synced ? <CloudCheck className="size-4 text-success" aria-hidden="true" /> : <CloudOff className="size-4" aria-hidden="true" />}
                      {synced ? "Synced" : "Not synced"}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-right">
                  <span className="text-[15px] font-semibold tabular-nums text-paper">{pkg.subscribers}</span>{" "}
                  <span className="text-xs text-paper-3">{isFree ? (pkg.subscribers === 1 ? "workspace" : "workspaces") : pkg.subscribers === 1 ? "subscriber" : "subscribers"}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1.5">
                    {!isFree && (
                      <button type="button" disabled={busy} onClick={() => onArchive(pkg)} className={cn(actionBase, "text-paper-3 hover:bg-paper/[0.08] hover:text-paper")}>
                        <Archive className="size-3.5" aria-hidden="true" />
                        Archive
                      </button>
                    )}
                    {!isFree && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onSync(pkg)}
                        className={cn(actionBase, synced ? "text-paper-2 hover:bg-paper/[0.08] hover:text-paper" : "bg-sun text-ink hover:opacity-90")}
                      >
                        <ArrowUpFromLine className="size-3.5" aria-hidden="true" />
                        {workingId === pkg.id ? "Working..." : synced ? "Re-sync" : "Sync to Stripe"}
                      </button>
                    )}
                    <button type="button" disabled={busy} onClick={() => onEdit(pkg)} className={cn(actionBase, "bg-paper text-ink hover:opacity-90")}>
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
              {open && (
                <tr id={detailId} className="bg-paper/[0.03]">
                  <td colSpan={COLUMNS} className="px-5 pb-5 pl-[3.25rem] pt-1">
                    {pkg.description && <p className="mb-3 max-w-[70ch] text-sm leading-6 text-paper-2">{pkg.description}</p>}
                    {features.length ? (
                      <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                        {features.map((feature, index) => (
                          <li key={`${feature}-${index}`} className="flex items-start gap-2.5 text-sm leading-5 text-paper-2">
                            <CheckCircle2 className={cn("mt-px size-4 shrink-0", pkg.highlighted ? "text-sun" : "text-paper-3")} aria-hidden="true" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-paper-3">No features listed yet.</p>
                    )}
                    <p className="mt-3 text-xs text-paper-3">{status.detail}</p>
                  </td>
                </tr>
              )}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
