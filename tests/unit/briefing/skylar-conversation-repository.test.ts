import { describe, expect, it } from "vitest";
import {
  buildSkylarConversationTranscript,
  skylarConversationThreadKey,
  type SkylarConversationMessage,
} from "@/features/briefing/skylar-conversation-transcript";

describe("skylarConversationThreadKey", () => {
  it("uses employee id when present", () => {
    expect(
      skylarConversationThreadKey({
        employeeId: "employee-1",
        employeeName: "Priya Shah",
      }),
    ).toBe("employee:employee-1");
  });

  it("falls back to normalized employee name, then workspace general", () => {
    expect(skylarConversationThreadKey({ employeeName: "Priya Shah" })).toBe("employee-name:priya shah");
    expect(skylarConversationThreadKey({})).toBe("workspace:general");
  });
});

describe("buildSkylarConversationTranscript", () => {
  it("formats manager and Skylar turns into a readable transcript", () => {
    const messages: SkylarConversationMessage[] = [
      { role: "user", text: "How should I open?", createdAtMs: 1 },
      { role: "assistant", text: "Start with what changed.", createdAtMs: 2 },
    ];

    expect(buildSkylarConversationTranscript(messages)).toBe(
      "Manager: How should I open?\n\nSkylar: Start with what changed.",
    );
  });

  it("skips empty message text", () => {
    const messages: SkylarConversationMessage[] = [
      { role: "user", text: "   ", createdAtMs: 1 },
      { role: "assistant", text: "Keep it specific.", createdAtMs: 2 },
    ];

    expect(buildSkylarConversationTranscript(messages)).toBe("Skylar: Keep it specific.");
  });
});
