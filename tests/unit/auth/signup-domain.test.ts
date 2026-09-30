import { describe, expect, it } from "vitest";
import { AuthorizationError } from "@/lib/errors";
import type { ServerEnv } from "@/lib/env/server";
import {
  assertSignupDomainAllowed,
  isSignupDomainAllowed,
} from "@/server/auth/signup-domain";

const env = (domains: string[]): ServerEnv =>
  ({
    FIREBASE_PROJECT_ID: "demo",
    FIREBASE_CLIENT_EMAIL: "svc@example.com",
    FIREBASE_PRIVATE_KEY: "key",
    ANTHROPIC_MODEL: "claude-haiku-4-5-20251001",
    ANTHROPIC_PROMPT_CACHE_TTL: "5m",
    AI_MAX_OUTPUT_TOKENS: 600,
    AI_RATE_LIMIT_MAX_REQUESTS: 20,
    AI_RATE_LIMIT_WINDOW_MS: 60_000,
    AI_RESPONSE_CACHE_TTL_MS: 300_000,
    SIGNUP_ALLOWED_DOMAINS: domains,
  }) as ServerEnv;

describe("signup domain allowlist", () => {
  it("rejects every domain when the env allowlist is empty", () => {
    expect(isSignupDomainAllowed("user@example.com", env([]))).toBe(false);
  });

  it("allows configured domains case-insensitively", () => {
    expect(isSignupDomainAllowed("User@Example.COM", env(["example.com"]))).toBe(true);
  });

  it("rejects domains outside the configured allowlist", () => {
    expect(() => assertSignupDomainAllowed("user@blocked.com", env(["example.com"]))).toThrow(
      AuthorizationError,
    );
  });
});
