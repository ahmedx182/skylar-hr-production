import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function StatTile({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  tone?: "neutral" | "accent" | "risk" | "success";
}) {
  return (
    <div className="rounded-2xl bg-paper/[0.045] p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-paper-3">{label}</p>
        <Icon
          className={cn(
            "size-4",
            tone === "accent" && "text-sun",
            tone === "risk" && "text-risk",
            tone === "success" && "text-success",
            tone === "neutral" && "text-paper-3",
          )}
          aria-hidden="true"
        />
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-paper">{value}</p>
      {detail && <p className="mt-1 text-xs leading-5 text-paper-3">{detail}</p>}
    </div>
  );
}
