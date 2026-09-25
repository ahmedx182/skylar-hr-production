import type { z } from "zod";
import { ValidationError } from "@/lib/errors";

/** Parses and validates a JSON body at the trust boundary. Details of what failed are not echoed back. */
export async function parseJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  const raw: unknown = await request.json().catch(() => undefined);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new ValidationError();
  return parsed.data;
}
