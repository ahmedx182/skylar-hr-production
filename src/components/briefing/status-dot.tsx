import { cn } from "@/lib/utils/cn";
import type { BriefingTone } from "@/features/briefing/types";

const toneClass: Record<BriefingTone, string> = {
  attention: "bg-attention",
  success: "bg-success",
  risk: "bg-risk",
  neutral: "bg-paper-3",
};

export function StatusDot({ tone }: { tone: BriefingTone }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2.5 shrink-0 rounded-full ring-2 ring-current/10", toneClass[tone])}
    />
  );
}
