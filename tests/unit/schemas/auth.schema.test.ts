import { describe, expect, it } from "vitest";
import {
  appUserSchema,
  loginSchema,
  sessionRequestSchema,
} from "@/schemas/auth.schema";

describe("sessionRequestSchema", () => {
  it("accepts an ID token", () => {
    expect(sessionRequestSchema.safeParse({ idToken: "abc" }).success).toBe(true);
  });

  it.each([
    { input: {}, why: "missing" },
    { input: { idToken: "" }, why: "empty" },
    { input: { idToken: 123 }, why: "not a string" },
    { input: { idToken: "x".repeat(4097) }, why: "oversized" },
  ])("rejects an ID token that is $why", ({ input }) => {
    expect(sessionRequestSchema.safeParse(input).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("trims and lowercases the email", () => {
    expect(loginSchema.parse({ email: "  Manager@Acme.COM " })).toEqual({
      email: "manager@acme.com",
    });
  });

  it("rejects a malformed email", () => {
    expect(loginSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
});

describe("appUserSchema", () => {
  const valid = {
    companyId: "company-a",
    email: "m@acme.com",
    role: "manager",
    status: "active",
  };

  it("accepts a valid user record", () => {
    expect(appUserSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    { patch: { role: "owner" }, why: "unknown role" },
    { patch: { status: "pending" }, why: "unknown status" },
    { patch: { companyId: "" }, why: "empty companyId" },
  ])("rejects a record with $why", ({ patch }) => {
    expect(appUserSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});
