export type EmployeePriority = "High" | "Follow-up" | "Resolved" | "Normal";

/**
 * Priority shown on an employee's profile. An open advisor case always means High,
 * so a newer ordinary note cannot hide it; otherwise the latest note decides.
 */
export function employeePriority({
  latestStatusDot,
  openEscalations,
}: {
  latestStatusDot: "amber" | "green" | "red" | null;
  openEscalations: number;
}): EmployeePriority {
  if (openEscalations > 0 || latestStatusDot === "red") return "High";
  if (latestStatusDot === "amber") return "Follow-up";
  if (latestStatusDot === "green") return "Resolved";
  return "Normal";
}
