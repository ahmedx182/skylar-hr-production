import { cleanLedgerMarkdown, conversationLedgerSummary } from "@/features/briefing/ledger-display";

export type EmployeeMemoryLedgerItem = {
  type: string;
  description: string;
  statusDot: "amber" | "green" | "red" | null;
  dateMs: number;
};

function firstSentence(text: string): string {
  const cleaned = cleanLedgerMarkdown(text).replace(/\s+/g, " ").trim();
  const sentence = cleaned.match(/^(.+?[.!?])(?:\s|$)/)?.[1] ?? cleaned;
  const clipped = sentence.length > 140 ? `${sentence.slice(0, 137).trim()}...` : sentence;
  return /[.!?]$/.test(clipped) ? clipped : `${clipped}.`;
}

function statusLabel(statusDot: EmployeeMemoryLedgerItem["statusDot"]): string {
  if (statusDot === "red") return "high attention";
  if (statusDot === "amber") return "needs follow-up";
  if (statusDot === "green") return "resolved";
  return "active";
}

function nextStepFromDescription(item: EmployeeMemoryLedgerItem): string | null {
  if (item.type === "conversation") {
    const summary = conversationLedgerSummary(item.description);
    const nextStep = summary.nextSteps[0] ?? summary.goal ?? null;
    return nextStep ? firstSentence(nextStep) : null;
  }

  const explicitNext = item.description.match(/(?:recommended next step|next step|follow-up):\s*([^.\n]+(?:\.[^\n]*)?)/i);
  if (explicitNext?.[1]) return firstSentence(explicitNext[1]);

  return null;
}

export function buildEmployeeMemorySummary(items: EmployeeMemoryLedgerItem[]): string | null {
  const ordered = [...items]
    .filter((item) => item.description.trim())
    .sort((a, b) => b.dateMs - a.dateMs);

  if (!ordered.length) return null;

  const latest = ordered[0];
  const highRiskCount = ordered.filter((item) => item.statusDot === "red").length;
  const nextStep = nextStepFromDescription(latest);
  const historyLabel = `${ordered.length} ${ordered.length === 1 ? "entry" : "entries"}`;
  const riskLabel = highRiskCount ? `, ${highRiskCount} high attention` : "";

  return [
    `Current: ${firstSentence(latest.description)}`,
    `State: ${statusLabel(latest.statusDot)}.`,
    nextStep ? `Next: ${nextStep}` : null,
    `History: ${historyLabel}${riskLabel}.`,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");
}
