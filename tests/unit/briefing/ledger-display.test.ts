import { describe, expect, it } from "vitest";
import { cleanLedgerMarkdown, conversationLedgerSummary } from "@/features/briefing/ledger-display";

describe("cleanLedgerMarkdown", () => {
  it("removes common assistant markdown markers", () => {
    expect(cleanLedgerMarkdown("## **After the conversation:**")).toBe("After the conversation:");
    expect(cleanLedgerMarkdown("- **Make a note** of what happened")).toBe("Make a note of what happened");
    expect(cleanLedgerMarkdown("If the pattern continues, *then* document it")).toBe("If the pattern continues, then document it");
  });
});

describe("conversationLedgerSummary", () => {
  it("extracts title, manager prompt, and next steps from a saved transcript", () => {
    expect(
      conversationLedgerSummary(
        [
          "Conversation transcript - Review the latest note for Ahmed Test.",
          "",
          "Manager: Help me prepare this conversation.",
          "",
          "Skylar: ## Conversation Prep",
          "",
          "## After the conversation:",
          "- Make a brief note of what was discussed",
          "- If the pattern continues, move to a documented conversation",
        ].join("\n"),
      ),
    ).toEqual({
      title: "Review the latest note for Ahmed Test.",
      asked: "Help me prepare this conversation.",
      goal: null,
      prepItems: [],
      outlineItems: [],
      nextSteps: [
        "Make a brief note of what was discussed",
        "If the pattern continues, move to a documented conversation",
      ],
    });
  });
});
