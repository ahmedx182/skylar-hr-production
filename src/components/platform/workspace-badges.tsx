import { Ban, CheckCircle2, CreditCard, Gift, Trash2 } from "lucide-react";
import type { WorkspaceRow } from "@/server/repositories/platform.repository";

export function WorkspaceStatusBadge({ status }: { status: WorkspaceRow["status"] }) {
  if (status === "deleted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-paper/[0.1] px-2 py-0.5 text-[11px] font-semibold text-paper-2">
        <Trash2 className="size-3" aria-hidden="true" />
        Deleted
      </span>
    );
  }
  return status === "blocked" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-risk/15 px-2 py-0.5 text-[11px] font-semibold text-risk">
      <Ban className="size-3" aria-hidden="true" />
      Suspended
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-semibold text-success">
      <CheckCircle2 className="size-3" aria-hidden="true" />
      Active
    </span>
  );
}

export function WorkspacePlanBadge({ row }: { row: Pick<WorkspaceRow, "planOverride" | "payingViaStripe" | "plan"> }) {
  if (row.planOverride === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sun/15 px-2 py-0.5 text-[11px] font-semibold text-sun">
        <Gift className="size-3" aria-hidden="true" />
        Granted
      </span>
    );
  }
  if (row.payingViaStripe || row.plan === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-[11px] font-semibold text-ink">
        <CreditCard className="size-3" aria-hidden="true" />
        Paid
      </span>
    );
  }
  return <span className="inline-flex rounded-full bg-paper/[0.08] px-2 py-0.5 text-[11px] font-semibold text-paper-2">Free</span>;
}
