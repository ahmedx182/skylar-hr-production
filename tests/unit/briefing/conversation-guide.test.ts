import { describe, expect, it } from "vitest";
import { employeeFileGuide, ledgerGuide } from "@/features/briefing/conversation-guide";

const bodies = (steps: { body: string }[]) => steps.map((step) => step.body).join(" ");

describe("ledgerGuide", () => {
  it("always returns Open, Listen and Close steps", () => {
    const steps = ledgerGuide({ tone: "attention", type: "note", employeeName: "Maya" });

    expect(steps.map((step) => step.label)).toEqual(["Open", "Listen", "Close"]);
  });

  it("uses the employee name in the steps", () => {
    const steps = ledgerGuide({ tone: "risk", type: "note", employeeName: "Maya" });

    expect(bodies(steps)).toContain("Maya");
  });

  it("falls back to neutral wording when the employee is unknown", () => {
    const steps = ledgerGuide({ tone: "attention", type: "note", employeeName: null });

    expect(bodies(steps)).not.toContain("null");
    expect(bodies(steps)).toContain("the employee");
  });

  it("gives each kind of brief different guidance", () => {
    const kinds = [
      ledgerGuide({ tone: "risk", type: "note", employeeName: "Maya" }),
      ledgerGuide({ tone: "success", type: "note", employeeName: "Maya" }),
      ledgerGuide({ tone: "attention", type: "note", employeeName: "Maya" }),
      ledgerGuide({ tone: "attention", type: "conversation", employeeName: "Maya" }),
    ].map(bodies);

    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it("treats a risky conversation as high attention", () => {
    const risky = ledgerGuide({ tone: "risk", type: "conversation", employeeName: "Maya" });

    expect(bodies(risky)).toBe(bodies(ledgerGuide({ tone: "risk", type: "note", employeeName: "Maya" })));
  });
});

describe("employeeFileGuide", () => {
  it("is different from a note follow-up and names the employee", () => {
    const file = employeeFileGuide("Maya");

    expect(bodies(file)).toContain("Maya");
    expect(bodies(file)).not.toBe(bodies(ledgerGuide({ tone: "attention", type: "note", employeeName: "Maya" })));
  });
});
