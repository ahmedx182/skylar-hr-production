/**
 * Normalises a configured app URL. Hosting dashboards often hold a bare host
 * ("askskylarhr.com"), stray quotes or a trailing slash, so those are repaired
 * here instead of failing every request. Returns undefined when nothing usable is set.
 */
export function normalizeAppUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replace(/^["']|["']$/g, "").trim();
  if (!trimmed) return undefined;

  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}
