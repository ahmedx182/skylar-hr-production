import { AuthorizationError } from "@/lib/errors";

/**
 * CSRF defence for cookie-authenticated mutations. Browsers send Origin on
 * cross-site POSTs and page scripts cannot forge it, so a missing or foreign
 * Origin fails closed.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin || originHost(origin) !== requestHost(request)) {
    throw new AuthorizationError("Cross-origin request rejected.");
  }
}

function originHost(origin: string): string | null {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}

function requestHost(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("host") || new URL(request.url).host;
}
