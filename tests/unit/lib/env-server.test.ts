import { afterEach, describe, expect, it, vi } from "vitest";

const VALID_ENV = {
  FIREBASE_PROJECT_ID: "demo-project",
  FIREBASE_CLIENT_EMAIL: "svc@demo-project.iam.gserviceaccount.com",
  FIREBASE_PRIVATE_KEY: "-----BEGIN KEY-----\\nabc\\n-----END KEY-----\\n",
};

function stubEnv(overrides: Record<string, string> = {}) {
  for (const [name, value] of Object.entries({ ...VALID_ENV, ...overrides })) {
    vi.stubEnv(name, value);
  }
}

async function loadGetServerEnv() {
  vi.resetModules();
  return (await import("@/lib/env/server")).getServerEnv;
}

describe("getServerEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("turns escaped newlines in the private key into real ones", async () => {
    stubEnv();
    const getServerEnv = await loadGetServerEnv();

    expect(getServerEnv().FIREBASE_PRIVATE_KEY).toBe(
      "-----BEGIN KEY-----\nabc\n-----END KEY-----\n",
    );
  });

  it("throws when a required variable is missing", async () => {
    stubEnv({ FIREBASE_CLIENT_EMAIL: "" });
    const getServerEnv = await loadGetServerEnv();

    expect(() => getServerEnv()).toThrow();
  });

  it("names every missing variable so the fix is obvious", async () => {
    stubEnv({ FIREBASE_PROJECT_ID: "", FIREBASE_CLIENT_EMAIL: "" });
    const getServerEnv = await loadGetServerEnv();

    expect(() => getServerEnv()).toThrow(
      "Missing or invalid environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL. See .env.example.",
    );
  });

  it("does not put secret values in the validation error", async () => {
    stubEnv({ FIREBASE_PROJECT_ID: "", FIREBASE_PRIVATE_KEY: "super-secret-key" });
    const getServerEnv = await loadGetServerEnv();

    expect(() => getServerEnv()).toThrow(/FIREBASE_PROJECT_ID|too small/i);
    expect(() => getServerEnv()).not.toThrow(/super-secret-key/);
  });

  it("uses safe defaults for AI limits and prompt caching", async () => {
    stubEnv();
    const getServerEnv = await loadGetServerEnv();

    expect(getServerEnv()).toMatchObject({
      AI_MAX_OUTPUT_TOKENS: 600,
      AI_RATE_LIMIT_MAX_REQUESTS: 20,
      AI_RATE_LIMIT_WINDOW_MS: 60_000,
      AI_RESPONSE_CACHE_TTL_MS: 300_000,
      ANTHROPIC_PROMPT_CACHE_TTL: "5m",
    });
  });

  it("parses configured AI limits", async () => {
    stubEnv({
      AI_MAX_OUTPUT_TOKENS: "800",
      AI_RATE_LIMIT_MAX_REQUESTS: "8",
      AI_RATE_LIMIT_WINDOW_MS: "30000",
      AI_RESPONSE_CACHE_TTL_MS: "120000",
      ANTHROPIC_PROMPT_CACHE_TTL: "1h",
    });
    const getServerEnv = await loadGetServerEnv();

    expect(getServerEnv()).toMatchObject({
      AI_MAX_OUTPUT_TOKENS: 800,
      AI_RATE_LIMIT_MAX_REQUESTS: 8,
      AI_RATE_LIMIT_WINDOW_MS: 30_000,
      AI_RESPONSE_CACHE_TTL_MS: 120_000,
      ANTHROPIC_PROMPT_CACHE_TTL: "1h",
    });
  });

  it("parses signup allowed domains from a comma-separated list", async () => {
    stubEnv({ SIGNUP_ALLOWED_DOMAINS: " artilence.com, Example.COM ,, " });
    const getServerEnv = await loadGetServerEnv();

    expect(getServerEnv().SIGNUP_ALLOWED_DOMAINS).toEqual(["artilence.com", "example.com"]);
  });

  it("keeps Stripe settings optional for local builds", async () => {
    stubEnv({
      STRIPE_SECRET_KEY: "",
      STRIPE_WEBHOOK_SECRET: "",
      STRIPE_PRICE_ID: "",
      RESEND_API_KEY: "",
      SKYLAR_TEAM_EMAIL: "",
      RESEND_FROM_EMAIL: "",
    });
    const getServerEnv = await loadGetServerEnv();

    expect(getServerEnv()).toMatchObject({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      STRIPE_SECRET_KEY: undefined,
      STRIPE_WEBHOOK_SECRET: undefined,
      STRIPE_PRICE_ID: undefined,
      RESEND_API_KEY: undefined,
      SKYLAR_TEAM_EMAIL: undefined,
      RESEND_FROM_EMAIL: undefined,
    });
  });
});
