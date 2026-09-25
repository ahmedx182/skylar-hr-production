import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";

/** Safe JSON error for route handlers. Unexpected (5xx) failures are logged server-side only. */
export function errorResponse(error: unknown, route: string): NextResponse {
  const { status, body } = toErrorResponse(error);

  if (status >= 500) {
    // ponytail: stdout JSON line. Swap for Sentry + a structured logger (§57, §71) once added.
    console.error(
      JSON.stringify({
        level: "error",
        event: "route_failed",
        route,
        error: error instanceof Error ? `${error.name}: ${error.message}` : "unknown",
      }),
    );
  }

  return NextResponse.json(body, { status });
}
