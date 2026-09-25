import { cn } from "@/lib/utils/cn";

export function BriefingProgress({
  total,
  current = 0,
}: {
  total: number;
  current?: number;
}) {
  return (
    <div className="flex items-center gap-1" aria-label={`${total} briefing cards`}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-10 w-1 bg-paper/15",
            index === current && "bg-attention",
          )}
        />
      ))}
    </div>
  );
}
