import "server-only";
import { z } from "zod";
import { parseEnv } from "./parse-env";

const optionalPositiveInt = (fallback: number) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().positive().default(fallback),
  );

const optionalPromptCacheTtl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.enum(["5m", "1h"]).default("5m"),
);

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const optionalDomainList = z.preprocess(
  (value) =>
    typeof value === "string"
      ? value
          .split(",")
          .map((domain) => domain.trim().toLowerCase())
          .filter(Boolean)
      : [],
  z.array(z.string()).default([]),
);

const optionalBoolean = z.preprocess(
  (value) => value === "true" || value === true,
  z.boolean().default(false),
);

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().min(1),
  // Env files store the PEM with literal "\n" escapes.
  FIREBASE_PRIVATE_KEY: z
    .string()
    .min(1)
    .transform((key) => key.replace(/\\n/g, "\n")),
  ANTHROPIC_API_KEY: optionalNonEmptyString,
  ANTHROPIC_MODEL: z.string().min(1).default("claude-haiku-4-5-20251001"),
  ANTHROPIC_PROMPT_CACHE_TTL: optionalPromptCacheTtl,
  AI_MAX_OUTPUT_TOKENS: optionalPositiveInt(600),
  AI_RATE_LIMIT_MAX_REQUESTS: optionalPositiveInt(20),
  AI_RATE_LIMIT_WINDOW_MS: optionalPositiveInt(60_000),
  AI_RESPONSE_CACHE_TTL_MS: optionalPositiveInt(300_000),
  SIGNUP_ALLOWED_DOMAINS: optionalDomainList,
  DEMO_DISABLE_PAYMENT_GATE: optionalBoolean,
  STRIPE_SECRET_KEY: optionalNonEmptyString,
  STRIPE_WEBHOOK_SECRET: optionalNonEmptyString,
  STRIPE_PRICE_ID: optionalNonEmptyString,
  RESEND_API_KEY: optionalNonEmptyString,
  SKYLAR_TEAM_EMAIL: optionalNonEmptyString,
  RESEND_FROM_EMAIL: optionalNonEmptyString,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/** Validated lazily, at first use, so builds and tooling don't need runtime secrets. */
export function getServerEnv(): ServerEnv {
  cached ??= parseEnv(serverEnvSchema, process.env);
  return cached;
}
