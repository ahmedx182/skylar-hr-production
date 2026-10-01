import { describe, expect, it } from "vitest";
import { buildDailyBriefingDeck } from "@/features/briefing/daily-deck";
import type { EmployeeRecord, LedgerRecord } from "@/server/repositories/briefing-read.repository";
import type { AuthSession } from "@/types/auth";

const session: AuthSession = {
  uid: "user-1",
  email: "admin@example.com",
  companyId: "company-1",
  role: "admin",
};

function ledger(overrides: Partial<LedgerRecord>): LedgerRecord {
  return {
    id: "ledger-1",
    employeeId: "employee-1",
    employeeName: "Maya Chen",
    type: "note",
    description: "Follow up on the agreed schedule change.",
    statusDot: "amber",
    dateMs: Date.UTC(2026, 8, 22),
    ...overrides,
  };
}

function employee(overrides: Partial<EmployeeRecord>): EmployeeRecord {
  return {
    id: "employee-1",
    employeeCode: "EMP-001",
    name: "Maya Chen",
    email: "maya@example.com",
    jobTitle: "Designer",
    location: "Remote",
    summary: "Recently added employee file.",
    updatedAtMs: Date.UTC(2026, 8, 21),
    ...overrides,
  };
}

describe("buildDailyBriefingDeck", () => {
  it("orders high-risk cards before ordinary follow-ups and appends the clear card", () => {
    const deck = buildDailyBriefingDeck(session, {
      employees: [employee({ id: "employee-1" }), employee({ id: "employee-2", name: "Noor Ali" })],
      ledger: [
        ledger({ id: "amber-note", employeeId: "employee-1", statusDot: "amber" }),
        ledger({ id: "risk-note", employeeId: "employee-2", employeeName: "Noor Ali", statusDot: "red" }),
      ],
    });

    expect(deck.map((card) => card.id)).toEqual([
      "ledger:risk-note",
      "ledger:amber-note",
      "system:clear",
    ]);
    expect(deck[0].actions.map((action) => action.kind)).toContain("escalate");
    expect(deck[1].actions.map((action) => action.kind)).not.toContain("escalate");
    expect(deck[1].actions.map((action) => action.kind)).toContain("open_file");
  });

  it("marks an already escalated record as escalated and stops offering to escalate it", () => {
    const deck = buildDailyBriefingDeck(session, {
      employees: [employee({ id: "employee-1" })],
      ledger: [ledger({ id: "risk-note", statusDot: "red", isEscalated: true })],
    });

    expect(deck[0].eyebrow).toBe("Escalated");
    expect(deck[0].actions.map((action) => action.kind)).not.toContain("escalate");
  });

  it("filters dismissed cards and keeps unrelated employee cards", () => {
    const deck = buildDailyBriefingDeck(
      session,
      {
        employees: [employee({ id: "employee-2", name: "Noor Ali" })],
        ledger: [ledger({ id: "amber-note", employeeId: "employee-1" })],
      },
      new Set(["ledger:amber-note"]),
    );

    expect(deck.map((card) => card.id)).toEqual(["employee:employee-2", "system:clear"]);
  });

  it("returns only the clear card when all work is hidden or absent", () => {
    const deck = buildDailyBriefingDeck(
      session,
      { employees: [], ledger: [ledger({ id: "amber-note" })] },
      new Set(["ledger:amber-note"]),
    );

    expect(deck).toHaveLength(1);
    expect(deck[0]).toMatchObject({ id: "system:clear" });
    expect(deck[0].actions.map((action) => action.kind)).toEqual(["add_note", "add_person"]);
  });

  it("summarizes conversation transcripts instead of using the full transcript as card copy", () => {
    const deck = buildDailyBriefingDeck(session, {
      employees: [],
      ledger: [
        ledger({
          id: "conversation-1",
          type: "conversation",
          description: "Conversation transcript - Review the latest note\n\nManager: Help me prepare.\n\nSkylar: **Start here** with a long plan.",
          statusDot: "green",
        }),
      ],
    });

    expect(deck[0]).toMatchObject({
      title: "Review the saved Skylar conversation for Maya Chen.",
      body: "A Skylar conversation transcript was saved for Maya Chen. Open the record when you need the full context, then decide whether anything needs follow-up.",
    });
    expect(deck[0].actions).toContainEqual({ label: "Open transcript", kind: "open_file" });
    expect(deck[0].body).not.toContain("**Start here**");
  });
});
