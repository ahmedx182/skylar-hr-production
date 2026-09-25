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
});
