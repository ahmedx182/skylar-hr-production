import { describe, expect, it } from "vitest";
import {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  ExternalServiceError,
  NotFoundError,
  ValidationError,
  toErrorResponse,
} from "@/lib/errors";

describe("toErrorResponse", () => {
  it.each([
    { error: new AuthenticationError(), status: 401, code: "unauthenticated" },
    { error: new AuthorizationError(), status: 403, code: "forbidden" },
    { error: new ValidationError(), status: 400, code: "invalid_request" },
    { error: new NotFoundError(), status: 404, code: "not_found" },
    { error: new ConflictError(), status: 409, code: "conflict" },
    { error: new ExternalServiceError(), status: 502, code: "upstream_failure" },
  ])("maps $code to HTTP $status", ({ error, status, code }) => {
    expect(toErrorResponse(error)).toEqual({
      status,
      body: { error: { code, message: error.message } },
    });
  });

  it("hides the details of unexpected errors", () => {
    const { status, body } = toErrorResponse(new Error("key=secret-value"));

    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("secret-value");
  });

  it("never exposes the cause of an application error", () => {
    const error = new AuthenticationError("Invalid sign-in.", {
      cause: new Error("token=abc123"),
    });

    expect(JSON.stringify(toErrorResponse(error).body)).not.toContain("abc123");
  });
});
