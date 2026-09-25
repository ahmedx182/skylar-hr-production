import { describe, expect, it } from "vitest";
import { AuthorizationError } from "@/lib/errors";
import { requireRole } from "@/server/auth/require-role";
import type { AuthSession, Role } from "@/types/auth";

const sessionWith = (role: Role): AuthSession => ({
  uid: "u1",
  email: null,
  companyId: "company-a",
  role,
});

describe("requireRole", () => {
  it("allows a listed role", () => {
    expect(() => requireRole(sessionWith("employee"), ["employee", "admin"])).not.toThrow();
  });

  it("denies an unlisted role", () => {
    expect(() => requireRole(sessionWith("employee"), ["admin"])).toThrow(AuthorizationError);
  });

  it("does not treat an employee as an admin", () => {
    expect(() => requireRole(sessionWith("employee"), ["admin"])).toThrow(AuthorizationError);
  });
});
