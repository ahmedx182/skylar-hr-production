import { describe, expect, it } from "vitest";
import { buildEmployeeMemorySummary } from "@/features/briefing/employee-memory-summary";

describe("buildEmployeeMemorySummary", () => {
  it("builds a compact summary from the latest note and history", () => {
    expect(
      buildEmployeeMemorySummary([
        {
          type: "note",
          description:
            "Situation: Ahmed has been late repeatedly. Recommended next step: Address it directly this week.",
          statusDot: "amber",
          dateMs: 20,
        },
        {
          type: "note",
          description: "Older context.",
          statusDot: "red",
          dateMs: 10,
        },
      ]),
    ).toBe(
      "Current: Situation: Ahmed has been late repeatedly. State: needs follow-up. Next: Address it directly this week. History: 2 entries, 1 high attention.",
    );
  });

  it("uses saved conversation next steps when the latest entry is a transcript", () => {
    expect(
      buildEmployeeMemorySummary([
        {
          type: "conversation",
          description: [
            "Conversation transcript - Review the latest note for Ahmed Test.",
            "",
            "Manager: Help me prepare.",
            "",
            "Skylar: ## After the conversation:",
            "- Save what was agreed",
          ].join("\n"),
          statusDot: "green",
          dateMs: 30,
        },
      ]),
    ).toBe(
      "Current: Conversation transcript - Review the latest note for Ahmed Test. State: resolved. Next: Save what was agreed. History: 1 entry.",
    );
  });

  it("returns null when there is no saved context", () => {
    expect(buildEmployeeMemorySummary([])).toBeNull();
  });
});
