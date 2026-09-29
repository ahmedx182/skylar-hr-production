import { afterEach, describe, expect, it, vi } from "vitest";
import { RateLimitError } from "@/lib/errors";
import { assertWithinRateLimit, clearAiRateLimitBucketsForTests } from "@/server/ai/rate-limit";

describe("assertWithinRateLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
    clearAiRateLimitBucketsForTests();
  });

  it("allows requests inside the configured window", () => {
    expect(() =>
      assertWithinRateLimit({
        key: "company:user",
        maxRequests: 2,
        windowMs: 60_000,
      }),
    ).not.toThrow();

    expect(() =>
      assertWithinRateLimit({
        key: "company:user",
        maxRequests: 2,
        windowMs: 60_000,
      }),
    ).not.toThrow();
  });

  it("rejects requests after the configured limit", () => {
    assertWithinRateLimit({ key: "company:user", maxRequests: 1, windowMs: 60_000 });

    expect(() =>
      assertWithinRateLimit({
        key: "company:user",
        maxRequests: 1,
        windowMs: 60_000,
      }),
    ).toThrow(RateLimitError);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    assertWithinRateLimit({ key: "company:user", maxRequests: 1, windowMs: 60_000 });
    vi.advanceTimersByTime(60_001);

    expect(() =>
      assertWithinRateLimit({
        key: "company:user",
        maxRequests: 1,
        windowMs: 60_000,
      }),
    ).not.toThrow();
  });
});
