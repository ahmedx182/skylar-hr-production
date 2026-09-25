import type { z } from "zod";

/** Parses env with a schema. On failure it names the variables, never their values. */
export function parseEnv<S extends z.ZodType>(
  schema: S,
  source: Record<string, unknown>,
): z.infer<S> {
  const result = schema.safeParse(source);
  if (result.success) return result.data;

  const names = new Set(result.error.issues.map((issue) => String(issue.path[0])));
  throw new Error(
    `Missing or invalid environment variables: ${Array.from(names).join(", ")}. See .env.example.`,
  );
}
