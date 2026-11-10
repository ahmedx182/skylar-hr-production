import { describe, expect, it } from "vitest";
import {
  escalationAllowanceFor,
  escalationPeriodKey,
  escalationUsageFrom,
  PAID_ESCALATIONS_PER_MONTH,
  TRIAL_ESCALATION_LIMIT,
} from "@/features/billing/escalation-allowance";

const JAN = Date.UTC(2026, 0, 15);
const FEB = Date.UTC(2026, 1, 2);

describe("escalation allowance", () => {
  it("gives a trial workspace one escalation for its whole life", () => {
    expect(escalationAllowanceFor("free", escalationUsageFrom({}), JAN)).toMatchObject({ limit: TRIAL_ESCALATION_LIMIT, remaining: 1, counter: "lifetime" });
    expect(escalationAllowanceFor("free", escalationUsageFrom({ escalationsUsed: 1 }), FEB).remaining).toBe(0);
  });

  it("gives a paid workspace three a month and starts again each month", () => {
    const usage = escalationUsageFrom({ escalationPeriodKey: escalationPeriodKey(JAN), escalationsUsedThisMonth: 3 });
    expect(escalationAllowanceFor("paid", usage, JAN)).toMatchObject({ limit: PAID_ESCALATIONS_PER_MONTH, remaining: 0, counter: "monthly" });
    expect(escalationAllowanceFor("paid", usage, FEB)).toMatchObject({ used: 0, remaining: 3 });
  });

  it("ignores the trial count once the workspace pays", () => {
    expect(escalationAllowanceFor("paid", escalationUsageFrom({ escalationsUsed: 1 }), JAN).remaining).toBe(3);
  });

  it("treats damaged stored values as unused", () => {
    expect(escalationUsageFrom({ escalationsUsed: "x", escalationsUsedThisMonth: -4, escalationPeriodKey: 7 })).toEqual({ used: 0, periodKey: null, usedThisMonth: 0 });
  });
});
