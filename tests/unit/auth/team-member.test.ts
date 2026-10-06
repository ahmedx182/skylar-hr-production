import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { toTeamMember } from "@/features/auth/team-member";

describe("team member client props", () => {
  it("excludes Firestore timestamps and server-only account fields", () => {
    const member = toTeamMember({
      id: "owner-1", email: "owner@acme.com", displayName: "Owner",
      role: "admin", status: "active", companyId: "tenant-a",
      createdAt: Timestamp.fromMillis(1_700_000_000_000),
    });
    expect(member).toEqual({ id: "owner-1", email: "owner@acme.com", displayName: "Owner", role: "admin" });
    expect(Object.getPrototypeOf(member)).toBe(Object.prototype);
    expect(Object.values(member).every(value => typeof value === "string")).toBe(true);
  });

  it("supports older accounts without a display name or timestamp", () => {
    expect(toTeamMember({ id: "u1", email: "person@acme.com", companyId: "tenant-a", role: "employee", status: "active" })).toEqual({
      id: "u1", email: "person@acme.com", displayName: undefined, role: "employee",
    });
  });
});
