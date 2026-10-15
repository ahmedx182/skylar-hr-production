import { describe, expect, it } from "vitest";
import {
  AccountBlockedClientError,
  accountBlockPath,
  accountBlockStateFromCode,
  accountBlockStateOf,
} from "@/features/auth/account-block";
import { AccountBlockedError, toErrorResponse } from "@/lib/errors";

describe("accountBlockStateOf", () => {
  it("lets an active account sign in", () => {
    expect(accountBlockStateOf({ status: "active" })).toBeNull();
  });

  it("calls a disabled account suspended, and a deleted one deleted", () => {
    expect(accountBlockStateOf({ status: "disabled" })).toBe("suspended");
    expect(accountBlockStateOf({ status: "disabled", deletedAt: {} })).toBe("deleted");
  });

  it("never lets a record marked deleted sign in, whatever its status says", () => {
    expect(accountBlockStateOf({ status: "active", deletedAt: {} })).toBe("deleted");
  });
});

describe("account block errors", () => {
  it("returns a 403 whose code names the state, without exposing internals", () => {
    expect(toErrorResponse(new AccountBlockedError("suspended"))).toEqual({
      status: 403,
      body: { error: { code: "account_suspended", message: "This account has been suspended." } },
    });
    expect(toErrorResponse(new AccountBlockedError("deleted")).body.error.code).toBe("account_deleted");
  });

  it("maps server codes back to a state, and ignores everything else", () => {
    expect(accountBlockStateFromCode("account_suspended")).toBe("suspended");
    expect(accountBlockStateFromCode("account_deleted")).toBe("deleted");
    expect(accountBlockStateFromCode("unauthenticated")).toBeNull();
    expect(accountBlockStateFromCode(undefined)).toBeNull();
  });

  it("sends the browser to the matching page", () => {
    expect(accountBlockPath("suspended")).toBe("/account-suspended");
    expect(accountBlockPath("deleted")).toBe("/account-deleted");
    expect(new AccountBlockedClientError("deleted").path).toBe("/account-deleted");
    expect(new AccountBlockedClientError("suspended").path).toBe("/account-suspended");
  });
});
