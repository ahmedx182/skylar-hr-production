export type LedgerStatusDot = "amber" | "green" | "red" | null;

export function ledgerStatusLabel(statusDot: LedgerStatusDot): string {
  if (statusDot === "green") return "Resolved";
  if (statusDot === "red") return "Needs review";
  if (statusDot === "amber") return "Needs follow-up";
  return "No marker";
}
