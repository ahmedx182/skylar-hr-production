import { describe, expect, it } from "vitest";
import { AuthorizationError } from "@/lib/errors";
import { assertSameOrigin } from "@/server/guards/same-origin";

const post = (headers: Record<string, string>, url = "https://app.skylar.test/api/auth/session") =>
  new Request(url, { method: "POST", headers });

describe("assertSameOrigin", () => {
  it("accepts an Origin that matches the request host", () => {
    expect(() =>
      assertSameOrigin(post({ origin: "https://app.skylar.test" })),
    ).not.toThrow();
  });

  it("rejects a missing Origin", () => {
    expect(() => assertSameOrigin(post({}))).toThrow(AuthorizationError);
  });

  it("rejects a different Origin", () => {
    expect(() => assertSameOrigin(post({ origin: "https://evil.test" }))).toThrow(
      AuthorizationError,
    );
  });

  it("rejects a lookalike host", () => {
    expect(() =>
      assertSameOrigin(post({ origin: "https://app.skylar.test.evil.test" })),
    ).toThrow(AuthorizationError);
  });

  it("rejects an unparseable Origin such as the sandboxed 'null'", () => {
    expect(() => assertSameOrigin(post({ origin: "null" }))).toThrow(AuthorizationError);
  });

  it("compares against X-Forwarded-Host behind a proxy", () => {
    const request = post(
      { origin: "https://app.skylar.test", "x-forwarded-host": "app.skylar.test" },
      "http://internal:3000/api/auth/session",
    );

    expect(() => assertSameOrigin(request)).not.toThrow();
  });
});
